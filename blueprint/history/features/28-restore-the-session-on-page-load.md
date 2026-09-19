# Feature: Restore the session on page load

**From build-plan:** feature 28
**Build attempt:** 1
**Status:** verified
**Branch:** `feature/restore-the-session-on-page-load`

## Goal

The access token lives only in `src/api/client.js` memory, so every reload,
bookmark, or shared link starts signed out even when the httpOnly refresh cookie
is still valid: the Header offers "Se connecter" to someone who never logged
out, the favorite hearts are absent on a directly opened offer page, and
`/publish` redirects the owner away. Attempt one `POST /users/refresh` when
`App` mounts, adopt the returned `accessToken`, and treat a failure as
"genuinely signed out" without ever redirecting. This unblocks item 22, which is
authenticated-only and otherwise opens empty on every direct visit.

## In scope

- A session bootstrap on `App` mount: one `POST /users/refresh` with
  `withCredentials`, adopting `{ accessToken }` through the existing
  `setToken` so `App`'s `subscribeToken` listener and `getUserId()` follow.
- Holding the first render until the bootstrap settles, with the app's existing
  loading copy.
- Rendering the anonymous app normally when the refresh fails (401, network,
  any other status): no redirect, no error banner.
- Clearing the `useFavorites` favorites Set when `userId` changes, which this
  feature makes reachable for the first time.
- Browser coverage for the restored and the signed-out path.

## Out of scope

- The `/favorites` page (item 22) and any new route.
- Changing the 401 -> refresh -> retry response interceptor, the login flow, or
  the logout flow.
- Persisting the access token anywhere (it stays in memory by design).
- Any "remember me" or session-expiry UI.

## Build loop

Build one small step at a time. `workflow.stepReview` is `feature`, so all steps
are built and then one review packet is produced at the end.
`workflow.checkpointCommits` is `disabled`, so do not offer checkpoint commits.
`/complete` makes the final feature commit.

## Build steps

- [x] **Step 1 - Bootstrap the session on `App` mount** - add an exported
  `restoreSession()` to `src/api/client.js` that posts `{}` to
  `${import.meta.env.VITE_API_URL}/users/refresh` with `withCredentials: true`
  using bare `axios` (not the `client` instance, whose 401 interceptor would
  refresh again and redirect to `/login`), calls `setToken(response.data.accessToken)`
  on success, and swallows every failure. In `src/App.jsx`, add an
  `isRestoring` state initialised to `true`, call `restoreSession()` from a
  mount effect and clear the flag in `finally`; while it is true render only
  `<p className="loading">Chargement en cours...</p>` inside a `.container`,
  matching `Home`, `Offer`, and `Confirm`. *Done when:* with a valid refresh
  cookie, a direct open of `/offers/:id` shows "Se déconnecter" in the Header
  and the favorite heart on the offer; a direct open of `/publish` renders the
  publish form instead of bouncing to `/`; with the refresh stubbed 401, the
  same URLs render the anonymous app, the URL is unchanged, and no request goes
  to `/login`; `yarn verify` passes.

- [x] **Step 2 - Reset the favorites Set when the account changes** - in
  `src/utils/useFavorites.js`, clear `favoriteIds` back to `null` at the start
  of the `userId` effect so a new session never renders the previous account's
  favorites while its own list is in flight. Keep the existing `cancelled`
  guard. *Done when:* after a session change under a mounted page, hearts show
  no state until the new list arrives (`isLoaded` is false in between) rather
  than the previous account's; `yarn verify` passes.
  *Built as:* not the planned one-line clear. `yarn lint` enforces
  `react-hooks/set-state-in-effect`, so the set is stored with the account it
  was read for (`{ userId, ids }`) and `favoriteIds` is derived during render.
  Same observable behavior, and every optimistic flip now refuses to write back
  onto a different account.

- [x] **Step 3 - Browser coverage** - add `tests/browser/session-restore.spec.js`
  in the style of `tests/browser/silent-token-refresh.spec.js`: one test stubs
  `POST /users/refresh` with `{ accessToken: <token whose sub is a known user id> }`,
  opens an offer page directly, and expects "Se déconnecter" plus the favorite
  control; one test stubs the refresh 401, opens the same URL, and expects the
  anonymous Header and a URL that is still the offer page. A third case was
  added for step 1's other done-when: a directly opened `/publish` with a valid
  refresh cookie stays on `/publish`. *Done when:*
  `yarn test:browser` passes, including the existing specs.

