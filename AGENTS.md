Before work: local [`project-map.md`](project-map.md) (key `happy-tourist-meta` → `..`), then [`happy-tourist-meta/docs/projects-map.md`](../happy-tourist-meta/docs/projects-map.md) (+ optional `projects-map.local.yaml` in meta). Canonical doc links — `happy-tourist-meta/docs/...`.

Skills and OpenSpec live in **happy-tourist-meta**. Before choosing a skill: [`happy-tourist-meta/.agents/skills/client/`](../happy-tourist-meta/.agents/skills/client/) (see [`happy-tourist-meta/.agents/AGENTS.md`](../happy-tourist-meta/.agents/AGENTS.md)).

## What This Application Is

`happy-tourist-client` (`happy-tourist-client-2` in `package.json`) is the browser SPA for online board game «Счастливый турист». Players authenticate, join a lobby, create or enter a Colyseus room, and play a realtime game against another player.

This repository (`happy-tourist.github.io`) is the client-only frontend. The sibling Colyseus server lives in [`../happy-tourist-server`](../happy-tourist-server) and is reached via WebSocket / HTTP URLs from env (`VITE_COLYSEUS_URL`, `VITE_API_URL`).

## What It Is Used For

Main scenarios:

- Register / sign in with email and password (Colyseus Auth); soft email verify via cabinet (no auto mail on register); confirm/reset via SPA pages + JSON.
- Sign in anonymously as a guest; Google one-click.
- Request password reset from forgot-password page (explicit not-found when email unknown).
- Confirm email / set new password on public hash routes (`/#/confirm-email`, `/#/reset-password`).
- Browse available tourist rooms in the lobby (live `LobbyRoom` subscribe; leave lobby before enter `tourist`); open Support from the lobby header.
- Create support tickets (topic + body), view own list / thread; staff (moderator|admin) queue; admin users page to change roles.
- Create a game with chosen `maxSeats` (2|3|4), or join by room id.
- Open Game and view the tourist board with synced seats (pieces appear only in `playing`) and a four-slot tourist strip inside the seated sticky bottom HUD once own pieces exist (wide row N,E,W,S; HUD ≤~420 (covers ≤320/300) → 2×2; **no** chip/`q-menu`); after phase `playing`, on own turn select an unfinished piece from the strip or board and submit a one-step `move` via the game store; landing on center finishes a piece (disappear + finish flag on strip; any finish 2×2 click → nearest legal center); finishing all four shows a place modal and presence badge while the seat stays (say allowed, no moves, leave without confirm); solo five-minute timer expiry or steps exhaustion (no live task tile) shows a distinct end modal + locks moves (`timeExpired`); presence: opponents (or spectator all) above the board; seated bottom HUD = own + strip only; dual circular countdowns (outer turn blue/red, inner reconnect warning) around avatar; say bubbles: top markers down toward board, own bottom up; seated+online players may send preset say bubbles (`hello` / `luck`) via `sendSay`; underfilled waiting may `sendReady`.
- Leave the room via shared App header brand logo on Game (accessible name «Выход из игры» / `game.leave`; match status centered in the same header; no Material `logout` leave; no room id chrome); other authenticated pages use the logo to return to lobby (`auth.backToLobby` aria; no page «В лобби»); seated players in phase `playing` without finish place or time-expired confirm before consented leave; sign out.

## Who The Users Are

Main users:

- Casual players who want a short online board game «Счастливый турист» match in the browser.
- Guests (anonymous Colyseus auth), registered users (email/password), and Google one-click (`loginWithGoogle` / `signInWithProvider('google')`).
- Moderators / admins (product `role` from userdata) for support staff queue and (admin only) user role assignment.

There is no separate CMS. Support + role admin are in-app pages (`/support`, `/support/staff`, `/admin/users`) over JWT HTTP — not a full admin console. Registered users have a personal cabinet (`/account`) for display name, change-password (email/password only), and soft email confirm / change-email; confirm and password-reset UX is **client SPA** + JSON (not API HTML). Register / reset / change-password share a product password policy (≥8 + lower/upper/digit/symbol) with an advisory strength meter. Auth-email human-facing copy is **Russian** and mentions checking the spam folder.

