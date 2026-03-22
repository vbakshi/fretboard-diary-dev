# Fretboard Diary

## Environment variables

Put API keys in **`.env.local`** (gitignored). Copy from `.env.example` and fill in values.

- **Vite** (`npm run dev`) reads `.env.local` for `VITE_*` variables.
- **API routes** (`npm run dev:full` / `vercel dev`) load `.env` then **`.env.local`** via [`api/loadEnv.js`](api/loadEnv.js), so `YOUTUBE_API_KEY`, `ANTHROPIC_API_KEY`, etc. are available to `/api/*` without a `VITE_` prefix.

---

## React + Vite (template)

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.
