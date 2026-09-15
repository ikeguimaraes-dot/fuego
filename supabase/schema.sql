-- Fuego: additive schema, isolated from other applications in this project.
create table public.fuego_admins (
 user_id uuid primary key references auth.users(id) on delete cascade,
 created_at timestamptz not null default now()
);
alter table public.fuego_admins enable row level security;
revoke all on public.fuego_admins from anon, authenticated;
grant select on public.fuego_admins to authenticated;
grant all on public.fuego_admins to service_role;
create policy admin_self on public.fuego_admins for select to authenticated using (user_id = (select auth.uid()));

create table public.fuego_polls (
 id uuid primary key default gen_random_uuid(),
 title text not null check (length(title) between 3 and 120),
 week_start date not null,
 closes_at timestamptz not null,
 status text not null default 'draft' check (status in ('draft','open','closed')),
 created_at timestamptz not null default now()
);
create unique index fuego_one_open_poll on public.fuego_polls(status) where status='open';
alter table public.fuego_polls enable row level security;
revoke all on public.fuego_polls from anon, authenticated;
grant select on public.fuego_polls to anon, authenticated;
grant insert, update, delete on public.fuego_polls to authenticated;
grant all on public.fuego_polls to service_role;
create policy public_open_poll on public.fuego_polls for select to anon, authenticated using (status='open' and closes_at>now());
create policy admin_polls on public.fuego_polls for all to authenticated using (exists(select 1 from public.fuego_admins where user_id=(select auth.uid()))) with check (exists(select 1 from public.fuego_admins where user_id=(select auth.uid())));

create table public.fuego_options (
 id uuid primary key default gen_random_uuid(),
 poll_id uuid not null references public.fuego_polls(id) on delete cascade,
 title text not null check(length(title) between 2 and 80),
 description text not null default '' check(length(description)<=400),
 dishes text[] not null check(cardinality(dishes) between 1 and 7),
 tag text not null default 'Cardápio da semana' check(length(tag)<=40),
 position integer not null default 0,
 unique(id,poll_id)
);
create index fuego_options_poll on public.fuego_options(poll_id);
alter table public.fuego_options enable row level security;
revoke all on public.fuego_options from anon, authenticated;
grant select on public.fuego_options to anon, authenticated;
grant insert,update,delete on public.fuego_options to authenticated;
grant all on public.fuego_options to service_role;
create policy public_options on public.fuego_options for select to anon, authenticated using (exists(select 1 from public.fuego_polls p where p.id=poll_id and p.status='open' and p.closes_at>now()));
create policy admin_options on public.fuego_options for all to authenticated using (exists(select 1 from public.fuego_admins where user_id=(select auth.uid()))) with check (exists(select 1 from public.fuego_admins where user_id=(select auth.uid())));

create table public.fuego_votes (
 id uuid primary key default gen_random_uuid(),
 poll_id uuid not null references public.fuego_polls(id) on delete cascade,
 option_id uuid not null,
 voter_hash text not null check(length(voter_hash)=64),
 ip_hash text not null check(length(ip_hash)=64),
 created_at timestamptz not null default now(),
 foreign key (option_id,poll_id) references public.fuego_options(id,poll_id),
 unique(poll_id,voter_hash)
);
create index fuego_votes_option on public.fuego_votes(option_id,poll_id);
create index fuego_votes_rate on public.fuego_votes(ip_hash,created_at);
alter table public.fuego_votes enable row level security;
revoke all on public.fuego_votes from anon,authenticated;
grant select on public.fuego_votes to authenticated;
grant all on public.fuego_votes to service_role;
create policy admin_results on public.fuego_votes for select to authenticated using (exists(select 1 from public.fuego_admins where user_id=(select auth.uid())));
create view public.fuego_results with(security_invoker=true) as
select o.poll_id, o.id as option_id, o.title, o.position, count(v.id)::integer as votes
from public.fuego_options o left join public.fuego_votes v on v.option_id=o.id group by o.id;
revoke all on public.fuego_results from anon,authenticated;
grant select on public.fuego_results to authenticated,service_role;