- [x] **Step 4 - Repair the audit findings** - F-01: bound the bootstrap refresh
  with `timeout: 5000` so a hanging API cannot hold the first render for good.
  F-03: fold `hasFailed` and `error` into the same account-scoped record as the
  id set, read through one ownership check. F-02: commit the two regression
  tests, and mutation-check each one by removing its guard. *Done when:* both new
  tests fail with their guard removed and pass with it, `yarn lint`,
  `yarn verify` and `yarn test:browser` are green.

- [x] **Step 5 - Repair the second audit pass** - F-05: lift one shared
  `requestRefresh()` so the interceptor's refresh carries the same bound as the
  bootstrap and the two copies cannot diverge. F-06: move `buildToken`, the
  account ids and the offer fixtures into `tests/browser/fixtures.js`, imported
  by both browser specs. *Done when:* `yarn lint`, `yarn verify` and
  `yarn test:browser` are green, with the silent-refresh cases still passing.

- [x] **Step 6 - Repair the independent review's finding** - F-07: `clearError`
  returns the record untouched when there is nothing to clear, and `toggle` reuses
  it rather than writing its own. *Done when:* clearing an absent error causes no
  re-render, `yarn lint`, `yarn verify` and `yarn test:browser` are green.

## Files / areas

- `src/api/client.js` - new `restoreSession()` next to the existing refresh
  call.
- `src/App.jsx` - bootstrap effect, `isRestoring` gate on the first render.
- `src/utils/useFavorites.js` - one-line reset in the `userId` effect.
- `tests/browser/session-restore.spec.js` - new.
- `tests/browser/fixtures.js`, `tests/browser/favorites.spec.js` - shared browser
  fixtures extracted here (F-06).
- No CSS file changes: `.loading` already exists in `src/App.css`.

## Data / contracts

- `POST /users/refresh`: no Authorization header, no body of interest, relies on
  the httpOnly `refreshToken` cookie (`path: /users`, ~30 days, rotated on each
  call), so `withCredentials: true` is mandatory. Success returns
  `{ accessToken }` alone; there is no `_id`, so the user id keeps coming from
  the token's `sub` claim through `getUserId()`.
- 401 means the cookie is absent, expired, or already rotated away. It is a
  normal anonymous visit, not an error state and not a reason to navigate.
- The access token stays in memory only. Do not write it to a cookie, to
  `localStorage`, or to a log line.
- The refresh cookie's ~30 days are sliding, not absolute: the backend reissues
  it on each rotation, so calling `/users/refresh` at mount is what makes a
  session survive indefinitely for anyone who visits within the window. Measured
  against the live backend on 2026-09-19, and accepted as the product behavior.
  Rotation is strict (a replayed token gets 401) but there is no family
  revocation, so a lost race costs one tab its session, never the account's.
- Exactly one bootstrap call per page load. `src/main.jsx` does not use
  `StrictMode`, so the mount effect runs once; do not add a guard for a second
  mount that cannot happen.

## Testing

- No unit test runner is configured, so logic evidence is `yarn verify` plus the
  browser specs. Do not add a runner in this feature.
- `Browser tests` is declared (`yarn test:browser`), and this feature is exactly
  the click-through, navigation-sensitive behavior that deserves it, so step 3
  is required rather than optional.
- Manual check for step 1: log in, reload the page, confirm the Header still
  reads "Se déconnecter" and that the reload shows the loading line rather than
  a signed-out flash.
- Step 2 has no browser test: reaching a live account change under a mounted
  page needs a second real session. Verify it by observation during `/check`,
  and state plainly that it was observed that way rather than claiming a test.

## Notes for the AI

- Decision, since the build plan asked for one: hold the first render, do not
  accept a signed-out flash. `Publish` returns `<Navigate to="/" />` and
  `Payment` returns `<Navigate to="/login" ...>` on a falsy token, so a flash is
  not cosmetic - it would evict a signed-in user from the URL they opened, and
  the route change is not undone when the token arrives.