## Important

This is a realtime multiplayer client, not a static brochure site. Auth token is managed by `@colyseus/sdk` (`client.auth`, token key `colyseus-auth-token`). Protected routes wait for `auth.whenReady()` before deciding login vs lobby. Seating/turn/move/timer/grille/catapult rules live on the server; Game mirrors synced seats + `phase` / `maxSeats` / `currentTurnSessionId` / `turnUntil` / `turnBudgetSeconds` / `removedTaskKeys` / `holdingGrilleKeys` / `revealingCatapultKeys` / `brokenCatapultKeys` / seat `timeExpired` / piece `trapped`, shows local select/hints only while `isPlaying` and on own turn (not finished / not time-expired; trapped locked), and submits moves/rescues/pushes/returns only via `game.sendMove` / `sendRescue` / `sendPush` / `sendReturnFromFinish`. Ready-to-start uses `sendReady`. Preset say is ephemeral (`sendSay` / `onMessage('say')` → `sayEvents`) — not schema.

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
- Shared `q-header` in `App.vue` (brand logo ~30px left on all pages; theme toggle; on Game also centered match status; leave = logo click). Guest preference → `localStorage` (`ht-theme`); registered → `GET /api/theme` restore (not JWT-only) + `POST /api/theme` on toggle. Tourist board scoped CSS is independent of chrome Dark.
- Route pages under `src/pages/` (`LoginPage`, `ForgotPasswordPage`, `ConfirmEmailPage`, `ResetPasswordPage`, `AccountPage`, `LobbyPage`, `SupportPage`, `SupportTicketPage`, `SupportStaffPage`, `AdminUsersPage`, `GamePage`).
- Document title `productName` = `Happy Tourist`; `index.html` links only `favicon.ico` (`public/favicon.ico`). Brand asset: `src/assets/brand/logo.png`.
- Scaffold leftovers may remain (`EssentialLink.vue`, `example-store.ts`) — prefer the login/forgot/confirm/reset/account/lobby/support/game flow above (dead `pages/index*` / Quasar logo SVG / PNG favicon set removed).

## Data And Utilities

- Colyseus `Client` singleton from `src/boot/colyseus.ts` (`VITE_COLYSEUS_URL`).
- Env (Vite): `VITE_COLYSEUS_URL`, `VITE_API_URL` — typed in `env.d.ts`; local files `.env.development` / `.env.production`; CI injects GitHub Actions `vars`.
- Path alias `@/*` → `src/*` (Quasar / Vite).

## Specific Tasks

- Colyseus Auth — register (name + password policy), email/password login, anonymous, Google, forgot-password, SPA confirm/reset JSON, cabinet displayName / change-password / send-confirm / change-email, logout via `stores/auth`.
- Tourist room name constant `TOURIST_ROOM = 'tourist'` in `stores/game`.
- Live lobby listing via `subscribeLobby` / `unsubscribeLobby` (`joinOrCreate('lobby', { filter: { name: 'tourist' } })`); clear stale `rooms` until fresh snapshot; join busy-lock on LobbyPage; HTTP `GET /rooms/tourist` remains unused fallback.
- Room lifecycle: `create({ maxSeats, grilleDensity, catapultDensity })` / `joinById`, `onStateChange`, `leave`, `sendMove` → `move`, `sendRescue` → `rescue`, `sendPush` → `push`, `sendReturnFromFinish` → `returnFromFinish`, `sendReady` → `ready`, `sendSay` → `say` + `onMessage('say'|'budgets'|'peekOpen'|'allJailWarning')`.
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
6. Root `App.vue` mounts `q-layout` → shared `q-header` (brand logo left; theme toggle; on Game also status + leave via logo) → `router-view`; stable `watch` on `auth.ready` / user id / anonymous restores theme via `GET /api/theme` (registered) or `localStorage` (guest) — do not replace `auth.user` after GET (avoids restore request storm).

