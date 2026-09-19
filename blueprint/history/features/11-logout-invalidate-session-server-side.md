# Feature: Logout: invalidate session server-side

**From build-plan:** feature 11
**Build attempt:** 1
**Status:** verified
**Branch:** `feature/logout-invalidate-session-server-side`

## Goal

Today's logout ([Header.jsx:26-34](src/components/Header/Header.jsx#L26-L34)) only
clears the in-memory access token via `handleToken(null)`; it never tells the
backend, so the httpOnly `refreshToken` cookie set on login stays valid and
could still mint new access tokens. Add the `POST /users/logout` call so the
backend also ends the session.

## In scope

- Call `POST /users/logout` when the user clicks "Se déconnecter", using the
  shared `client` (src/api/client.js) so the request carries the current
  `Authorization` header and `withCredentials` for the refresh cookie.
- Always clear the local access token and navigate to `/`, whether the backend
  call succeeds or fails, so the user is never stuck logged-in-looking after
  clicking logout.

## Out of scope

- Any change to the login/refresh flow itself (items 9-10, already built).
- A visible error message on logout failure - logout is a best-effort,
  fire-and-forget action from the user's point of view; the local session
  always ends.
- Disabling or debouncing the logout button - out of proportion for a single
  low-frequency action.

## Build loop

Build one small step at a time. Follow `workflow.stepReview` in
`blueprint/config.json`: `feature` produces one review packet after all steps.
`checkpointCommits` is disabled, so no mid-build commits. `/complete` makes the
final feature commit. Never accept a review packet you have not read.

## Build steps

- [x] **Step 1 - Call `POST /users/logout` before clearing local state** - in
  [Header.jsx](src/components/Header/Header.jsx), change the logout `onClick`
  to an async handler that calls `client.post('/users/logout')` (import
  `client` from `../../api/client`), then clears the token via
  `handleToken(null)` and navigates to `/` in a `finally` block so both run
  even if the request rejects (expired/absent session, network error, or the
  401-refresh-retry in the client interceptor also failing). *Done when:*
  clicking "Se déconnecter" while logged in issues a `POST /users/logout`
  request (visible in the browser Network tab) and always returns the header
  to the logged-out state, both when the backend call succeeds and when it's
  forced to fail (e.g. offline).
- [x] **Step 2 - Fix F-11: don't let a dead-session logout redirect to `/login`** -
  the client's response interceptor ([client.js:30-56](src/api/client.js#L30-L56))
  reacts to *any* 401, including on `/users/logout` itself: it retries once
  after a refresh attempt, and on refresh failure calls `setToken(null)` and
  `window.location.assign('/login')` before rethrowing - a full-page navigation
  that can beat the logout handler's own `navigate('/')`. Add an opt-out config
  flag (`skipAuthRedirect`) read by the interceptor's refresh-failure branch,
  and pass it on the logout call only, so a dead session still attempts one
  refresh-and-retry (so a merely-expired access token still reaches the
  backend and invalidates the refresh cookie) but never triggers the hard
  redirect - the logout handler's own `finally` block is the single source of
  truth for where the user lands. *Done when:* logging out with a refresh
  token that also fails to refresh keeps the user on `/` (not `/login`), and
  the existing refresh-retry behavior for every other authenticated request is
  unchanged.