- Hold the whole tree, Header included. Rendering the Header early would show
  "Se connecter" to a user who is about to be restored, which is the exact bug
  this feature removes.
- Reuse `setToken`/`subscribeToken`; do not add a second source of session
  state, a context, or a provider. `App` already re-renders from the listener.
- The bootstrap must not use the `client` axios instance. Its 401 interceptor
  would fire a second `/users/refresh` and then `window.location.assign('/login')`,
  which is the one outcome this feature forbids.
- UI copy is French; reuse "Chargement en cours..." verbatim.
- Comment the why, not the what, and keep comments to the two non-obvious
  points: bare `axios` to dodge the interceptor, and why the first render is
  held.


<!-- blueprint:completion {"schemaVersion":1,"specBytes":9610,"specSha256":"411d962eb8b40ee38c3b5245d6cabb4b41ef660e54ee7a9896543e9d8b6c81ee","branch":"refs/heads/feature/restore-the-session-on-page-load","head":"dfc8ea13fa79fa559b2f92c5a2671a1440949b95","baseRef":"refs/heads/master","baseCommit":"790244c402321d2507e6935513642bb4173d394b","sourceTree":"41de4800ff352c5800b7034532297f7eb5e9269a","absentOptional":[]} -->

## Findings

### 28/F-01 [P1] closed - The whole app is held on a refresh call with no timeout

**File:** src/App.jsx:36
**Found:** 2026-09-19 by /audit (scope: current; lens: quality, security, performance, tests)
**Why it matters:** `restoreSession()` runs on bare `axios` with no `timeout`, and
axios has no default one; no timeout is configured anywhere in the project. Until
that promise settles, `App` renders only `Chargement en cours...`, so a hanging
API (not a refused connection, which fails fast) leaves the entire app blank with
no content and no error, on every route including the anonymous ones that need no
session at all. `/check` captured that exact state in `holding-first-render.png`
while the refresh was held open. Before this feature a slow API degraded one page;
now it blocks all of them.
**Suggested fix:** give the bootstrap call a bounded timeout, for example
`{ withCredentials: true, timeout: 5000 }`. A timeout then lands in the existing
`catch`, which already means "browse anonymously". No current requirement is lost:
a session that cannot answer in time is indistinguishable from one that answers 401.
**Resolution:** fixed 2026-09-19. `timeout: 5000` on the bootstrap call
(`src/api/client.js:92`). Covered by "falls through to the anonymous app when the
refresh never answers" in `tests/browser/session-restore.spec.js`, against a route
that is never fulfilled. Mutation-checked: the test fails when the timeout is
removed. Closed 2026-09-19 by /audit (scope: current): re-read at
`src/api/client.js:92`, the bound is on the call the first render waits on, a
timeout lands in the same `catch` as a 401, and no new defect came with it. The
interceptor's own refresh stayed unbounded, recorded separately as F-05.

### 28/F-02 [P2] closed - The account-change reset has no repeatable test

**File:** src/utils/useFavorites.js:29
**Found:** 2026-09-19 by /audit (scope: current; lens: tests)
**Why it matters:** the per-account set is the guard against one account's
favorites showing to another, and it is the one behavior in this feature with no
committed coverage. The spec deferred it on the grounds that it needs a second
real session; `/check` disproved that by driving the toggle's 401 so the
interceptor refreshed into a different `sub` under a mounted offer page, with the
new account's list held open. That spec passed and was then deleted, so nothing
in `yarn test:browser` fails if the reset regresses.
**Suggested fix:** commit that case into `tests/browser/session-restore.spec.js`:
stub `/users/refresh` to return a token for account A then account B, 401 the
first toggle, hold B's favorites read, and assert the control is disabled with
`aria-pressed="false"` before it lands.
**Resolution:** fixed 2026-09-19. Committed as "shows no hearts from the previous
account after the session changes". The assertion is on the offers list, on a card
that is never clicked: the first draft asserted on the clicked card and passed even
with the guard removed, because the optimistic flip clears that card's state on its
own. The rewritten test fails when the ownership check is removed. Closed 2026-09-19
by /audit (scope: current): both cases re-read in
`tests/browser/session-restore.spec.js`, they assert observable state rather than
implementation, and the suite is green at 77/77.