## What Is Connected Globally

Through Quasar / Vue app:

- Pinia stores (`auth`, `theme`, `game`, `support`, scaffold `counter`).
- Vue Router.
- vue-i18n.
- Quasar framework (auto-import).

Through `app.config.globalProperties`:

- `$colyseus` - shared `Client` instance (prefer importing `client` from `@/boot/colyseus` in script).

Runtime env (build-time Vite):

- `import.meta.env.VITE_COLYSEUS_URL`
- `import.meta.env.VITE_API_URL`

## What Is In `App.vue`

Shared shell:

- `q-layout` → `q-header` (brand logo left always; theme toggle; on Game centered match status; leave via logo click) → `q-page-container` → theme `q-banner` + `<router-view />`.
- On Game: leave confirm `q-dialog` + `leaveGame` → lobby (`stores/game`); auth logo decorative; lobby logo noop; other auth pages logo → lobby (no page «В лобби»).
- Top opponents / spectator presence + seated sticky `.game-hud` (own + strip) stay on `GamePage` (not in App).

## Combined Structure (`src`)

- `assets` - static assets (`brand/logo.png`, tourists, grilles, catapults).
- `boot` - Quasar boot files (`i18n`, `colyseus`).
- `components` - reusable widgets (mostly scaffold).
- `css` - `app.scss`, Quasar variables.
- `i18n` - locale messages (`en-US`).
- `pages` - route-level views (login / lobby / support / admin / game).
- `router` - `index.ts` (guards) + `routes.ts`.
- `stores` - Pinia: `auth`, `game`, `support`, `example-store` (scaffold).

Outside `src`:

- `public` - product `favicon.ico` only (no scaffold PNG icon set).
- `package.json` - `productName` = `Happy Tourist`.
- `quasar.config.ts` - Quasar/Vite app config.
- `.github/workflows` - GitHub Pages deploy.
- `.env.development` / `.env.production` - local env defaults.

## Pages And Dependency Direction

Route pages live in `src/pages/*Page.vue`. Prefer: `pages` → `stores` / `boot` / `components`. Keep Colyseus I/O inside Pinia stores (`auth`, `game`, `support`) rather than scattering `client.*` calls across many components.

## Business Entities And Areas

