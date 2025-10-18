## Ottrpad Frontend

Single-page web app for the Ottrpad collaborative code editor. Built with React, TypeScript, Vite, Tailwind, and Monaco Editor. Talks to the Ottrpad backend over HTTPS/WSS and uses Supabase for auth.

### Highlights

- React + TypeScript + Vite 7
- Monaco editor with diff view for version comparisons
- Versions & milestones timeline (create, view, restore)
- Rooms flow: join/create a room, then work in `/workspace/:roomId`
- SPA routing ready for Netlify (redirects configured)

---

## Prerequisites

- Node.js 18 or newer
- npm 10+ (this project uses npm scripts; a `package-lock.json` is present)
- Access to a running Ottrpad backend and Supabase project

## Quick start (local)

1. Install dependencies

```powershell
npm install
```

2. Configure environment (development)

Create or edit `.env.development` with values for your environment:

```env
# Supabase (Auth)
VITE_SUPABASE_URL=<your-supabase-url>
VITE_SUPABASE_ANON_KEY=<your-supabase-anon-key>

# Backend endpoints (local example)
VITE_API_URL=http://localhost:4000
VITE_SOCKET_URL=ws://localhost:5002

# Optional legacy var (read by src/lib/constants.ts)
VITE_BACKEND_URL=http://localhost:4000
```

Notes:

- In development, `http://` and `ws://` are fine.
- In production, use `https://` and `wss://` only to avoid mixed-content errors.

3. Run the dev server

```powershell
npm run dev
```

Then open http://localhost:3000 (the Vite dev server is configured to port 3000 in `vite.config.ts`).

## Build and preview

```powershell
npm run build
npm run preview
```

## Scripts

- `npm run dev` – start Vite dev server
- `npm run build` – typecheck then build for production
- `npm run preview` – preview the production build locally
- `npm run lint` – run ESLint

## Configuration & env behavior

- API/socket base URLs are resolved in `src/lib/constants.ts`:
  - In production, only `https://` (API) and `wss://`/`https://` (socket) values are honored; plain `http://`/`ws://` are ignored to prevent mixed-content.
  - If an env var is omitted in production, the app falls back to same-origin. We currently deploy with direct backend URLs (no Netlify API proxy), so set both vars explicitly in production.

## Deployment (Netlify)

1. Build settings

- Build command: `npm run build`
- Publish directory: `dist`

2. Environment variables (recommended)

```env
VITE_SUPABASE_URL=<your-supabase-url>
VITE_SUPABASE_ANON_KEY=<your-supabase-anon-key>
VITE_API_URL=https://api.ottrpad.dev
VITE_SOCKET_URL=wss://api.ottrpad.dev
```

3. SPA routing

- Already configured via `netlify.toml` and `public/_redirects` to serve `index.html` for all routes.

4. Redeploy tips

- If you change env variables, use “Clear cache and deploy site” to avoid stale builds.

## Troubleshooting

- “/join” or other deep links 404 on Netlify

  - Ensure SPA redirect is active (see `netlify.toml` or `public/_redirects`).

- SSL protocol errors when calling the API (e.g., `ERR_SSL_PROTOCOL_ERROR`)

  - Don’t append explicit ports to your public domain unless TLS is terminated there.
  - Prefer domain-only URLs with TLS: `https://api.ottrpad.dev` and `wss://api.ottrpad.dev`.

- 500 from `/api/*` routes

  - Backend likely missing required env (e.g., `SUPABASE_JWT_SECRET`) or failed auth middleware.
  - Check backend logs and confirm CORS `FRONTEND_URL` matches your deployed site.

- CORS errors
  - Confirm the backend allows your exact frontend origin (protocol + host).

## Project structure (high level)

```
Frontend/
├─ public/                 # Static assets (favicon, redirects)
├─ src/
│  ├─ components/
│  │  ├─ monaco/           # Monaco editor + diff components
│  │  └─ workspace/        # Topbar, panels, versions, modals, etc.
│  ├─ contexts/            # App-level contexts (user, monaco, collaboration)
│  ├─ hooks/               # Custom hooks (auth, autosave, collaboration)
│  ├─ lib/                 # Constants and utilities
│  ├─ pages/               # Route components
│  ├─ store/               # Zustand stores (workspace, timeline)
│  └─ styles/              # Global styles / Tailwind
├─ vite.config.ts          # Vite + Tailwind config
├─ netlify.toml            # SPA redirects + headers
└─ package.json            # Scripts and dependencies
```

## Contributing

Contributions are welcome. Please open an issue or PR with a clear description and screenshots when relevant.

---

Ottrpad – Collaborate. Create. Code.
