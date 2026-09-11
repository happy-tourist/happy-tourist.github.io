Before work: local [`project-map.md`](project-map.md) (key `happy-tourist-meta` → `..`), then [`happy-tourist-meta/docs/projects-map.md`](../happy-tourist-meta/docs/projects-map.md) (+ optional `projects-map.local.yaml` in meta). Canonical doc links — `happy-tourist-meta/docs/...`.

Skills and OpenSpec live in **happy-tourist-meta**. Before choosing a skill: [`happy-tourist-meta/.agents/skills/client/`](../happy-tourist-meta/.agents/skills/client/) (see [`happy-tourist-meta/.agents/AGENTS.md`](../happy-tourist-meta/.agents/AGENTS.md)).

## What This Application Is
`happy-tourist-client` (`happy-tourist-client-2` in `package.json`) is the browser SPA for online checkers (шашки). Players authenticate, join a lobby, create or enter a Colyseus room, and play a realtime game against another player.

This repository (`happy-tourist.github.io`) is the client-only frontend. The sibling Colyseus server lives in [`../happy-tourist-server`](../happy-tourist-server) and is reached via WebSocket / HTTP URLs from env (`VITE_COLYSEUS_URL`, `VITE_API_URL`).

## What It Is Used For
Main scenarios:

- Register / sign in with email and password (Colyseus Auth).
- Sign in anonymously as a guest.
- Browse available checkers rooms in the lobby (poll `GET /rooms/checkers`).
- Create a game, join by room id, or `joinOrCreate`.
- Play russian checkers on an 8×8 board with live state sync from the room.
- Leave the room and return to the lobby; sign out.

## Who The Users Are
Main users:

- Casual players who want a short online checkers match in the browser.
- Guests (anonymous Colyseus auth) and registered users (email/password).

There is no admin cabinet or content CMS in this app.

## Important
This is a realtime multiplayer client, not a static brochure site. Auth token is managed by `@colyseus/sdk` (`client.auth`, token key `colyseus-auth-token`). Protected routes wait for `auth.whenReady()` before deciding login vs lobby. Game rules and board truth live on the server; the client only renders state and sends `move` messages (local move highlights in `GamePage` are UI hints only).

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
- Theme Sass variables in `src/css/quasar.variables.scss`; global styles in `src/css/app.scss`.
- Route pages under `src/pages/` (`LoginPage`, `LobbyPage`, `GamePage`).
- Scaffold leftovers may remain (`EssentialLink.vue`, `example-store.ts`, unused `pages/index*`) — prefer the login/lobby/game flow above.

## Data And Utilities
- Colyseus `Client` singleton from `src/boot/colyseus.ts` (`VITE_COLYSEUS_URL`).
- Env (Vite): `VITE_COLYSEUS_URL`, `VITE_API_URL` — typed in `env.d.ts`; local files `.env.development` / `.env.production`; CI injects GitHub Actions `vars`.
- Path alias `@/*` → `src/*` (Quasar / Vite).

## Specific Tasks
- Colyseus Auth — register, email/password login, anonymous login, logout via `stores/auth`.
- Checkers room name constant `CHECKERS_ROOM = 'checkers'` in `stores/game`.
- Room listing via `client.http.get('/rooms/checkers')` (SDK `getAvailableRooms` was removed in 0.16+).
- Room lifecycle: `create` / `joinById` / `joinOrCreate`, `onStateChange`, `send('move')`, `leave`.
- GitHub Pages deploy — `.github/workflows/deploy.yml` (`quasar build -m spa`).

## Development Tools
- `eslint` flat config (`eslint.config.js`) + `prettier` (`.prettierrc.json`).
- `vue-tsc` / `vite-plugin-checker` - typecheck during build/dev tooling.
- Scripts: `dev` (`quasar dev`), `build` (`quasar build`), `lint` / `lint:check`, `typecheck`.
- Package manager: npm lockfile is present (`package-lock.json`); README also mentions pnpm.

Application boot is Quasar CLI-driven (`quasar.config.ts` → boot files), not a hand-written `main.ts` entry for app plugins.

## How Boot / App Startup Is Organized
`quasar.config.ts` registers boot files: `i18n`, `colyseus`. Pinia is enabled via Quasar store entry `src/stores/index.ts`. Router is `src/router/index.ts` with manual routes (`filenameBasedRouting: false`).

Typical order conceptually:

1. Quasar creates the Vue app and installs Pinia.
2. Boot `i18n` — `createI18n` + `app.use(i18n)`.
3. Boot `colyseus` — exports `client`, sets `app.config.globalProperties.$colyseus`.
4. Router `beforeEach` awaits `useAuthStore().whenReady()`, then enforces `requiresAuth` / `guest` meta.
5. Root `App.vue` mounts `q-layout` → `router-view`.

## What Is Connected Globally
Through Quasar / Vue app:

- Pinia stores (`auth`, `game`, scaffold `counter`).
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
- **Lobby / rooms** - `stores/game.refreshRooms` + `pages/LobbyPage`. HTTP: `GET /rooms/checkers`.
- **Game session** - `stores/game` room attach + `pages/GamePage`. Messages: `move` `{ from, to }`. State fields expected from server: `board`, `currentTurn`, `status`, `players[sessionId].color`.
- **Board cell values** - `0` empty, `1` white, `2` black, `3` white king, `4` black king.