### 28/F-03 [P3] closed - `hasFailed` and `error` are not scoped to the account

**File:** src/utils/useFavorites.js:30
**Found:** 2026-09-19 by /audit (scope: current; lens: quality)
**Why it matters:** the set now carries the account it belongs to, but the two
sibling states next to it do not. After a session change under a mounted page, a
read failure or a toggle error message raised for the previous account stays on
screen and keeps `isAvailable` false until the new account's read succeeds. It is
cosmetic - no other account's data is shown - but it is the same class of leak
this feature set out to close, sitting two lines away.
**Suggested fix:** derive both from `loaded` the same way, or reset them where
the new account's read resolves. Small, and it can wait for the next favorites
change.
**Resolution:** fixed 2026-09-19. Not deferred: `ids`, `hasFailed` and `error` now
live in one `remembered` record carrying its `userId`, read back through a single
ownership check, and every write goes through `updateMine`. `clearError` keeps its
`[]` dependency list, so the memoized identity `Home` depends on is unchanged.
Closed 2026-09-19 by /audit (scope: current): re-read
`src/utils/useFavorites.js:26-41`. The ownership check covers all three values,
every write goes through `updateMine`, and a flip whose account changed mid-flight
is dropped rather than misapplied. Two semantic drifts were checked and are inert:
the read-success and read-failure paths now also reset `error`, but the read runs
once per `userId`, so neither can fire while an error of the same account is on
screen.

### 28/F-05 [P3] closed - The interceptor's own refresh is still unbounded

**File:** src/api/client.js:60
**Found:** 2026-09-19 by /audit (scope: current; lens: quality, performance)
**Why it matters:** F-01 bounded the bootstrap refresh, leaving two copies of the
same `POST /users/refresh` call in one file with different options. The
interceptor's copy has no timeout, so an API that hangs on a refresh leaves the
retried request pending for good, and with it whatever the page was doing (a
publish stuck on its submitting state, for example). This is pre-existing
behavior from item 10, not something the repair introduced, but the repair is
what made the two copies disagree.
**Suggested fix:** give the interceptor's refresh the same bound, or lift one
shared `requestRefresh()` both call sites use. The second is tidier but touches
the silent-refresh path, which has its own tests; either way the divergence should
not be left implicit.
**Resolution:** fixed 2026-09-19. Both call sites now share one `requestRefresh()`
(`src/api/client.js:49-60`) carrying the bound, so the two copies cannot diverge
again. This does change the silent-refresh path: a refresh that times out now
fails like a 401 and redirects to `/login` rather than hanging. That is the
intended reading, since the request the user asked for cannot proceed either way.
Covered by the existing `silent-token-refresh.spec.js` cases, still green.
Closed 2026-09-19 by /audit (scope: current; independent): re-read
`src/api/client.js:49-60`. One `requestRefresh()` now serves both call sites, so
the bound cannot diverge again, and the bootstrap keeps its own catch rather than
inheriting the interceptor's redirect. The behavior change it carries (a refresh
that times out now logs the visitor out instead of hanging) is deliberate and has
no committed case of its own; recorded under Remaining risk rather than reopened.

### 28/F-06 [P3] closed - Browser fixtures are duplicated across specs

**File:** tests/browser/session-restore.spec.js:15
**Found:** 2026-09-19 by /audit (scope: current; lens: tests)
**Why it matters:** `buildToken` and the `OFFER` fixture are now copied
byte-for-byte from `tests/browser/favorites.spec.js`, while
`tests/browser/fixtures.js` exists for exactly this. The copies encode the live
offer contract (`name`, `details`, `image.secure_url`, `status`); when that
contract next changes, one file will be updated and the other will keep passing
against a shape the app no longer receives.
**Suggested fix:** move `buildToken` and the offer fixture into
`tests/browser/fixtures.js` and import them in both specs. Nothing is lost: the
two specs already agree on every field.
**Resolution:** fixed 2026-09-19. `buildToken`, `USER_ID`, `OTHER_USER_ID`,
`OFFER_ID`, `OTHER_OFFER_ID`, `OFFER` and `OTHER_OFFER` now live in
`tests/browser/fixtures.js`, imported by both specs. One misstep on the way: the
first edit also removed `favorites.spec.js`'s own `USER_ID`, which the extraction
had not replaced; the account ids went into the shared file for the same reason
the offer did.
Closed 2026-09-19 by /audit (scope: current; independent): re-read
`tests/browser/fixtures.js` and both importers. No copy of `buildToken` or the
offer shape is left in a spec, every exported name is used by at least one spec,
and `yarn test:browser` is green at 77/77.