- **Auth** - `stores/auth` + `pages/LoginPage` + `ForgotPasswordPage` + `AccountPage` + App verify reminder (once per `sessionStorage`, mark seen when shown). SDK: `registerWithEmailAndPassword`, `signInWithEmailAndPassword`, `signInAnonymously`, `signInWithProvider('google')`, `sendPasswordResetEmail`, `signOut`, `onChange`; HTTP send-confirm / change-email. Post-send UI RU + spam hint.
- **Lobby / rooms** - `stores/game.subscribeLobby` / `unsubscribeLobby` + `pages/LobbyPage`. Live Colyseus `LobbyRoom` (filter `tourist`); quiet resubscribe on drop; leave lobby before enter game; create modal maxSeats + `grilleDensity` + `catapultDensity` (few/medium/many each, default medium).
- **Game session** - `stores/game` room attach (mirror `seats` with `touristId` + `pieces[]` (+ `finished`/`trapped`) + `connected` / `reconnectUntil` / `ready` / `finishPlace` / `timeExpired` / `phase` / `maxSeats` / `countdownRemaining` / `currentTurnSessionId` / `turnUntil` / `turnBudgetSeconds` / `removedTaskKeys` / `holdingGrilleKeys` / `revealingCatapultKeys` / `brokenCatapultKeys` / `sessionId`; private `steps`/`peeks`/`budgetsInfinite` (peeks∞ only)/`peekedThisTurn` (legacy)/`openPeek`/`allJailWarning` from `budgets`/`peekOpen`/`allJailWarning`; `isMyTurn` / `isPlaying` / `isMySeatFinished` / `isMySeatTimeExpired` / `canSendEndTurn` / `sendMove` / `sendRescue` / `sendPush` / `sendReturnFromFinish` / `sendPeek` / `sendPeekAnswer` / `sendEndTurn` / `sendReady`; create `{ maxSeats, grilleDensity, catapultDensity }`) + `pages/GamePage` tourist board (unfinished pieces + disappear + return anim from nearest center + holes + grille overlays + catapult land→overlay→fling + board-busy + rescue/push + return strip icon) + top presence + seated sticky `.game-hud` (own + strip) + dual rings + budgets beside avatar + end-turn `skip_next` right-center on own avatar + peek/rescue/push top-center + countdown overlay; leave confirm + match status live in `App.vue` header on Game (when seated ∧ `playing` ∧ `!finishPlace` ∧ `!timeExpired`).
- **Tourist board** - client layout constant on GamePage (start/task/center tiles; holes for `removedTaskKeys` — not landable; piece may stand on hole); grille overlay from `holdingGrilleKeys` (`grille.png` drop/rise **`GRILLE_ANIM_MS = 1000`** / `--grille-anim-ms`, incl. leave-clear rise + chrome grille on strip when trapped; **defer drop** while catapult queue busy — SC-BOARD-29/30); catapult sequential overlay from `revealingCatapultKeys` / `brokenCatapultKeys` (`catapult.png` / `catapult-broken.png`, **`CATAPULT_ANIM_MS = 1000`**; every viewer land→overlay→fling; pin on cell during overlay → travel after vanish; **always finish travel after vanish** when finished/center even if finish sync late — SC-FINISH-20 / SC-BOARD-31; broken 300+300 hold; D13 atomic seats+revealing mirror; continuous board-busy (intent lock before send + presentation + pipeline settle; settled grille hold unlocks for rescue) on land/move/grille/catapult/finish/fling + pending grille; seated top presence always reserves row height); trapped pieces visible, no move/peek; rescue affordance when adj free + steps; push icons over free adj targets of selected free pusher + steps → `sendPush`; return: green `undo` icon over finished strip when `canReturn` → same red `.tile--target` ring → `sendReturnFromFinish` (dim finished only if `!canReturn`; slot body finished → noop; **no** confirm modal); overlay unfinished pieces only after materialize; opponents/spectator markers above board; seated bottom HUD = own + strip (row / narrow 2×2); finish/ready top-left, say top-right (top bubbles↓ / own↑); budgets beside own avatar; end-turn icon-only `skip_next` right-center on own avatar (no dock/label/dialog; solo hides); peek/rescue/push affordances top-center (same family as strip return); peek eye (non-trapped on live `*`); all-jail warning modal (own seat only); on own turn while `playing` local select/hints + `sendMove` (does not end turn; hints exclude holes); finish 2×2 click → nearest legal center; center finish (move or push) → travel from last board cell + fade + finish flag on strip + place modal.
- **Tourist reconnect** - `localStorage` token + `rejoinGame` (`reconnect` → `joinById`); lobby has no reconnect hold.
- **Support** - `stores/support` + `pages/SupportPage` (create + own list) + `SupportTicketPage` (thread) + `SupportStaffPage` (staff queue; moderator|admin; topic + status filters, default all topics / open) + lobby header link «Поддержка» (any JWT, incl. anonymous). HTTP only via `client.http` (no Colyseus room). Guest create: warn no email notify + session-loss risk; anonymous display «Гость»; create/reply: `lazy-rules` + clear → `await nextTick()` → `resetValidation` (no red empty after success); thread message spacing + gap thread→reply; closed read-only + CTA new ticket. i18n RU for topics/statuses/limits.
- **Roles / admin users** - product `role` (`user` \| `moderator` \| `admin`) from auth userdata; `auth.isStaff` / `auth.isAdmin` gate nav only (server enforces). `pages/AdminUsersPage` — non-anonymous users from API + change role (admin only; moderator has no role UI); badge when `emailVerified === false`.

## Pages (routes)

From `src/router/routes.ts`:

| Path               | Name              | Purpose                                                                 |
| ------------------ | ----------------- | ----------------------------------------------------------------------- |
| `/` → `/lobby`     | —                 | redirect                                                                |
| `/login`           | `login`           | auth; `meta.guest`                                                      |
| `/forgot-password` | `forgot-password` | reset request; `meta.guest`                                             |
| `/confirm-email`   | `confirm-email`   | SPA JSON confirm (`?token=`); **public** (no `guest`)                   |
| `/reset-password`  | `reset-password`  | SPA JSON reset form (`?token=`); **public**                             |
| `/lobby`           | `lobby`           | room list / create / join; Support link; `meta.requiresAuth`            |
| `/account`         | `account`         | cabinet (name / password / confirm / change email); `meta.requiresAuth` |
| `/support`         | `support`         | create + own tickets; `meta.requiresAuth`                               |
| `/support/staff`   | `support-staff`   | staff queue; `meta.requiresAuth` + `requiresStaff`                      |
| `/support/:id`     | `support-ticket`  | ticket thread; `meta.requiresAuth`                                      |
| `/admin/users`     | `admin-users`     | list users + set role; `meta.requiresAuth` + `requiresAdmin`            |
| `/game/:roomId`    | `game`            | tourist board; `meta.requiresAuth`                                      |
| `/:catchAll(.*)*`  | —                 | redirect to `/lobby`                                                    |

Router mode: hash (`/#/lobby`, `/#/support`, `/#/support/staff`, `/#/support/<id>`, `/#/admin/users`, `/#/confirm-email`, `/#/reset-password`, `/#/game/...`).

## Pinia Stores

- **`auth`** (`stores/auth.ts`, setup store) — `user` (optional `theme`, `emailVerified`, `role`, `displayName`, `hasPassword`), `token`, `loading`, `error`, `ready`; computed `isAuthenticated`, `displayName`, `canChangePassword`, `needsEmailVerification`, `role`, `isStaff`, `isAdmin`; actions `register` / `login` / `loginAnonymously` / `loginWithGoogle` / `logout` / `forgotPassword` / `confirmEmail` / `resetPassword` / `updateDisplayName` / `changePassword` / `sendEmailConfirmation` / `changeEmail` / `refreshUserData` / `whenReady`. Syncs from `client.auth.onChange`. Role is for UI gating only — server enforces staff/admin.
- **`theme`** (`stores/theme.ts`, setup store) — Quasar Dark preference; guest `localStorage`; registered `client.http.get('/api/theme')` restore (≠ JWT `user.theme` alone; theme stays in theme store after GET) + `post('/api/theme')` on toggle (optional in-memory `user.theme` patch; `error` + App `q-banner` on fail). Wired from `App.vue`.
- **`game`** (`stores/game.ts`, options store) — `rooms`, `lobbyRoom`, `lobbyWanted`, `room`, `roomId`, `sessionId`, `seats` (incl. connectivity + `ready` + `finishPlace` + `timeExpired` + piece `trapped`), `phase`, `maxSeats`, `countdownRemaining`, legacy `started`, `currentTurnSessionId`, `turnUntil`, `turnBudgetSeconds`, `removedTaskKeys`, `holdingGrilleKeys`, `revealingCatapultKeys`, `brokenCatapultKeys`, private `steps`/`peeks`/`budgetsInfinite`/`peekedThisTurn`/`openPeek`/`allJailWarning`, ephemeral `sayEvents`, `consentedLeaving` (gates GamePage soft-drop rejoin during App header `leaveGame`), `status`, `error`, `listing`; getters `isInRoom` / `mySeat` / `isSeated` / `isMyTurn` / `isPlaying` / `canSendReady` / `canSendEndTurn` / `isMySeatFinished` / `isMySeatTimeExpired` / `isSoloBudget`; actions `subscribeLobby`, `unsubscribeLobby`, `createGame({ maxSeats, grilleDensity, catapultDensity })`, `joinGame`, `rejoinGame`, `leaveGame`, `sendMove`, `sendRescue`, `sendPush`, `sendReturnFromFinish`, `sendPeek`, `sendPeekAnswer`, `sendEndTurn`, `sendReady`, `sendSay` (`refreshRooms` HTTP unused by LobbyPage); tourist reconnect token in `localStorage` (`ht-tourist-reconnect`).
- **`support`** (`stores/support.ts`, setup store) — HTTP create/list/detail/message/close + staff list/take/status + admin users/role; `loading` / `error` + page `q-banner` pattern.
- **`counter`** (`stores/example-store.ts`) — Quasar scaffold; not used by the game flow.

