# CAP - Everyone's lying. Find the truth.

A real-time bluffing-trivia party game for 2-8 players. No accounts, no downloads, works across devices. One strange true fact with one missing detail: everyone writes a believable lie, then votes for the truth. Five rounds, about seven minutes.

Live design target: an "acid editorial" look — ink `#10100E`, paper `#F3EFE3`, acid `#D9FF43`, signal `#5B5BFF`, flare `#FF6B4A`; oversized type, 2px borders, hard shadows, grain, custom SVG avatars.

## The game

Each round:
1. A strange true fact is shown with one blank. Everyone writes a believable lie to fill it (1-60 chars).
2. The truth is mixed in with the lies. Everyone votes for the answer they believe is real.
3. The truth is revealed. Points: finding the truth = 1,000; each vote on your lie = 500; a "Perfect Cap" (nobody votes for your lie) = 1,000.

Five rounds with multipliers `[1, 1, 2, 2, 3]`; the final round is `x3`. Ties break by score, truth finds, votes fooled, then perfect caps (shared wins allowed).

## Project layout

```
cap/
├── PRD.md                 # product & rules spec
├── package.json           # scripts: dev, check, test, build, start, e2e, content:links
├── playwright.config.ts   # committed E2E (runs against `npm run dev`)
├── vite.config.mts        # client build + dev server (port 5173, proxies /api & /socket.io to 3000)
├── tsconfig.json          # client typecheck
├── tsconfig.server.json   # server typecheck
├── index.html
├── public/                # favicon.svg, manifest.webmanifest, og.svg
├── server/                # Express 5 + Socket.IO 4 HTTP/WS layer (port 3000)
│   ├── index.ts           # entry: dotenv, listen, graceful shutdown
│   ├── app.ts             # createCapServer(), Helmet CSP, Zod validation, rate limits, SPA fallback
│   └── game/              # content.ts (36 prompts), room.ts (engine), manager.ts (lifecycle)
├── shared/                # avatars.ts, types.ts (public state, privacy contract, Socket.IO events)
├── src/                   # React 19 client
│   ├── main.tsx, App.tsx
│   ├── lib/               # useCap (Socket.IO client), storage, sound, useTimer
│   ├── components/        # landing, setup, lobby, writing, voting, reveal, results, shell, ui, visual
│   └── styles.css + styles/*.css   # acid-editorial design system (responsive, reduced-motion)
├── tests/                 # room.test.ts (engine), client/integration.test.ts (Socket.IO)
├── tools/                 # cloudflared.exe (gitignored)
└── Dockerfile, render.yaml
```

## Scripts

| Script | Purpose |
|--------|---------|
| `npm run dev` | Start server (3000) + Vite client (5173) concurrently |
| `npm run check` | Typecheck client + server |
| `npm test` | Run Vitest suite (engine + Socket.IO integration) |
| `npm run build` | Build client (Vite) + server (tsc) into `dist/` |
| `npm start` | Run production server from `dist/server/index.js` |
| `npm run e2e` | Playwright happy-path test (needs a built/running server) |
| `npm run content:links` | Verify prompt source URLs (`scripts/check-links.mjs`) |

## Local development

```powershell
npm install
npm run dev
# client: http://localhost:5173  (proxies API/Socket.IO to http://localhost:3000)
```

Open two browsers/devices, create a room on one, join with the room code on the other, and play through a match.

## Production

```powershell
npm run build          # produces dist/client and dist/server
npm start             # serves on PORT (default 3000), client at dist/client
```

Production server entry: `dist/server/index.js`. Express serves the SPA from `dist/client` with a catch-all fallback (no `app.get("*")` per Express 5).

### Environment variables

| Variable | Default | Meaning |
|----------|---------|---------|
| `PORT` | `3000` | HTTP listen port |
| `HOST` | `0.0.0.0` | Bind host |
| `NODE_ENV` | `development` | `production` enables CSP `upgrade-insecure-requests` |
| `ROOM_TTL_MS` | `7200000` | Inactive room expiry (2 hours) |
| `MAX_ROOMS` | `500` | Concurrent room cap |
| `WRITING_MS` | `60000` | Writing phase length |
| `VOTING_MS` | `25000` | Voting phase length |
| `REVEAL_MS` | `14000` | Reveal phase length |

Copy `.env.example` to `.env` to override.

## Docker

```powershell
docker build -t cap .
docker run -p 3000:3000 -e NODE_ENV=production cap
```

## Render

See `render.yaml`. Deploys from this repo; `npm ci && npm run build` then `npm start`. Render's free tier supports WebSockets but sleeps after ~15 minutes of inactivity.

## Temporary public URL (Cloudflare Quick Tunnel)

```powershell
# download cloudflared.exe into tools/ (gitignored)
.\tools\cloudflared.exe tunnel --url http://localhost:3000
```

Then verify the landing page, `/api/health`, and WebSocket gameplay through the public URL.

## Testing

- `npm test` — Vitest: room engine (9) + Socket.IO end-to-end integration (2).
- `npm run e2e` — Playwright happy path across desktop + mobile viewports against the dev server.
- `npm run content:links` — HTTP check of all 36 prompt source URLs.

## Tech stack

React 19, Vite 8, Express 5, Socket.IO 4, Zod 4, Vitest 5, Playwright 1.64, canvas-confetti, Helmet, Compression, @fontsource (Bricolage Grotesque, Inter, DM Mono).
