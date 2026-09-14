Before work: local [`project-map.md`](project-map.md) (key `happy-tourist-meta` → `..`), then [`happy-tourist-meta/docs/projects-map.md`](../happy-tourist-meta/docs/projects-map.md) (+ optional `projects-map.local.yaml` in meta). Canonical doc links — `happy-tourist-meta/docs/...`.

Skills and OpenSpec live in **happy-tourist-meta**. Before choosing a skill: [`happy-tourist-meta/.agents/skills/client/`](../happy-tourist-meta/.agents/skills/client/) (see [`happy-tourist-meta/.agents/AGENTS.md`](../happy-tourist-meta/.agents/AGENTS.md)).

## What This Application Is

`happy-tourist-client` (`happy-tourist-client-2` in `package.json`) is the browser SPA for online board game «Счастливый турист». Players authenticate, join a lobby, create or enter a Colyseus room, and play a realtime game against another player.

This repository (`happy-tourist.github.io`) is the client-only frontend. The sibling Colyseus server lives in [`../happy-tourist-server`](../happy-tourist-server) and is reached via WebSocket / HTTP URLs from env (`VITE_COLYSEUS_URL`, `VITE_API_URL`).

## What It Is Used For

Main scenarios:

- Register / sign in with email and password (Colyseus Auth).
- Sign in anonymously as a guest.
- Browse available tourist rooms in the lobby (live `LobbyRoom` subscribe; leave lobby before enter `tourist`).
- Create a game, join by room id, or `joinOrCreate`.
- Open Game and view the tourist board with synced seats (4 pieces per seated player) and strip×4 «Мой турист» if seated after joining a `tourist` room (move rules later).
- Leave the room and return to the lobby; sign out.

## Who The Users Are

Main users:

- Casual players who want a short online board game «Счастливый турист» match in the browser.
- Guests (anonymous Colyseus auth), registered users (email/password), and Google one-click (`loginWithGoogle` / `signInWithProvider('google')`).

There is no admin cabinet or content CMS in this app.

## Important

This is a realtime multiplayer client, not a static brochure site. Auth token is managed by `@colyseus/sdk` (`client.auth`, token key `colyseus-auth-token`). Protected routes wait for `auth.whenReady()` before deciding login vs lobby. Seating/move rules live on the server; Game mirrors synced seats onto a local tourist board with no move UX yet.

Deploy target: GitHub Pages (user/org site at domain root). Router mode is **hash** so deep links work without a history fallback (CI also copies `index.html` → `404.html`).

## Core Stack

- `vue` 3 - UI framework (Composition API / `<script setup>`).
- `vue-router` 5 - routing (hash mode).
- `pinia` 4 - application state.
- `quasar` 2 + `@quasar/app-vite` 3 - UI kit and Vite-based Quasar CLI.
- `vue-i18n` 11 - i18n (boot file; default locale `en-US`).
- `@colyseus/sdk` 0.18 - realtime client, auth, HTTP helper.
- `@colyseus/auth` - listed dependency; **server-side** package. Client auth goes through `client.auth` from the SDK.
- `typescript` - primary language (strict mode in Quasar build).

## UI And Components

- Quasar components (`q-page`, `q-card`, `q-btn`, `q-list`, …) with Material Icons + Roboto extras.
- Quasar `Dark` plugin for chrome light/dark; Sass variables in `src/css/quasar.variables.scss`; global styles in `src/css/app.scss` (includes `.text-muted` for dark-friendly secondary text).
- Shared `q-header` theme toggle in `App.vue` (all pages). Guest preference → `localStorage` (`ht-theme`); registered → `GET /api/theme` restore (not JWT-only) + `POST /api/theme` on toggle. Tourist board scoped CSS is independent of chrome Dark.
- Route pages under `src/pages/` (`LoginPage`, `LobbyPage`, `GamePage`).
- Scaffold leftovers may remain (`EssentialLink.vue`, `example-store.ts`, unused `pages/index*`) — prefer the login/lobby/game flow above.

