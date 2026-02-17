# Tutorial: Login com Discord + Supabase (WPlay)

Este guia configura o login obrigatorio no launcher usando Discord via Supabase.

## 1) Criar projeto no Supabase

1. Acesse `https://supabase.com/` e crie um projeto.
2. No projeto, abra:
   - `Project Settings > API`
3. Copie:
   - `Project URL` (ex: `https://abcxyz.supabase.co`)
   - `anon public key` (nao use `service_role`)

## 2) Criar app OAuth no Discord

1. Acesse `https://discord.com/developers/applications`
2. Crie uma Application.
3. Em `OAuth2 > General` copie:
   - `Client ID`
   - `Client Secret`
4. Em `Redirects`, adicione:
   - `https://SEU_PROJECT_REF.supabase.co/auth/v1/callback`

Importante: esse redirect e do Supabase, nao do launcher.

## 3) Conectar Discord no Supabase

1. No Supabase, abra `Authentication > Providers > Discord`.
2. Habilite o provider.
3. Cole:
   - `Client ID` (Discord)
   - `Client Secret` (Discord)
4. Salve.

## 4) Liberar redirect do launcher

1. No Supabase, abra `Authentication > URL Configuration`.
2. Em `Additional Redirect URLs`, adicione:
   - `wplay://auth/callback`
3. Salve.

Importante:
- Em `Site URL`, evite `http://localhost:3000`.
- Se ficar localhost e ocorrer erro OAuth, o navegador pode cair nessa URL.
- Use uma URL valida qualquer (ex: `https://wplay.app`) para fallback de erro.

## 5) Configurar o projeto WPlay

1. Na raiz do projeto, copie:

```powershell
Copy-Item .\config\auth.example.json .\config\auth.json
```

2. Edite `config/auth.json`:

```json
{
  "supabaseUrl": "https://SEU-PROJETO.supabase.co",
  "supabaseAnonKey": "SUA_SUPABASE_ANON_KEY",
  "redirectUrl": "wplay://auth/callback"
}
```

3. Instale dependencias (se ainda nao instalou):

```powershell
npm.cmd install
```

4. Gere o frontend:

```powershell
npm.cmd run next:build
```

5. Rode o launcher:

```powershell
npm run dev
```

## 6) Testar login

1. Abra o launcher.
2. A tela de login deve aparecer.
3. Clique em `Continuar com Discord`.
4. Autorize no navegador.
5. O launcher volta autenticado e libera Store/Biblioteca.

Observacao sobre aba do navegador:
- O launcher volta automaticamente para frente quando o callback chega.
- Alguns navegadores mantem a aba aberta por politica de seguranca; nesse caso pode fechar manualmente.

## 7) Build com protocolo customizado

O `package.json` ja foi configurado com protocolo `wplay://` no `electron-builder`.
No build instalado, o Windows registra esse protocolo para callback OAuth.

Build:

```powershell
npm run build
```

Portable:

```powershell
npm run build:portable
```

## 8) Seguranca (obrigatorio)

1. Nunca use `service_role` no app cliente.
2. Trate `anon key` como publica (isso e esperado).
3. Proteja tabelas com RLS no Supabase.
4. Restrinja politicas por `auth.uid()` e roles.
5. `config/auth.json` esta no `.gitignore` para reduzir vazamento acidental.

Exemplo de RLS minima:

```sql
alter table public.profiles enable row level security;

create policy "user_can_read_own_profile"
on public.profiles
for select
using (id = auth.uid());
```

## 9) Erros comuns

### `[AUTH_NOT_CONFIGURED]`
- `config/auth.json` ausente ou incompleto.

### `[AUTH_PROTOCOL]`
- Protocolo `wplay://` nao foi registrado.
- Feche o launcher e abra novamente como administrador.
- No build instalado isso normalmente ja vem registrado.

### Login abre navegador e nao volta pro launcher
- Verifique se `wplay://auth/callback` esta em `Additional Redirect URLs` no Supabase.
- Verifique se o app instalado esta atualizado.