### 28/F-04 [P3] accepted - Every page load spends one refresh-cookie rotation

**File:** src/api/client.js:84
**Found:** 2026-09-19 by /audit (scope: current; lens: security)
**Why it matters:** the overview records that the refresh cookie is rotated on
each `/users/refresh`. The bootstrap now spends a rotation on every page load,
and two tabs opened at once (a middle-click, a restored window) fire two
concurrent refreshes carrying the same cookie. Depending on the backend's reuse
handling, that is either harmless, one tab signed out, or the whole token family
revoked. The backend lives in a separate repository, so its behavior could not be
read here and the risk is a lead, not a confirmed defect.
**Suggested fix:** confirm against the backend how a replayed refresh token is
treated. If it revokes the family, the client needs one in-flight refresh shared
across the page, and the multi-tab case needs a product decision rather than a
client patch.
**Resolution:** accepted 2026-09-19 by the user, after measuring it against the
live backend rather than reasoning about it. Rotation is strict (a replayed
refresh token gets 401), but there is no family revocation: the current cookie
still works after a replay, the winner of a concurrent race keeps its session,
and the account logs in normally afterwards. Worst case is one tab of a
simultaneous pair showing signed out, which a reload repairs. Severity lowered
from P2 to P3. The backend repo is adding a rotation threshold (rotate only once
the token has spent a day of its life), which cuts the race window by about three
orders of magnitude and saves a Mongo write per page load; that work is theirs and
does not block this feature. Two precisions passed back to them: the threshold
makes the race rare rather than impossible, since the read-modify-write is still
unlocked, and frequent rotation was also a crude tamper signal that the threshold
removes.

### 28/F-07 [P3] closed - Clearing the favorites error always allocates a new record

**File:** src/utils/useFavorites.js:135
**Found:** 2026-09-19 by /audit (scope: current; lens: quality, performance; independent)
**Why it matters:** `clearError` and the `updateMine(() => ({ error: null }))` call
in `toggle` both return a fresh object unconditionally, so React can never bail out
the way the old `setError(null)` did when `error` was already `null`. `Home` calls
`clearFavoritesError()` from the offers effect on every search, filter, sort and
page change, so each of those fetches now re-renders the whole offers grid one
extra time for a state value that did not change. Nothing loops (`clearError` keeps
its `[]` dependency list and stays stable), and the cost is small, but it is a
regression the record rewrite introduced and it will grow with the grid.
**Suggested fix:** return `current` unchanged when there is nothing to clear, for
example `setRemembered(current => (current.error === null ? current : { ...current, error: null }))`,
and have `toggle` reuse `clearError` instead of its own `updateMine` write. No
current requirement is lost: the ownership check is unaffected, since a no-op
cannot land on the wrong account either.
**Resolution:** fixed 2026-09-19, exactly as suggested. `clearError` returns
`current` untouched when `error` is already `null` (`src/utils/useFavorites.js:138`),
and `toggle` now calls `clearError()` instead of writing its own record. The
ownership check is untouched: a no-op cannot land on the wrong account either.
Closed 2026-09-19 by /audit (scope: current; independent): re-read
`src/utils/useFavorites.js:104` and `:130-144`. The updater returns `current`
unchanged when `error` is already `null`, so React bails out on `Home`'s
per-fetch `clearFavoritesError()`, and `toggle` has one error write instead of
two. No new defect came with it: dropping the ownership check on this one write
can at most discard an error message, never surface or move another account's
data, and the record's `userId` is left untouched by the clear.

## Independent review