## Data And Utilities

- Colyseus `Client` singleton from `src/boot/colyseus.ts` (`VITE_COLYSEUS_URL`).
- Env (Vite): `VITE_COLYSEUS_URL`, `VITE_API_URL` — typed in `env.d.ts`; local files `.env.development` / `.env.production`; CI injects GitHub Actions `vars`.
- Path alias `@/*` → `src/*` (Quasar / Vite).

## Specific Tasks

- Colyseus Auth — register, email/password login, anonymous login, Google one-click, logout via `stores/auth`.
- Tourist room name constant `TOURIST_ROOM = 'tourist'` in `stores/game`.
- Live lobby listing via `subscribeLobby` / `unsubscribeLobby` (`joinOrCreate('lobby', { filter: { name: 'tourist' } })`); HTTP `GET /rooms/tourist` remains unused fallback.
- Room lifecycle: `create` / `joinById` / `joinOrCreate`, `onStateChange`, `leave` (game messages when rules land).
- GitHub Pages deploy — `.github/workflows/deploy.yml` (`quasar build -m spa`).

## Development Tools

- `eslint` flat config (`eslint.config.js`) + `prettier` (`.prettierrc.json`).
- `vue-tsc` / `vite-plugin-checker` - typecheck during build/dev tooling.
- Scripts: `dev` (`quasar dev`), `build` (`quasar build`), `lint` / `lint:check`, `typecheck`.
- Package manager: npm lockfile is present (`package-lock.json`); README also mentions pnpm.

Application boot is Quasar CLI-driven (`quasar.config.ts` → boot files), not a hand-written `main.ts` entry for app plugins.

## How Boot / App Startup Is Organized

`quasar.config.ts` registers boot files: `theme`, `i18n`, `colyseus`, and `framework.plugins: ['Dark']`. Pinia is enabled via Quasar store entry `src/stores/index.ts`. Router is `src/router/index.ts` with manual routes (`filenameBasedRouting: false`).

Typical order conceptually:

1. Quasar creates the Vue app and installs Pinia.
2. Boot `theme` — apply Quasar Dark from `localStorage` (`ht-theme`) or `auto`.
3. Boot `i18n` — `createI18n` + `app.use(i18n)`.
4. Boot `colyseus` — exports `client`, sets `app.config.globalProperties.$colyseus`.
5. Router `beforeEach` awaits `useAuthStore().whenReady()`, then enforces `requiresAuth` / `guest` meta.
6. Root `App.vue` mounts `q-layout` → shared `q-header` (theme toggle) → `router-view`; stable `watch` on `auth.ready` / user id / anonymous restores theme via `GET /api/theme` (registered) or `localStorage` (guest) — do not replace `auth.user` after GET (avoids restore request storm).

## What Is Connected Globally

Through Quasar / Vue app:

- Pinia stores (`auth`, `theme`, `game`, scaffold `counter`).
- Vue Router.
- vue-i18n.
- Quasar framework (auto-import).

Through `app.config.globalProperties`:

- `$colyseus` - shared `Client` instance (prefer importing `client` from `@/boot/colyseus` in script).

Runtime env (build-time Vite):

- `import.meta.env.VITE_COLYSEUS_URL`
- `import.meta.env.VITE_API_URL`

## What Is In `App.vue`

Minimal shell:

- `q-layout` with `q-page-container` and `<router-view />`.

No global header/footer/dialog host yet — chrome lives inside each page.

## Combined Structure (`src`)

- `assets` - static assets (Quasar logo scaffold).
- `boot` - Quasar boot files (`i18n`, `colyseus`).
- `components` - reusable widgets (mostly scaffold).
- `css` - `app.scss`, Quasar variables.
- `i18n` - locale messages (`en-US`).
- `pages` - route-level views (login / lobby / game).
- `router` - `index.ts` (guards) + `routes.ts`.
- `stores` - Pinia: `auth`, `game`, `example-store` (scaffold).

