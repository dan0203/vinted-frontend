# Feature: Silent token refresh

**From build-plan:** feature 10
**Build attempt:** 1
**Status:** verified
**Branch:** feature/silent-token-refresh

## Goal

When an authenticated request fails with 401 because the in-memory access
token expired, transparently refresh it via the backend's httpOnly refresh
cookie and replay the original request, so the user only sees a `/login`
redirect if the refresh itself also fails.

## In scope

- A shared axios client (`src/api/client.js`) with:
  - a request interceptor that attaches `Authorization: Bearer <token>` from
    a module-level token store (not a React prop), since the interceptor
    runs outside the render cycle.
  - a response interceptor that, on a single 401 from that client, calls
    `POST /users/refresh` (`withCredentials: true`, no body - the refresh
    token travels as the httpOnly cookie), stores the new `accessToken` from
    the response body (same field name the existing `/users/login` response
    uses), retries the original request exactly once with the new token, and
    returns that retried response to the original caller.
  - on refresh failure (any error response from `/users/refresh`), clears
    the stored token and hard-redirects to `/login` via
    `window.location.assign`, then rethrows the original 401 so the caller's
    existing catch block still runs. A full redirect, not a react-router
    `navigate()`, is required here: react-router v7 schedules navigation
    state updates through `startTransition`, and `Publish.jsx`'s own
    unauthenticated guard (`token ? form : <Navigate to="/" />`) reacts to
    the same token going `null` with its own transition-scheduled redirect
    to `/`; the two compete for the same location state with no reliable
    ordering, and the guard's redirect to `/` was consistently winning over
    an SPA-level `navigate('/login')` in testing. A hard redirect sidesteps
    the race entirely by unmounting the whole app.
- A token store (`getToken`, `setToken`, `subscribeToken`) inside
  `src/api/client.js` that both the interceptor and `App.jsx` read from, so
  React state and the interceptor's outside-of-render access stay in sync.
- `App.jsx`: `token` state is seeded from and kept in sync with the store
  (`subscribeToken`) instead of being the sole owner of the value;
  `handleToken` becomes a thin call into the store's `setToken`.
- `Publish.jsx`: the only existing authenticated call
  (`POST /offers/publish`) switches from a raw `axios.post` with a
  hand-built `Authorization` header to the shared `client`, so it gains the
  refresh behavior for free and drops the now-redundant manual header.
- A browser test covering: (a) a 401 on the authenticated request followed
  by a successful `/users/refresh` transparently retries and succeeds, and
  (b) a 401 on the authenticated request followed by a failing
  `/users/refresh` clears the session and lands the user on `/login`.

## Out of scope

- Any change to `/users/login`, `/users/signup`, or `CheckoutForm`'s
  unrelated external payment call - none of them are authenticated requests
  and none of them go through the new client.
- Logout calling `POST /users/logout` server-side (item 11).
- Improving what `Publish.jsx` shows on a final (non-401 or post-retry)
  error - it still only logs to the console today; that belongs to item 16
  (consistent loading/error states) and item 20 (publish success feedback),
  not this feature.
- Persisting the token across a page reload (localStorage/sessionStorage).
  The token is deliberately in-memory only per item 9; this feature only
  covers refreshing it silently within a single page session, not surviving
  a reload.
- Preserving the page the user was on across the forced `/login` redirect
  (no `state: { from }`); no existing contract requires it and Publish's own
  unauthenticated guard already redirects to `/` on load, not `/login`.

## Build loop

Single build step; `workflow.stepReview` is `feature`, so pause for review
after the step instead of after each of the substeps within it.
`workflow.checkpointCommits` is `disabled`, so `/complete` makes the one
feature commit.

## Build steps

- [x] 1. Add the shared axios client with the token store, request/response
      interceptors, and refresh-retry logic; wire `App.jsx` to the store;
      switch `Publish.jsx` to the shared client; add the two browser-test
      cases.
      **Done when:** `yarn verify` passes, `yarn lint` passes, and
      `yarn test:browser` passes including the two new cases (transparent
      refresh-and-retry succeeds; failed refresh clears the session and
      redirects to `/login`).

## Files / areas

- `src/api/client.js` (new) - axios instance, token store, interceptors.
- `src/App.jsx` - token state sourced from the store via `subscribeToken`.
- `src/pages/Publish/Publish.jsx` - use the shared client instead of a raw
  `axios.post` with a manual `Authorization` header.
- `tests/browser/` - new spec for the refresh-and-retry and
  refresh-fails-redirects cases (file naming and structure following the
  existing `login.spec.js`).

## Data / contracts

- `POST /users/refresh` - httpOnly refresh cookie sent via
  `withCredentials: true`; no request body. Success response carries a new
  `accessToken` field, matching the field name `/users/login` and
  `/users/signup` already return. Any error response (401/403/etc.) is
  treated as "refresh failed" - no need to branch on the exact status.
- The retried original request reuses its existing method, URL, body, and
  headers, with only `Authorization` swapped to the new token.
- A request is retried at most once. A second 401 after the retry (e.g. the
  refreshed token is itself rejected) is not retried again and surfaces to
  the caller as the (second) 401 error, avoiding a retry loop.