- [x] **Step 3 - Browser coverage for F-10** - add
  `tests/browser/logout.spec.js` with two cases: (1) logging in, then clicking
  "Se déconnecter" issues `POST /users/logout` and the header returns to the
  signed-out state; (2) when `POST /users/logout` and the subsequent
  `/users/refresh` both fail, the header still returns to the signed-out state
  and the page stays on `/` (covering step 2's fix). *Done when:*
  `yarn test:browser` passes with both new cases.

## Files / areas

- `src/components/Header/Header.jsx` - logout click handler.
- `src/api/client.js` - response interceptor's refresh-failure redirect.
- `tests/browser/logout.spec.js` - new browser coverage.

## Data / contracts

- `POST /users/logout` - authenticated (`Authorization: Bearer <accessToken>`
  set automatically by the `client` request interceptor) plus
  `withCredentials: true` (already the default on `client`) so the
  `refreshToken` cookie (`path: /users`) reaches the backend to be
  invalidated. Response body is not used; the local flow proceeds identically
  on success or failure.

## Testing

- No unit test runner is configured (per `AGENTS.md`), so this is verified by
  the build (`yarn build`) plus manual/browser evidence: log in, open the
  Network tab, click "Se déconnecter", confirm the `POST /users/logout`
  request fires and the header switches back to the signed-out (S'inscrire /
  Se connecter) state. Also verify the signed-out state is reached when the
  request fails (throttle to offline in devtools before clicking).
- No new parser/formatter/validator logic is introduced, so no unit test is
  owed per the Testing gate in `coding-standards.md`.
- Step 2 adds `tests/browser/logout.spec.js` (Playwright, `yarn test:browser`),
  covering the two states named in F-10: successful logout and a failed
  logout request, matching the existing `tests/browser/*.spec.js` pattern.

## Notes for the AI

- Use `client` from `src/api/client.js`, not raw `axios`, so the request
  automatically gets the `Authorization` header and `withCredentials` - do not
  duplicate that wiring inline (see how [Publish.jsx](src/pages/Publish/Publish.jsx#L39)
  already does this for an authenticated call).
- Do not let a 401/refresh failure from the client's response interceptor (see
  [client.js:50-54](src/api/client.js#L50-L54), which itself calls
  `window.location.assign('/login')` on refresh failure) block the local
  logout cleanup - the `finally` block must still run.
- Keep the click handler's try/catch minimal: catch and discard the logout
  request's error, no logging or UI surfacing needed.


<!-- blueprint:completion {"schemaVersion":1,"specBytes":6122,"specSha256":"2c5677ec6109441050bfb2e7a5732b13a86f77a9dfa6ad56a0370ce31cee7f1b","branch":"refs/heads/feature/logout-invalidate-session-server-side","head":"5e6ff9efffb3b0e62dfc8ff7103406b854fa6785","baseRef":"refs/heads/master","baseCommit":"63a4da2773ac6ad33a53521eab7db63e0f72b96f","sourceTree":"761a8cc6e4b7edaf9ad2db0738c91a1e43ade0b0","absentOptional":[]} -->

## Findings

### 11/F-09 [P3] closed - Migrated auth route and token field have no automated coverage despite an existing browser harness

**File:** tests/browser/login.spec.js:1-11
**Found:** 2026-09-18 by /audit independent (scope: current; lens: tests)
**Why it matters:** This feature's auth half is a pure contract change: the POST
target moved to `/users/login` / `/users/signup` and the success field moved to
`response.data.accessToken`. Both are silent failures if wrong (a typo'd route
or field name builds, lints, and renders, then simply never logs the user in).
The project does declare a browser-test command (`yarn test:browser`, Playwright,
`tests/browser/`) and `login.spec.js` already exists, but it only asserts that
the form renders; nothing asserts the request URL or the field read from the
response. The frozen spec's Testing section states "No `Browser tests` command is
declared", which does not match `AGENTS.md`, so the harness was not considered.
`yarn build` and `yarn lint` both pass and cannot catch this class of error.
**Suggested fix:** Extend `tests/browser/login.spec.js` with a `page.route`
interception that asserts the login POST goes to `**/users/login` and fulfills it
with `{ accessToken: '...' }`, then asserts the header switches to the logged-in
state. This needs no live backend and no new dependency. Low priority: the change
is small and manually verifiable, and browser tests are outside `yarn verify`/CI.
**Resolution:** Closed 2026-09-18 by /audit independent (scope: current; lenses:
quality, security, performance, tests) against `63a4da2..1f3600d`.
`tests/browser/login.spec.js` no longer only asserts that the form renders: its
423 and 403 cases intercept `**/users/login` with `page.route`, so a wrong
POST target would leave the route unmatched and fail the assertions, which is the
URL assertion the finding asked for. `tests/browser/silent-token-refresh.spec.js`
fulfills login with `{ accessToken: ... }` and then asserts the retried request
carries `Bearer refreshed-access-token`, so the response field name is exercised
end to end. `yarn test:browser` runs 5 tests, all passing. The original gap is
gone; the separate absence of logout coverage is tracked as F-10, not as this
entry staying open.

### 11/F-10 [P3] closed - Logout's server-side invalidation has no browser coverage although the harness and a near-identical precedent exist

**File:** src/components/Header/Header.jsx:29-38
**Found:** 2026-09-18 by /audit independent (scope: current; lens: tests)
**Why it matters:** The whole point of this feature is that a click now reaches
`POST /users/logout` so the httpOnly `refreshToken` cookie is invalidated
server-side. A wrong route string is a silent failure: the app still builds,
lints, logs the user out locally, and looks correct, while the session stays
mintable. `yarn build` and `yarn lint` cannot catch it. The spec's Testing
section calls a Playwright test "not warranted for this single-button, one-step
change", but the repository has since established exactly this pattern:
`tests/browser/` already holds 5 passing tests, and
`silent-token-refresh.spec.js` already logs in through an intercepted
`**/users/login` and drives an authenticated flow, so a logout case is a short
addition to an existing helper rather than new machinery.
`coding-standards.md` also names flows that "click, type, submit, navigate" as
the ones where browser evidence matters most. Severity stays P3: the change is
one line of behavior, manually verifiable, and browser tests are outside
`yarn verify` and CI.
**Suggested fix:** Add one case to `tests/browser/` that reuses the existing
login-via-`page.route` helper, intercepts `**/users/logout`, clicks
"Se déconnecter", and asserts both that the interception fired and that the
header returns to the `S'inscrire` / `Se connecter` state. No live backend and
no new dependency needed.
**Resolution:** Fixed 2026-09-18 by `/implement`. Added
`tests/browser/logout.spec.js` with the suggested case (intercepts
`**/users/logout`, clicks "Se déconnecter", asserts the request fired and the
header returns to the signed-out state) plus a second case for the F-11 fix
(logout and refresh both fail, header still returns to signed-out and the URL
stays `/`). `yarn test:browser` passes all 7 tests. Not yet re-reviewed by
`/audit`, so left `fixed` rather than `closed`.
Closed 2026-09-18 by /audit independent (scope: current; lenses: quality,
security, performance, tests) against `63a4da2..5e6ff9e`. Re-examined the
repaired code: `tests/browser/logout.spec.js:21-37` intercepts
`**/users/logout` through `page.route`, logs in via the same intercepted
`**/users/login` pattern the other specs use, clicks "Se déconnecter", and
asserts both that the interception fired (`expect(logoutRequested).toBe(true)`)
and that the header is back to the `S'inscrire` / `Se connecter` state. A wrong
route string would leave the route unmatched and fail that assertion, which is
exactly the silent failure the finding described. `yarn test:browser` runs 7
tests, all passing, including the two new logout cases. The spec-local `login`
helper duplicates the login steps of `silent-token-refresh.spec.js`, but that
per-file helper shape is the repository's existing pattern
(`login.spec.js:13` has its own `submitLogin`), so it is not drift and gets no
new entry. Original gap gone; no new defect introduced by the repair.

### 11/F-11 [P3] closed - Logging out with an already-dead session lands the user on /login instead of /

**File:** src/components/Header/Header.jsx:29-38, src/api/client.js:50-53
**Found:** 2026-09-18 by /audit independent (scope: current; lens: quality)
**Why it matters:** When the access token is expired and the refresh cookie is
gone or rejected, `client.post('/users/logout')` returns 401, the response
interceptor attempts a refresh, and on failure it runs `setToken(null)` plus
`window.location.assign('/login')` before rethrowing. The handler's `finally`
does run (`handleToken(null)` and `navigate('/')` both execute, which is what
the spec asked for), but the already-queued full-page `assign('/login')` then
wins over the SPA `navigate('/')`, so clicking "Se déconnecter" can drop the
user on the login page rather than the home page. The user is correctly logged
out either way, which is why this is a rough edge and not a defect in the
feature's security goal. The existing test
`tests/browser/silent-token-refresh.spec.js:61` confirms the interceptor really
does redirect to `/login` on refresh failure, but no test exercises that path
through the logout button, and the ordering was not reproduced in a browser
during this review, so this stays `unverified` rather than `open`.
**Suggested fix:** If the landing page matters, have the logout handler skip the
refresh-retry path for this one request (for example by marking the request so
the interceptor rethrows a 401 instead of refreshing) so the `finally` block's
`navigate('/')` is the only navigation. Confirm the behavior in the browser
first: if landing on `/login` after a dead-session logout is acceptable, mark
this `accepted` instead, since both outcomes leave the user signed out.
**Resolution:** Fixed 2026-09-18 by `/implement`. Added a `skipAuthRedirect`
config flag read by the response interceptor's refresh-failure branch
([client.js:30-56](src/api/client.js#L30-L56)); the logout call passes
`{ skipAuthRedirect: true }` so a dead session still attempts one
refresh-and-retry but never triggers `window.location.assign('/login')` - the
handler's own `finally` (`navigate('/')`) is the only navigation. Covered by
the second case in `tests/browser/logout.spec.js` (logout and refresh both
fail, asserts the URL stays `/`). Not yet re-reviewed by `/audit`, so left
`fixed` rather than `closed`.
Closed 2026-09-18 by /audit independent (scope: current; lenses: quality,
security, performance, tests) against `63a4da2..5e6ff9e`. Re-examined the
repair and confirmed it holds:
`src/api/client.js:52-54` now guards the refresh-failure redirect with
`if (!originalRequest.skipAuthRedirect)`, and `Header.jsx:31` is the only
caller that sets it (`rg skipAuthRedirect` finds exactly those two sites), so
every other authenticated request keeps the previous refresh-retry-then-redirect
behavior - `tests/browser/silent-token-refresh.spec.js:61` still passes and
still asserts the `/login` redirect on refresh failure. The flag really reaches
the interceptor: axios 1.20.0's `mergeConfig` falls back to
`mergeDeepProperties` for keys outside its `mergeMap`
(`node_modules/axios/lib/core/mergeConfig.js:154`), so the custom key survives
into `error.config`, and it survives the `client(originalRequest)` retry merge
as well. Behavior confirmed end to end by
`tests/browser/logout.spec.js:39-55` (logout 401 plus refresh 401 leaves the
header signed out and the URL matching `/\/$/`, which `.../login` would not
satisfy); all 7 browser tests pass. The refresh attempt itself is deliberately
preserved so a merely-expired access token still reaches the backend, matching
spec step 2. No new defect found in the repaired paths: `setToken(null)` still
runs on refresh failure, so no stale auth state survives, and the handler's
`finally` remains the single navigation.

## Independent review

**Status:** passed
**Target commit:** 5e6ff9efffb3b0e62dfc8ff7103406b854fa6785
**Base commit:** 63a4da2773ac6ad33a53521eab7db63e0f72b96f
**Base ref:** master
**Spec hash:** 2c5677ec6109441050bfb2e7a5732b13a86f77a9dfa6ad56a0370ce31cee7f1b
**Spec snapshot:** blueprint/.state/review-specs/5e6ff9efffb3b0e62dfc8ff7103406b854fa6785-2c5677ec6109441050bfb2e7a5732b13a86f77a9dfa6ad56a0370ce31cee7f1b.md
**Prepared by:** claude
**Builder model:** claude-sonnet-5
**Requested reviewer:** claude
**Requested model:** claude-opus-5
**Requested execution:** automatic
**Requested at:** 2026-09-18T14:12:48.000Z
**Workflow:** regular
**Check required:** no

**Reviewer adapter:** claude
**Reviewer model:** claude-opus-5
**Reviewer context:** fresh subagent
**Actual execution:** automatic
**Reviewed at:** 2026-09-18T14:15:09.000Z
**Scope:** current
**Lenses:** quality, security, performance, tests
**Verdict:** passed
**Check result:** not-required

### Commands

- `git rev-parse HEAD` / `git merge-base master HEAD` / `git status --porcelain -uall`: pass (HEAD equals the target, merge base equals the recorded base, working tree clean)
- `sha256sum blueprint/context/current-feature.md` and the recorded snapshot: pass (both raw files hash to the recorded spec hash; both ignored via `.gitignore:35`, absent from the index and from the target tree, and both are ordinary files)
- `yarn lint`: pass (eslint, no warnings)
- `yarn build`: pass (vite build, 128 modules, built in 1.91s)
- `yarn test:browser`: pass (playwright, 7 tests, 7 passed, including the two new logout cases)

### Evidence

- Delta reviewed: `63a4da2..5e6ff9e`, 3 files, +68/-4: `src/api/client.js`, `src/components/Header/Header.jsx`, `tests/browser/logout.spec.js` (new). `blueprint/context/review.md` and `blueprint/context/findings.md` excluded from the code scope.
- `src/api/client.js:52-54`: the refresh-failure branch still calls `setToken(null)` unconditionally and now guards only `window.location.assign('/login')` behind `!originalRequest.skipAuthRedirect`, so the opt-out cannot leave stale auth state behind.
- `rg skipAuthRedirect src tests`: exactly two sites, the interceptor guard and the single logout caller, so the opt-out has no unintended blast radius; `tests/browser/silent-token-refresh.spec.js:61` still passes and still proves the unchanged `/login` redirect for every other authenticated request.
- Flag propagation verified against the installed dependency, not assumed: axios 1.20.0 `mergeConfig` uses `mergeDeepProperties` for any key outside `mergeMap` (`node_modules/axios/lib/core/mergeConfig.js:154`), so `skipAuthRedirect` reaches `error.config` and survives the `client(originalRequest)` retry merge.
- `tests/browser/logout.spec.js:21-37` asserts the `**/users/logout` interception fired and the header returns to `S'inscrire` / `Se connecter`; `:39-55` drives logout 401 plus refresh 401 and asserts the URL still matches `/\/$/`, which `/login` would not satisfy.
- Spec conformance: all three build steps in the frozen spec are satisfied; the retry-before-giving-up behavior required by step 2 is preserved (a merely-expired access token still reaches `POST /users/logout`).
- Security lens: no secret, no hard-coded host, no new trust boundary. The flag is client-side presentation only; the httpOnly refresh cookie still travels via the instance-level `withCredentials`.
- Performance lens: one extra `POST /users/refresh` plus one logout retry on a dead session, bounded by `_retried` to a single attempt, on a low-frequency user action.

### Findings

- F-10: closed (browser coverage for the logout call now exists and passes; original silent-failure gap gone)
- F-11: closed (dead-session logout no longer races a hard `/login` redirect against the handler's `navigate('/')`)
- No new findings in this delta across any of the four lenses.

### Remaining risk

- No unit test runner is configured in this project (`AGENTS.md`), so the `yarn verify` gate is build-only; no unit-level command was available to run.
- `yarn test:browser` is outside `yarn verify` and CI, so the logout coverage that closes F-10 does not gate pull requests.
- `tests/browser/logout.spec.js:54` asserts the URL with an auto-retrying `toHaveURL(/\/$/)`. It correctly fails today on a `/login` redirect, but a hypothetical future regression where the redirect lands after the SPA navigation could be observed late rather than never; the assertion is a state check, not a "no navigation occurred" check.
- F-06 (P3, `unverified`) remains in the ledger and was not re-examined: its files are outside this delta.
- No live backend was exercised; server-side invalidation of the refresh cookie by `POST /users/logout` is asserted at the request boundary only, with a mocked response.