## Realtime / HTTP Layer

- `src/boot/colyseus.ts` - `new Client(import.meta.env.VITE_COLYSEUS_URL)`.
- Auth and rooms go through that client (no separate axios layer).
- Lobby listing uses LobbyRoom messages (`rooms` / `+` / `-`); HTTP list is fallback only.
- Production defaults point at `api.happy-tourist.ru` (WSS/HTTPS); local defaults `localhost:2567`.

## Errors, Requests, Async

- Auth/game actions catch errors into store `error` string; pages show `q-banner`.
- Router blocks navigation until auth `ready`.
- Leaving a closed room is swallowed in `leaveGame`.
- `GamePage` calls `rejoinGame(roomId)` if Pinia lost the room (F5 / soft-fail / browser reopen): prefer `localStorage` reconnection token, then `joinById`; failed reconnect clears stale token; failed rejoin → lobby. Consented leave clears the token; store `consentedLeaving` blocks soft-drop auto-rejoin while App header leave clears the room.

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

| Skill                         | Use for                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| ----------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `colyseus-client`             | `client.http` + room messages (`move`/`rescue`/`push`/`returnFromFinish`/`peek`/`endTurn`/`say` + private `budgets`/`peekOpen`/`allJailWarning`; holes + holding grilles + catapult reveal keys; not axios/BFF)                                                                                                                                                                                                                                                                                                             |
| `client-align-code`           | Read-only requirements/codebase/test/regression audit (incl. async races + Quasar nested-slot/overlay hide)                                                                                                                                                                                                                                                                                                                                                                                                                 |
| `client-locate-change-points` | Where to edit/add without changing code                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| `client-verify-code`          | Branch diff vs all client code skills                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| `client-work-with-auth`       | Colyseus Auth, forgot/cabinet/`emailVerified`, SPA confirm/reset + JSON, once-per-session verify reminder (mark seen when shown), `onChange`, route guards                                                                                                                                                                                                                                                                                                                                                                  |
| `client-work-with-errors`     | Store `error` + `q-banner` (pages + App theme), room `onError`; soft-drop gated by `consentedLeaving`                                                                                                                                                                                                                                                                                                                                                                                                                       |
| `client-work-with-structure`  | pages / components / boot / stores / assets (`brand/`, `grilles/`, `catapults/`) placement (brand logo shell + Game leave via logo + status in App)                                                                                                                                                                                                                                                                                                                                                                         |
| `work-with-forms`             | LoginPage / ForgotPasswordPage / ResetPasswordPage `q-form` / rules                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| `work-with-pages`             | Routes + guards login/forgot/confirm/reset/account/lobby/support/admin/game; App header (brand logo left + theme + verify reminder + Game leave via logo/status; no page «В лобби»; productName/favicon); Lobby grilleDensity+catapultDensity + Support link; GamePage top presence + seated strip HUD / budgets / end-turn icon / return strip icon / push / holes / grilles / catapult land→overlay→fling + deferred grille + board-busy / dual end + all-jail                                                            |
| `work-with-stores`            | Pinia `auth` (forgot/confirm/reset/change-email / `role` gating) / `theme` / `game` (incl. peeks∞ / finite steps / peek / rescue/push/return / grilleDensity+catapultDensity create / reveal keys / D13 atomic `$patch` seats+revealing / end-turn / `consentedLeaving`) / `support` (HTTP tickets + staff + admin)                                                                                                                                                                                                         |
| `work-with-styles`            | Quasar Dark + GET/POST `/api/theme`, header brand-logo CSS + theme toggle, muted chrome, board holes + grille overlays (`--grille-anim-ms` 1000) + catapult reveal/broken-hold CSS (`--catapult-anim-ms` 1000) + top presence + seated strip HUD / budgets / end-turn affordance CSS                                                                                                                                                                                                                                      |
| `work-with-localization`      | vue-i18n boot; auth-email RU (`confirmSentDialog` / `forgotSuccess` / confirm+reset SPA + spam); `auth.backToLobby` aria-only for logo; `game.say` / ready / leave (logo aria) / finish / returnAffordance / pushAffordance / timer+steps end / steps/peeks / endTurn / peek / solo-peeks∞ / grille+catapult density + rescue/return/all-jail keys                                                                                                                                                                         |
| `work-with-lobby`             | Live LobbyRoom list, create-with-maxSeats + grilleDensity + catapultDensity modal (12/22/35% seed each; no Play), quiet resubscribe                                                                                                                                                                                                                                                                                                                                                                                         |
| `work-with-rooms`             | Room lifecycle, tourist reconnect token, consented leave (brand-logo confirm in App header on Game)                                                                                                                                                                                                                                                                                                                                                                                                                         |
| `work-with-game-board`        | Board + top opponents / spectator presence + seated strip (row/2×2; no chip/`q-menu`) + grille (`GRILLE_ANIM_MS=1000`; defer drop during catapult hops) + catapult land→overlay→fling (`CATAPULT_ANIM_MS=1000`, broken 300+300, spectator parity, D13 atomic mirror, **finish travel after vanish** even if finish sync late, board-busy lock) + trap/rescue/push top-center + return strip icon (no modal) + budgets / end-turn `skip_next` on avatar + dual rings + say top↓/own↑ + push/move finish travel + return anim; leave/status via App brand logo |
| `work-with-env-deploy`        | `VITE_*`, hash router, GitHub Pages                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |

