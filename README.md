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

Há uma primeira enquete em rascunho com três sugestões (Clássicos da casa, Favoritos da semana e Da horta, com fuego). Revise as combinações e as datas antes de publicar. Nenhuma enquete de demonstração foi aberta ao público.

## Banco e segurança

As migrações em `supabase/migrations/` alteram somente objetos `fuego_*` e já foram aplicadas ao projeto informado. Não execute um reset ou pull global neste projeto compartilhado. A cópia `supabase/schema.sql` é uma referência consolidada das migrações, não uma segunda etapa de instalação.

- RLS em todas as tabelas; autorização por associação explícita à equipe.
- Rascunhos e resultados privados. A API pública retorna apenas a enquete aberta dentro do prazo.
- Votos registrados por função de banco exclusiva do servidor, com validação atômica do prazo, da opção e de duplicidade.
- E-mail e IP geram identificadores HMAC-SHA256 para controlar duplicidade e abuso. Após o aviso atualizado, o e-mail normalizado também é armazenado em `voter_email`, com acesso apenas a administradores via RLS. O IP original não é armazenado.
- Em cada enquete, “Ver votantes e e-mails” mostra e-mail, cardápio escolhido e data, em páginas de 50 votos. Votos antigos continuam sem e-mail recuperável.
- O cliente envia `emailNoticeVersion: 1` após exibir o aviso de armazenamento. Páginas antigas sem esse marcador continuam registrando somente identificadores, respeitando o aviso anterior.
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

Identidade oficial extraída do PDF `Fuego-Branding-SET26.pdf`, fornecido pelo proprietário. Os SVGs em `public/brand/` preservam os contornos vetoriais do logo, da tagline “Templo do Sabor”, do selo e da chama. O favicon usa o símbolo oficial. Paleta digital amostrada da renderização do guia: vermelho `#EE252D`, vinho `#87181C`, preto `#111111`, branco `#FFFFFF` e laranja `#F14624`. Botões usam um vermelho mais escuro para legibilidade do texto branco.

Fotos das marmitas fornecidas pelo proprietário, preservadas em PNG com transparência:
- `public/images/marmita-carne.png`
- `public/images/marmita-empanado.png`

A comunicação apresenta comida saborosa e prática, sem posicionamento fit ou dietético.

Teste específico de e-mails (pode rodar com uma votação ativa, usa somente rascunhos temporários): `node --test tests/voter-emails.test.mjs`.