## Testing

- `yarn verify` (build) and `yarn lint` - both must keep passing.
- `yarn test:browser` (Playwright): two new cases in a browser spec,
  mocking `**/offers/publish` and `**/users/refresh` with `page.route`,
  following the existing mocking pattern in `tests/browser/login.spec.js`:
  1. Log in (mocked `/users/login` success), attempt a publish that first
     gets a mocked 401, then a mocked `/users/refresh` 200 with a new
     `accessToken`, then a mocked 200 on the retried publish - assert the
     retried request carried the new token and the user sees the
     publish succeed, with no navigation to `/login`.
  2. Same setup, but `/users/refresh` is mocked to fail - assert the app
     navigates to `/login`.
- No unit test runner is configured in this project; interceptor logic is
  covered through the browser tests above instead.

## Notes for the AI

- The token store is a plain module-level variable plus a `Set` of
  subscriber callbacks - not a state-management library. It exists only
  because an axios interceptor runs outside React's render cycle and needs
  synchronous read/write access to the current token; `App.jsx` still owns
  the token for rendering purposes via `useState` + `subscribeToken`, per
  this project's "plain useState/useEffect, no global state library" rule.
- Keep `withCredentials: true` on both the shared client and the standalone
  refresh call - the backend's CORS config only accepts credentialed
  requests and the refresh cookie is scoped `path: /users`.
- Do not add a de-duplication/in-flight-refresh guard for concurrent 401s -
  today there is exactly one authenticated call site (`Publish.jsx`), so
  there is no reachable case of two requests refreshing at once; add that
  guard only when a second concurrent authenticated call site exists.
- Use French copy for anything user-visible; this feature adds no new
  user-visible text beyond the existing `/login` page and Publish's
  existing unauthenticated redirect, so no new strings are expected.

## Independent review

**Status:** passed
**Target commit:** 576b584491c3fdfcea0411fb21b6b9ac6829ca89
**Base commit:** de0bd792c81a8072177323f36ed8d28c8fe4b995
**Base ref:** master
**Spec hash:** ffa71fe828fb3c8ae64361bc75be73f05a6e9ffa9e0d07ac1bcbd211734a1c98
**Prepared by:** claude
**Builder model:** claude-sonnet-5
**Requested reviewer:** claude
**Requested model:** runtime default (exact model not known until reviewer starts)
**Requested execution:** automatic
**Requested at:** 2026-09-18T12:53:46Z
**Workflow:** regular
**Check required:** no

**Reviewer adapter:** claude
**Reviewer model:** claude-sonnet-5
**Reviewer context:** fresh subagent
**Actual execution:** automatic
**Reviewed at:** 2026-09-18T12:58:51Z
**Scope:** current
**Lenses:** quality, security, performance, tests
**Verdict:** passed
**Check result:** not-required

### Commands

- `git rev-parse HEAD` / `git merge-base master HEAD` / `git status --porcelain=v1 --untracked-files=all` / `sha256sum blueprint/context/current-feature.md`: pass (freshness confirmed: HEAD == Target commit, merge-base == Base commit, clean tree, spec hash matches)
- `yarn lint`: pass
- `yarn build`: pass
- `yarn test:browser` (Playwright, 5 specs incl. both new silent-refresh cases): pass

### Evidence

- Full `de0bd79..576b584` diff reviewed (`src/App.jsx`, `src/api/client.js` new, `src/pages/Publish/Publish.jsx`, `tests/browser/silent-token-refresh.spec.js` new; 4 files, +140/-13) against `blueprint/context/current-feature.md`'s spec: request interceptor attaches `Authorization` from the module-level token store; response interceptor refreshes on a single 401 via a raw `axios.post('/users/refresh', {}, { withCredentials: true })` (bypassing `client` to avoid interceptor recursion), stores the new `accessToken`, retries the original request exactly once via `originalRequest._retried` guard, and on refresh failure clears the token, hard-redirects with `window.location.assign('/login')`, then rethrows the original 401 (the outer `error`, not the refresh error) so the caller's catch still runs - matches the spec's stated race-avoidance rationale for using a hard redirect over `navigate()`.
- `App.jsx` seeds `token` from `getToken()` and syncs via `subscribeToken` in a `useEffect` with proper cleanup; `handleToken` is now a thin call into `setStoredToken`.
- `Publish.jsx` now posts through `client` with no manual `Authorization` header; unused `axios` import removed (confirmed by clean lint).
- Playwright test 1 asserts the retried `/offers/publish` request carries `Bearer refreshed-access-token` and the page stays on `/publish` with no `/login` navigation; test 2 asserts navigation to `/login` when `/users/refresh` itself fails. Both ran green against the real dev server.
- Second-401-after-retry is not retried again: `originalRequest._retried` is already `true` on the re-entrant interceptor call, so it throws immediately - matches the spec's "at most once" retry contract.
- No de-duplication/in-flight-refresh guard was added, matching the spec's explicit instruction not to add one (single call site today).
- `F-06` (Home/Offer.jsx) and `F-09` (login.spec.js) files are outside this diff's touched files; not re-examined, left unchanged.

### Findings

- None

### Remaining risk

- None identified