Outside `src`:

- `public` - static public files.
- `quasar.config.ts` - Quasar/Vite app config.
- `.github/workflows` - GitHub Pages deploy.
- `.env.development` / `.env.production` - local env defaults.

## Pages And Dependency Direction

Route pages live in `src/pages/*Page.vue`. Prefer: `pages` → `stores` / `boot` / `components`. Keep Colyseus I/O inside Pinia stores (`auth`, `game`) rather than scattering `client.*` calls across many components.

## Business Entities And Areas

- **Auth** - `stores/auth` + `pages/LoginPage`. SDK: `registerWithEmailAndPassword`, `signInWithEmailAndPassword`, `signInAnonymously`, `signOut`, `onChange`.
- **Lobby / rooms** - `stores/game.subscribeLobby` / `unsubscribeLobby` + `pages/LobbyPage`. Live Colyseus `LobbyRoom` (filter `tourist`); leave lobby before enter game.
- **Game session** - `stores/game` room attach (mirror `seats` with `touristId` + `pieces[]` / `started` / `sessionId`) + `pages/GamePage` tourist board (all pieces) + strip×4 if seated. Move messages — later.
- **Tourist board** - client layout constant on GamePage (start/task/center tiles); overlay all seats’ pieces; non-interactive.

## Pages (routes)

From `src/router/routes.ts`:

| Path              | Name    | Purpose                                        |
| ----------------- | ------- | ---------------------------------------------- |
| `/` → `/lobby`    | —       | redirect                                       |
| `/login`          | `login` | auth; `meta.guest`                             |
| `/lobby`          | `lobby` | room list / create / join; `meta.requiresAuth` |
| `/game/:roomId`   | `game`  | tourist board; `meta.requiresAuth`             |
| `/:catchAll(.*)*` | —       | redirect to `/lobby`                           |

Router mode: hash (`/#/lobby`, `/#/game/...`).

## Pinia Stores

- **`auth`** (`stores/auth.ts`, setup store) — `user` (optional `theme` from userdata), `token`, `loading`, `error`, `ready`; computed `isAuthenticated`, `displayName`; actions `register` / `login` / `loginAnonymously` / `logout` / `whenReady`. Syncs from `client.auth.onChange`.
- **`theme`** (`stores/theme.ts`, setup store) — Quasar Dark preference; guest `localStorage`; registered `client.http.get('/api/theme')` restore (≠ JWT `user.theme` alone; theme stays in theme store after GET) + `post('/api/theme')` on toggle (optional in-memory `user.theme` patch; `error` + App `q-banner` on fail). Wired from `App.vue`.
- **`game`** (`stores/game.ts`, options store) — `rooms`, `lobbyRoom`, `room`, `roomId`, `status`, `error`, `listing`; getter `isInRoom`; actions `subscribeLobby`, `unsubscribeLobby`, `createGame`, `joinGame`, `leaveGame` (`refreshRooms` HTTP unused by LobbyPage).
- **`counter`** (`stores/example-store.ts`) — Quasar scaffold; not used by the game flow.

## Realtime / HTTP Layer

- `src/boot/colyseus.ts` - `new Client(import.meta.env.VITE_COLYSEUS_URL)`.
- Auth and rooms go through that client (no separate axios layer).
- Lobby listing uses LobbyRoom messages (`rooms` / `+` / `-`); HTTP list is fallback only.
- Production defaults point at `happy-tourist.duckdns.org` (WSS/HTTPS); local defaults `localhost:2567`.

## Errors, Requests, Async

- Auth/game actions catch errors into store `error` string; pages show `q-banner`.
- Router blocks navigation until auth `ready`.
- Leaving a closed room is swallowed in `leaveGame`.
- `GamePage` rejoins by `roomId` if Pinia lost the room (refresh); failed rejoin → lobby.