## Pages (routes)
From `src/router/routes.ts`:

| Path | Name | Purpose |
|------|------|---------|
| `/` → `/lobby` | — | redirect |
| `/login` | `login` | auth; `meta.guest` |
| `/lobby` | `lobby` | room list / create / join; `meta.requiresAuth` |
| `/game/:roomId` | `game` | checkers board; `meta.requiresAuth` |
| `/:catchAll(.*)*` | — | redirect to `/lobby` |

Router mode: hash (`/#/lobby`, `/#/game/...`).

## Pinia Stores
- **`auth`** (`stores/auth.ts`, setup store) — `user`, `token`, `loading`, `error`, `ready`; computed `isAuthenticated`, `displayName`; actions `register` / `login` / `loginAnonymously` / `logout` / `whenReady`. Syncs from `client.auth.onChange`.
- **`game`** (`stores/game.ts`, options store) — `rooms`, `room`, `roomId`, `board`, `myColor`, `currentTurn`, `status`, `error`, `listing`; getters `isInRoom`, `canMove`; actions `refreshRooms`, `createGame`, `joinGame`, `leaveGame`, `sendMove`.
- **`counter`** (`stores/example-store.ts`) — Quasar scaffold; not used by the game flow.

## Realtime / HTTP Layer
- `src/boot/colyseus.ts` - `new Client(import.meta.env.VITE_COLYSEUS_URL)`.
- Auth and rooms go through that client (no separate axios layer).
- Lobby listing uses `client.http.get`.
- Production defaults point at `happy-tourist.duckdns.org` (WSS/HTTPS); local defaults `localhost:2567`.

## Errors, Requests, Async
- Auth/game actions catch errors into store `error` string; pages show `q-banner`.
- Router blocks navigation until auth `ready`.
- Leaving a closed room is swallowed in `leaveGame`.
- `GamePage` rejoins by `roomId` if Pinia lost the room (refresh); failed rejoin → lobby.

## OpenSpec / Skills

Canonical OpenSpec and client skills live in **happy-tourist-meta**. Resolve meta via key `happy-tourist-meta` in [`project-map.md`](project-map.md).

| Path | Description |
|------|-------------|
| [`happy-tourist-meta/docs/projects-map.md`](../happy-tourist-meta/docs/projects-map.md) | Workspace / OpenSpec path map |
| [`happy-tourist-meta/openspec/`](../happy-tourist-meta/openspec/) | Spec-driven workflow: `specs/` source of truth, `changes/` active work |
| [`happy-tourist-meta/openspec/config.yaml`](../happy-tourist-meta/openspec/config.yaml) | Project context and rules |
| [`happy-tourist-meta/.agents/skills/client/`](../happy-tourist-meta/.agents/skills/client/) | Client skills |
| [`happy-tourist-meta/.agents/skills/`](../happy-tourist-meta/.agents/skills/) | OpenSpec skills |
| [`happy-tourist-meta/.agents/AGENTS.md`](../happy-tourist-meta/.agents/AGENTS.md) | Full docs/skills index in meta |
| [`happy-tourist-meta/AGENTS.md`](../happy-tourist-meta/AGENTS.md) | Meta always-on agent instructions |

Runtime paths in skills (`src/…`) are relative to **this** client repo root; sibling server is `../happy-tourist-server`. Prefer meta skills over any leftover local `.agents/skills/`.

### Client skills index

| Skill | Use for |
|-------|---------|
| `colyseus-client` | `client.http` + room messages (not axios/BFF) |
| `client-align-code` | Read-only requirements/codebase/test/regression audit |
| `client-locate-change-points` | Where to edit/add without changing code |
| `client-verify-code` | Branch diff vs all client code skills |
| `client-work-with-auth` | Colyseus Auth, `onChange`, route guards |
| `client-work-with-errors` | Store `error` + `q-banner`, room `onError` |
| `client-work-with-structure` | pages / components / boot / stores placement |
| `work-with-forms` | LoginPage `q-form` / rules |
| `work-with-pages` | Routes + guards login/lobby/game |
| `work-with-stores` | Pinia `auth` / `game` |
| `work-with-styles` | Quasar variables + scoped board CSS |
| `work-with-localization` | vue-i18n boot (thin) |
| `work-with-lobby` | Room list, poll, create / join / joinOrCreate |
| `work-with-rooms` | Room lifecycle, `onStateChange` / `onLeave` |
| `work-with-game-board` | Board, `send('move')`, highlights, `canMove` |
| `work-with-env-deploy` | `VITE_*`, hash router, GitHub Pages |

Typical Cursor chat workflow: `/opsx-explore` → `/opsx-propose` → artifact review → `/opsx-apply` → `/opsx-sync` → `/opsx-archive`. OpenSpec artifacts are created and archived in **happy-tourist-meta**, not in this repo.

Commands (`npm run lint`, `npm run typecheck`, `quasar dev`, `quasar build`) are run by the **user** from this package; the agent proposes and waits for «готово».

## Related Package
- [`../happy-tourist-server`](../happy-tourist-server) — Colyseus multiplayer server (rooms, auth, HTTP `/rooms/:roomName`). Prefer changing room names, state schema, and move protocol in coordination with the server; this client assumes room type `checkers` and the board/turn/status shape described above.