Typical Cursor chat workflow: `/opsx-explore` → `/opsx-propose` → artifact review → `/opsx-apply` → `/opsx-sync` → `/opsx-archive`. OpenSpec artifacts are created and archived in **happy-tourist-meta**, not in this repo.

Commands (`npm run lint`, `npm run typecheck`, `quasar dev`, `quasar build`) are run by the **agent** from this package root. Do not wait for user confirmation; fix failures before claiming done.

## Related Package

- [`../happy-tourist-server`](../happy-tourist-server) — Colyseus multiplayer server (rooms, auth, HTTP `/rooms/:roomName`). Prefer changing room names, state schema, and move protocol in coordination with the server; this client assumes room type `tourist`, mirrors seats (`touristId` + `pieces` + `finished`/`trapped` / `finishPlace` / `timeExpired`) / `phase` / `maxSeats` / `currentTurnSessionId` / `turnUntil` / `turnBudgetSeconds` / `removedTaskKeys` / `holdingGrilleKeys` / `revealingCatapultKeys` / `brokenCatapultKeys`, listens private `budgets`/`peekOpen`/`allJailWarning`, renders unfinished pieces only after materialize + holes (not landable) + grille/catapult overlays + trap/rescue/push + return strip icon (no modal) + top presence + seated strip HUD with dual rings + own counters (steps number / peeks ∞ solo) beside avatar / end-turn `skip_next` right-center + peek/rescue/push top-center chrome + place/timer-vs-steps/solo-peeks∞/all-jail modals + local move chrome only in `playing` for eligible seats (move/push do not end turn; targets exclude holes; trapped locked; finish click → nearest legal center), and sends via `sendMove` / `sendRescue` / `sendPush` / `sendReturnFromFinish` / `sendPeek` / `sendPeekAnswer` / `sendEndTurn` / `sendReady`. Create options `{ maxSeats, grilleDensity, catapultDensity }`. Leave + match status live in `App.vue` header on Game (no room-id chrome).
