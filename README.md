# 05-notehub

NoteHub is a notes app built with React, TypeScript, Vite, TanStack Query, Axios, Formik and Yup.

## Local setup

1. Install dependencies with `npm install`.
2. Copy `.env.example` to `.env` and set your personal `VITE_NOTEHUB_TOKEN`.
3. Start the app with `npm run dev`.

The token must not be committed. Vite exposes `VITE_` variables in the browser bundle, so use only the NoteHub homework token and do not reuse credentials for other services.

## Available commands

- `npm run dev` — start Vite.
- `npm run build` — typecheck and create a production build.
- `npm run lint` — run Oxlint.
- `npm test` — run the automated test suite.
- `npm run format:check` — check Prettier formatting.
