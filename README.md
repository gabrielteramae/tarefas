# Tarefas — lista pessoal com conta

![React](https://img.shields.io/badge/React-19-61DAFB?style=flat&logo=react&logoColor=black)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=flat&logo=typescript&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-646CFF?style=flat&logo=vite&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4-38BDF8?style=flat&logo=tailwindcss&logoColor=white)

Lista do que fazer no dia: escrever, concluir, reordenar, apagar com desfazer e ver o mês. Cada conta enxerga só as próprias tarefas. O endereço público citado no repositório é [tarefas.grok.me](https://tarefas.grok.me).

| Escolha | Motivo |
| --- | --- |
| PGLite sem `DATABASE_URL` | O app sobe com Postgres em WASM. Com `DATABASE_URL`, o mesmo SQL vai para Postgres via `pg` |

## Stack

- React 19, TypeScript, Vite, TanStack Start, TanStack Router e Tailwind CSS 4
- Better Auth em `/api/auth/*`: e-mail e senha (`emailAndPasswordEnabled` em `src/lib/auth/email-password.ts`) e Google pelo broker em `src/lib/auth/providers.ts`
- MFA em `/api/mfa`
- Zod na entrada da tarefa. As consultas passam por `getSql()` em `src/lib/db.ts`
- PWA: `public/manifest.webmanifest` e `public/sw.js`
- Web Push (`web-push`) e a rota `src/routes/api/notifications.ts`

## Estrutura

```
package.json
vite.config.ts
migrations/
public/
scripts/
server/middleware/
src/routes/
src/components/
src/lib/tasks.ts
src/lib/db.ts
src/lib/auth/
```

## Como rodar

```bash
git clone https://github.com/gabrielteramae/tarefas.git
cd tarefas
npm install
npm run dev
```

Abra http://localhost:8080.

| Variável | Uso |
| --- | --- |
| `DATABASE_URL` | Vazia: PGLite. Preenchida: Postgres |
| `BETTER_AUTH_SECRET` | Segredo da sessão no deploy. Sem ela, o preview gera um segredo no processo |
| `BETTER_AUTH_URL` | Origem pública. Sem ela, o preview deriva o host do request |
| `VITE_AUTH_ENABLED` | `false` desliga o login. Outro valor deixa ligado |
| `GROK_AUTH_ISSUER`, `GROK_AUTH_CLIENT_ID`, `GROK_AUTH_CLIENT_SECRET` | Cliente do broker. Sem injeção, o código usa o cliente de preview |

`npm run build` gera o build e roda `npm run db:migrate`.

## Testes

```bash
npm test
```

O script `test` do `package.json` executa `scripts/**/*.test.mjs` e os `*.test.ts` de `src/lib` listados ali. `npm run typecheck` só checa tipos.

---

© 2026 Gabriel Teramae Chan
