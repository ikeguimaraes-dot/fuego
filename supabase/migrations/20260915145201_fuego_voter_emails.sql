alter table public.fuego_votes add column voter_email text
 check (voter_email is null or (length(voter_email) <= 254 and voter_email = lower(btrim(voter_email)) and voter_email ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'));
comment on column public.fuego_votes.voter_email is 'Email disclosed to Fuego administrators after the updated voting notice. NULL for legacy votes.';
create index fuego_votes_poll_created on public.fuego_votes(poll_id,created_at desc,id);

-- Preserve legacy clients: only the new notice-aware endpoint stores the email.
-- Invoker privileges and existing admin-only RLS remain unchanged.
create function public.fuego_cast_vote_with_email(p_poll uuid,p_option uuid,p_voter text,p_ip text,p_email text)
returns void language plpgsql security invoker set search_path='' as $$
begin
 if p_email is null or length(p_email)>254 or p_email<>lower(btrim(p_email)) or p_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then
  raise exception 'invalid_email';
 end if;
 perform public.fuego_cast_vote(p_poll,p_option,p_voter,p_ip);
 update public.fuego_votes set voter_email=p_email where poll_id=p_poll and voter_hash=p_voter;
end; $$;
revoke all on function public.fuego_cast_vote_with_email(uuid,uuid,text,text,text) from public,anon,authenticated;
grant execute on function public.fuego_cast_vote_with_email(uuid,uuid,text,text,text) to service_role;
