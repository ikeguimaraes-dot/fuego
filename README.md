# Fuego

Landing page institucional e votação de cardápios com Next.js, TypeScript e Supabase.

- Site: https://fuego-omega.vercel.app
- Painel: https://fuego-omega.vercel.app/admin
- Repositório: https://github.com/ikeguimaraes-dot/fuego

## Desenvolvimento

```sh
npm ci
cp .env.example .env.local
# Preencha as variáveis com as credenciais do projeto.
npm run dev
```

`NEXT_PUBLIC_SUPABASE_ANON_KEY` aceita a chave publishable do Supabase. `SUPABASE_SERVICE_ROLE_KEY` e `VOTE_HASH_SECRET` são exclusivos do servidor; nunca use prefixo `NEXT_PUBLIC_` nesses segredos. Mantenha `VOTE_HASH_SECRET` estável para preservar a identificação de votos duplicados.

## Administração

O painel usa e-mail e senha do Supabase Auth. Só contas presentes em `public.fuego_admins` podem gerenciar a Fuego; contas de outras aplicações neste mesmo projeto não recebem acesso automaticamente.

1. Crie a conta em Authentication → Users no Supabase, ou use uma conta existente.
2. Cadastre o UUID da conta em `fuego_admins` pelo SQL Editor:

```sql
insert into public.fuego_admins (user_id) values ('UUID_DA_CONTA');
```

3. Entre em `/admin`, crie uma votação, defina semana e encerramento (Brasília), e adicione de 2 a 6 opções.
4. Salve o rascunho, revise e abra a votação. Só uma enquete pode ficar aberta por vez.
5. Atualize os resultados no painel ou exporte CSV. Encerre a votação para liberar a próxima.

Cardápios publicados são imutáveis. Enquetes encerradas não podem ser reabertas. Rascunhos podem ser editados. O prazo bloqueia votos automaticamente, mas o administrador deve encerrar a enquete anterior antes de abrir outra.

Há uma primeira enquete em rascunho com três sugestões (Clássicos da casa, Leve & cheio de sabor e Da horta, com fuego). Revise as combinações e as datas antes de publicar. Nenhuma enquete de demonstração foi aberta ao público.

## Banco e segurança

A migração em `supabase/migrations/` cria somente objetos `fuego_*` e já foi aplicada ao projeto informado. Não execute um reset ou pull global neste projeto compartilhado. A cópia `supabase/schema.sql` é uma referência da mesma migração, não uma segunda etapa de instalação.

- RLS em todas as tabelas; autorização por associação explícita à equipe.
- Rascunhos e resultados privados. A API pública retorna apenas a enquete aberta dentro do prazo.
- Votos registrados por função de banco exclusiva do servidor, com validação atômica do prazo, da opção e de duplicidade.
- E-mail e IP são transformados com HMAC-SHA256 antes da persistência; não armazenamos seus valores em texto nos votos.
- Limite de 20 votos por identificador de IP em uma hora. O controle usa o cabeçalho confiável da Vercel em produção.
- Um voto por e-mail por enquete. A titularidade do e-mail não é verificada: a enquete é consultiva, e esse mecanismo não garante uma pessoa única. Para exigências mais fortes, adicione confirmação de e-mail e CAPTCHA.
- O site não implementa venda, cobrança ou envio de marketing.

## Validação

```sh
npm run typecheck
npm run build
npm test
```

`npm test` requer servidor local em `127.0.0.1:3000`, Chromium do Playwright e credenciais de teste em `.env.local`. Cria uma conta e uma enquete temporárias no Supabase, testa RLS, cadastro/edição, publicação, voto real, duplicidade, bloqueio após encerramento, exportação e layout móvel. Faz limpeza ao final. Execute sem outra enquete aberta, preferencialmente em projeto de teste. `TEST_BASE_URL` altera o servidor alvo.

## Publicação

O diretório está vinculado ao projeto Vercel `fuego`. Configure as quatro variáveis de `.env.example` nos ambientes Production e Preview e execute `vercel --prod`.

## Identidade visual

Identidade tipográfica provisória em creme, verde e vermelho. Os logos mencionados na solicitação não estavam disponíveis na conversa nem no diretório. Substitua o wordmark pelos arquivos oficiais quando forem fornecidos.

Fotos editoriais ilustrativas do Unsplash (não representam os produtos reais):

- https://images.unsplash.com/photo-1547592180-85f173990554
- https://images.unsplash.com/photo-1512621776951-a57141f2eefd