**Status:** passed
**Target commit:** dfc8ea13fa79fa559b2f92c5a2671a1440949b95
**Base commit:** 790244c402321d2507e6935513642bb4173d394b
**Base ref:** master
**Spec hash:** 411d962eb8b40ee38c3b5245d6cabb4b41ef660e54ee7a9896543e9d8b6c81ee
**Spec snapshot:** blueprint/.state/review-specs/dfc8ea13fa79fa559b2f92c5a2671a1440949b95-411d962eb8b40ee38c3b5245d6cabb4b41ef660e54ee7a9896543e9d8b6c81ee.md
**Prepared by:** claude
**Builder model:** claude-opus-5[1m]
**Requested reviewer:** claude
**Requested model:** runtime default (exact model not known until reviewer starts)
**Requested execution:** automatic
**Requested at:** 2026-09-19T23:05:00Z
**Workflow:** regular
**Check required:** no
**Reviewer adapter:** claude
**Reviewer model:** claude-opus-5[1m]
**Reviewer context:** fresh subagent
**Actual execution:** automatic
**Reviewed at:** 2026-09-19T23:45:00Z
**Scope:** current
**Lenses:** quality, security, performance, tests
**Verdict:** passed
**Check result:** not-required

## Commands

- `yarn lint`: pass
- `yarn verify`: pass
- `yarn test:browser`: pass (77/77, including the 5 `session-restore.spec.js` cases)
- `/check`: not run (not required by this request)

## Evidence

- Preconditions verified: `HEAD` equals the target, `git merge-base master <target>` equals the base commit, spec and snapshot both hash to `411d962e...`, `git diff` and `git diff --cached` are empty (0 bytes) and no untracked file exists, so the `git status` modifications are line-ending artifacts only.
- Both ignored inputs are untracked and absent from the index and the target tree (`git ls-files --stage` and `git ls-tree -r` return nothing for either path).
- Reviewed the whole two-commit delta: `src/App.jsx`, `src/api/client.js`, `src/utils/useFavorites.js`, `tests/browser/fixtures.js`, `tests/browser/favorites.spec.js`, `tests/browser/session-restore.spec.js`, plus the consumers needed to judge them (`src/main.jsx`, `src/pages/Home/Home.jsx`, `src/components/FavoriteButton/FavoriteButton.jsx`).
- Security: the access token still lives in memory only, the bootstrap never writes it to a cookie, storage, or a log; `restoreSession` swallows every failure without navigating, so a 401 cannot evict a visitor from the url they opened. The bootstrap uses bare `axios`, so it cannot re-enter the interceptor's refresh-and-redirect path.
- Performance: the first render is held on exactly one bounded (`timeout: 5000`) refresh; `src/main.jsx` has no `StrictMode`, so the mount effect fires once per page load. `clearError` now bails out when `error` is already `null`, so `Home`'s per-fetch clear no longer re-renders the grid.
- Quality: every write to the favorites record goes through the account ownership check (`updateMine`), the one exception being `clearError`, whose worst case is discarding a message rather than surfacing another account's data.
- Tests: the five new browser cases assert observable state (header text, url, `aria-pressed`/`aria-label`, disabled state) rather than implementation; the account-change case asserts on the card that was never clicked, so the optimistic flip cannot make it pass on its own. No skipped, focused, or placeholder tests in the delta.

## Findings

- F-07: closed (the F-07 repair is the tip commit; re-examined and confirmed, no new defect)
- No new findings raised by this pass.

## Remaining risk

- No unit test runner is configured, so all logic evidence is `yarn verify` plus the browser suite. That gap is the project's declared state, not a regression.
- Sharing one bounded `requestRefresh()` also bounds the interceptor's refresh: a refresh that needs more than 5 seconds now fails like a 401 and sends the visitor to `/login` instead of hanging. Deliberate (F-05), but it has no committed case of its own, and on a slow connection it logs a user out where they previously waited.
- The account-change guard is covered only through a synthetic refresh that returns a different `sub`; a real backend rotates into the same account, so production reachability of that path rests on logout rather than on the tested scenario.
- `clearError` keeps its `[]` dependency list and no ownership check, so a session that changes mid-toggle can drop the new account's error message. Unreachable in practice and cosmetic if reached; not recorded as a finding.
- Step 2's live account change was verified by observation during `/check`, not by a test against a second real session.