## OpenSpec / Skills

Canonical OpenSpec and client skills live in **happy-tourist-meta**. Resolve meta via key `happy-tourist-meta` in [`project-map.md`](project-map.md).

| Path                                                                                        | Description                                                            |
| ------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| [`happy-tourist-meta/docs/projects-map.md`](../happy-tourist-meta/docs/projects-map.md)     | Workspace / OpenSpec path map                                          |
| [`happy-tourist-meta/openspec/`](../happy-tourist-meta/openspec/)                           | Spec-driven workflow: `specs/` source of truth, `changes/` active work |
| [`happy-tourist-meta/openspec/config.yaml`](../happy-tourist-meta/openspec/config.yaml)     | Project context and rules                                              |
| [`happy-tourist-meta/.agents/skills/client/`](../happy-tourist-meta/.agents/skills/client/) | Client skills                                                          |
| [`happy-tourist-meta/.agents/skills/`](../happy-tourist-meta/.agents/skills/)               | OpenSpec skills                                                        |
| [`happy-tourist-meta/.agents/AGENTS.md`](../happy-tourist-meta/.agents/AGENTS.md)           | Full docs/skills index in meta                                         |
| [`happy-tourist-meta/AGENTS.md`](../happy-tourist-meta/AGENTS.md)                           | Meta always-on agent instructions                                      |

Runtime paths in skills (`src/…`) are relative to **this** client repo root; sibling server is `../happy-tourist-server`. Prefer meta skills over any leftover local `.agents/skills/`.

### Client skills index

| Skill                         | Use for                                                          |
| ----------------------------- | ---------------------------------------------------------------- |
| `colyseus-client`             | `client.http` + room messages (not axios/BFF)                    |
| `client-align-code`           | Read-only requirements/codebase/test/regression audit            |
| `client-locate-change-points` | Where to edit/add without changing code                          |
| `client-verify-code`          | Branch diff vs all client code skills                            |
| `client-work-with-auth`       | Colyseus Auth, `onChange`, route guards                          |
| `client-work-with-errors`     | Store `error` + `q-banner` (pages + App theme), room `onError`   |
| `client-work-with-structure`  | pages / components / boot / stores placement (incl. theme shell) |
| `work-with-forms`             | LoginPage `q-form` / rules                                       |
| `work-with-pages`             | Routes + guards; App theme header                                |
| `work-with-stores`            | Pinia `auth` / `theme` / `game`                                  |
| `work-with-styles`            | Quasar Dark + GET/POST `/api/theme`, header, muted chrome, board |
| `work-with-localization`      | vue-i18n boot (thin)                                             |
| `work-with-lobby`             | Live LobbyRoom list, leave policy, create / join                 |
| `work-with-rooms`             | Room lifecycle, `onStateChange` / `onLeave`                      |
| `work-with-game-board`        | Static tourist board (no move UX)                                |
| `work-with-env-deploy`        | `VITE_*`, hash router, GitHub Pages                              |

Typical Cursor chat workflow: `/opsx-explore` → `/opsx-propose` → artifact review → `/opsx-apply` → `/opsx-sync` → `/opsx-archive`. OpenSpec artifacts are created and archived in **happy-tourist-meta**, not in this repo.

Commands (`npm run lint`, `npm run typecheck`, `quasar dev`, `quasar build`) are run by the **agent** from this package root. Do not wait for user confirmation; fix failures before claiming done.

## Related Package

- [`../happy-tourist-server`](../happy-tourist-server) — Colyseus multiplayer server (rooms, auth, HTTP `/rooms/:roomName`). Prefer changing room names, state schema, and move protocol in coordination with the server; this client assumes room type `tourist`, mirrors seats (`touristId` + four `pieces`) / `started`, and renders all pieces + strip×4 on a local Game board until move rules land.