-- Invoker, service-role only: the web server hashes voter identifiers.
create function public.fuego_cast_vote(p_poll uuid,p_option uuid,p_voter text,p_ip text)
returns void language plpgsql security invoker set search_path='' as $$
begin
 perform pg_advisory_xact_lock(hashtextextended(p_ip,0));
 if (select count(*) from public.fuego_votes where ip_hash=p_ip and created_at>now()-interval '1 hour')>=20 then raise exception 'rate_limit'; end if;
 perform 1 from public.fuego_polls where id=p_poll and status='open' and closes_at>now() for share;
 if not found then raise exception 'poll_unavailable'; end if;
 if not exists(select 1 from public.fuego_options where id=p_option and poll_id=p_poll) then raise exception 'poll_unavailable'; end if;
 insert into public.fuego_votes(poll_id,option_id,voter_hash,ip_hash) values(p_poll,p_option,p_voter,p_ip);
end; $$;
revoke all on function public.fuego_cast_vote(uuid,uuid,text,text) from public,anon,authenticated;
grant execute on function public.fuego_cast_vote(uuid,uuid,text,text) to service_role;

-- Save the entire poll atomically. Published options become immutable.
create function public.fuego_save_poll(p_id uuid,p_title text,p_week date,p_closes timestamptz,p_options jsonb)
returns uuid language plpgsql security invoker set search_path='' as $$
declare result_id uuid; option jsonb; pos integer:=0;
begin
 if not exists(select 1 from public.fuego_admins where user_id=(select auth.uid())) then raise exception 'not_authorized'; end if;
 if jsonb_array_length(p_options) not between 2 and 6 then raise exception 'invalid_options'; end if;
 if p_closes<=now() then raise exception 'invalid_closing_date'; end if;
 if p_id is null then
  insert into public.fuego_polls(title,week_start,closes_at) values(p_title,p_week,p_closes) returning id into result_id;
 else
  select id into result_id from public.fuego_polls where id=p_id and status='draft' for update;
  if result_id is null then raise exception 'draft_required'; end if;
  update public.fuego_polls set title=p_title,week_start=p_week,closes_at=p_closes where id=result_id;
  delete from public.fuego_options where poll_id=result_id;
 end if;
 for option in select * from jsonb_array_elements(p_options) loop
  insert into public.fuego_options(poll_id,title,description,dishes,tag,position) values(result_id,option->>'title',option->>'description',array(select jsonb_array_elements_text(option->'dishes')),option->>'tag',pos);
  pos:=pos+1;
 end loop;
 return result_id;
end; $$;
revoke all on function public.fuego_save_poll(uuid,text,date,timestamptz,jsonb) from public,anon;
grant execute on function public.fuego_save_poll(uuid,text,date,timestamptz,jsonb) to authenticated;

create function public.fuego_guard_poll() returns trigger language plpgsql security invoker set search_path='' as $$
begin
 if old.status='closed' and new.status<>'closed' then raise exception 'closed_poll'; end if;
 if old.status='open' and (new.status not in ('open','closed') or new.title<>old.title or new.week_start<>old.week_start or new.closes_at<>old.closes_at) then raise exception 'published_poll'; end if;
 if new.status='open' and (new.closes_at<=now() or (select count(*) from public.fuego_options where poll_id=new.id)<2) then raise exception 'invalid_poll'; end if;
 return new;
end; $$;
create trigger fuego_poll_guard before update on public.fuego_polls for each row execute function public.fuego_guard_poll();
create function public.fuego_guard_option() returns trigger language plpgsql security invoker set search_path='' as $$
begin
 if exists(select 1 from public.fuego_polls where id=coalesce(old.poll_id,new.poll_id) and status<>'draft') then raise exception 'draft_required'; end if;
 if tg_op='DELETE' then return old; end if;
 if exists(select 1 from public.fuego_polls where id=new.poll_id and status<>'draft') then raise exception 'draft_required'; end if;
 return new;
end; $$;
create trigger fuego_option_guard before insert or update or delete on public.fuego_options for each row execute function public.fuego_guard_option();
