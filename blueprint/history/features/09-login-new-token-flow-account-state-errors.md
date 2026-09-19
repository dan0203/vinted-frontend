# Feature: Login: new token flow + account-state errors

**From build-plan:** feature 9
**Build attempt:** 1
**Status:** verified
**Branch:** `feature/login-new-token-flow-account-state-errors`

## Goal

Move the access token out of a readable cookie and into in-memory React state
so the app is ready for the httpOnly refresh-cookie flow, and make Login
surface the backend's real 403 (invalid credentials or unconfirmed account)
and 423 (locked account) responses instead of the current generic
`ErrorMessage` fallback.

## In scope

- Lift the auth token out of the `token` cookie (`js-cookie`) into in-memory
  React state owned by `App.jsx`, passed down as a prop, so it is never
  persisted to disk.
- Update every current consumer of `Cookies.get('token')`
  (`Header.jsx`, `Publish.jsx`, `Payment.jsx`) to read the token from that
  prop instead, so those pages keep working under the new storage model.
- `Login.jsx`: send `withCredentials: true` on the login request so the
  browser accepts the backend's httpOnly `refreshToken` cookie.
- `Login.jsx`: on a 423 response, show a fixed French lockout message
  (account locked for 15 minutes after repeated failed attempts) instead of
  the generic fallback.
- `Login.jsx`: on a 403 response, keep showing the backend's message via the
  existing `ErrorMessage` component, and add a static hint suggesting the
  visitor check their email to confirm their account.

## Out of scope

- Actually resending a confirmation email (a working link or form) - that is
  build-plan item 14; item 9 only adds the hint text.
- Restoring a session on page reload/app mount via the refresh cookie - the
  in-memory token is empty after a reload, so the user will appear logged out
  even if the refresh cookie is still valid server-side. This is deferred to
  item 10 (silent token refresh) or later; do not add a mount-time refresh
  call here.
- The 401 -> refresh -> retry interceptor and any shared/central axios
  instance - that cross-cutting request logic is build-plan item 10.
- Signup's handling of its own response (item 12) and the confirmation
  screen itself (item 13) - untouched.
- Removing the now-unused `js-cookie` dependency from `package.json` - it
  becomes unused by this feature but uninstalling it is a separate concern.

## Build loop

Build one small step at a time. Follow `workflow.stepReview` in
`blueprint/config.json` (currently `feature`: one review packet after all
steps). `workflow.checkpointCommits` is `disabled`, so no checkpoint commits
between steps. `/complete` makes the final feature commit. Never accept a
review packet that hasn't been read; split any diff too large to review.

## Build steps

- [x] **Step 1 - Move the token to in-memory state** - In `App.jsx`, add
  `const [token, setToken] = useState(null)`; `handleToken` calls `setToken`
  instead of `Cookies.set`/`Cookies.remove`, and the `js-cookie` import is
  removed. Pass `token` as a prop to `Header`, `Publish`, and `Payment`
  (added to their route elements in `App.jsx`). In `Header.jsx`,
  `Publish.jsx`, and `Payment.jsx`, replace `Cookies.get('token')` with the
  new `token` prop and remove their `js-cookie` imports. Behavior stays the
  same within one session (login sets the token, Publish/Payment/Header see
  it); only the storage location changes.
  *Done when:* `yarn build` and `yarn lint` succeed, and no file under `src`
  still imports `js-cookie` or calls `Cookies.get('token')`.
- [x] **Step 2 - Handle 403/423 on login** - In `Login.jsx`, add
  `withCredentials: true` to the `axios.post` call. In the `catch` block,
  keep storing the raw error in `error` state (no behavior change there).
  In the render, when `error?.response?.status === 423`, show a fixed
  message ("Compte verrouillé pendant 15 minutes après plusieurs tentatives
  échouées. Réessayez plus tard.") in place of `ErrorMessage`. When
  `error?.response?.status === 403`, render `ErrorMessage` as today (it
  already surfaces the backend's message) plus an additional hint paragraph
  ("Si vous n'avez pas encore confirmé votre compte, vérifiez vos emails pour
  retrouver le lien de confirmation."). Any other status keeps rendering
  `ErrorMessage` exactly as today.
  *Done when:* `yarn build` and `yarn lint` succeed, and the three render
  branches (423, 403, other) are visible in `Login.jsx` matching the rules
  above.

## Files / areas

- `src/App.jsx` - token state, `handleToken`, prop wiring.
- `src/components/Header/Header.jsx` - read `token` prop instead of the cookie.
- `src/pages/Publish/Publish.jsx` - read `token` prop instead of the cookie.
- `src/pages/Payment/Payment.jsx` - read `token` prop instead of the cookie.
- `src/pages/Login/Login.jsx` - `withCredentials`, 403/423 rendering.
- `src/pages/Login/Login.css` - style for the new hint paragraph, reusing the
  existing `.error-message` look where the message itself is shown.

## Data / contracts

- `POST /users/login` request/response shape is unchanged (`{ email,
  password }` in, `{ accessToken }` on success). This feature adds
  `withCredentials: true` to the request so the browser stores the backend's
  httpOnly `refreshToken` cookie (`path: /users`) from the response, per the
  documented CORS/credentials contract; the cookie's contents are the
  backend's concern, not this frontend's.
- 423 response: status code alone drives the fixed frontend message; the
  frontend does not depend on the response body having any particular shape.
- 403 response: the frontend continues to render whatever `message` the
  backend sends via the existing generic `ErrorMessage` path (unchanged), and
  layers on a static hint that does not depend on distinguishing "invalid
  credentials" from "unconfirmed account" in the body, since that
  discriminator isn't documented in the reachable project context.
- The access token itself is never written to a cookie, `localStorage`, or
  any other persisted store by this feature; it lives only in `App.jsx`
  React state for the lifetime of the tab.

## Testing

- No unit test runner is configured; this is UI/state wiring with no
  extractable parser/formatter/validator logic, so no unit tests are added.
- `yarn build` and `yarn lint` are the available automated checks; run both
  after each step.
- Browser tests (`yarn test:browser`) are not exercised for this feature:
  reproducing real 403/423 responses needs specific backend account states
  (unconfirmed, locked) that aren't available to set up here; verify those
  branches by code inspection against the rules above instead.

## Notes for the AI

- Do not build the resend-confirmation-email action or route in this
  feature; item 14 owns it. The 403 hint is text only.
- Do not add a refresh call on app mount; a page reload intentionally shows
  the user as logged out under this feature, per Out of scope.
- Do not introduce a shared axios instance or request interceptor; that
  belongs to item 10.
- Keep all new UI text in French, no em dashes.
- `Login.jsx` has a stale commented-out `Cookies.set('token', ...)` line;
  delete it while touching that file. Leave the equivalent comment in
  `Signup.jsx` alone since that file isn't otherwise touched this feature.


<!-- blueprint:completion {"schemaVersion":1,"specBytes":7217,"specSha256":"30a4fa300a833d3743dcaa29d2fa8173380c2df775c1faf46539f2a3b111a30d","branch":"refs/heads/feature/login-new-token-flow-account-state-errors","head":"5eb48024c091632ea3cc7ea348b84a5a0c3b9b84","baseRef":"refs/heads/master","baseCommit":"01c18f5a4d77481efc85f34a40097dcb51cfe1c0","sourceTree":"4b2e02a985cb151d242107064cf9720978e495fb","absentOptional":[]} -->

## Findings

### 9/F-05 [P3] closed - Commented-out dead code left in Signup.jsx

**File:** src/pages/Signup/Signup.jsx:42-43
**Found:** 2026-09-18 by /audit full (scope: full; lens: quality)
**Why it matters:** `coding-standards.md` states "No commented-out code unless
specified." `Signup.jsx` keeps a commented `Cookies.set('token', ...)` and
`setIsConnected(true);` inside its submit handler, a leftover from before
`handleToken` was introduced that no longer describes the current code path
and no longer even names a response field that still exists
(`response.data.token` vs the live `response.data.accessToken`), so it adds
noise without capturing a non-obvious decision.
**Suggested fix:** Delete the two commented-out lines; the surrounding live
code (`handleToken(...)`) already covers the behavior they describe.
**Resolution:** Re-examined 2026-09-18 by /audit independent (scope: current;
lenses: quality, security, performance, tests) against
`01c18f5..3b01578`. Originally filed against three files
(`Header.jsx:32-33`, `Login.jsx:38-39`, `Signup.jsx:42-43`); this delta
touched `Header.jsx` and `Login.jsx` for the token-state migration and, per
`current-feature.md`'s explicit build-step instruction, deleted their
commented-out lines as part of that work (confirmed both files now contain no
`Cookies.set`/`Cookies.remove`/`setIsConnected` comments). `Signup.jsx` was
explicitly left untouched (out of scope for this feature) and still carries
its two dead-code lines, so the finding narrowed to that file only.
**Fixed** 2026-09-18 by `/implement`: deleted the commented `Cookies.set(...)`
and `setIsConnected(true);` lines from `Signup.jsx:42-43` at the user's
explicit request (this finding was originally left out of scope for this
feature's spec). `yarn build` and `yarn lint` pass. Not yet re-reviewed, so
this stays `fixed` rather than `closed` until a later `/audit` pass confirms
the repair.
**Closed** 2026-09-18 by /audit independent (scope: current; lenses: quality,
security, performance, tests) against `01c18f5..5eb4802`, fresh subagent
review. Re-read `src/pages/Signup/Signup.jsx` in full: the submit handler now
goes straight from `handleToken(response.data.accessToken); setError(null);`
to the redirect, no `Cookies.set`/`setIsConnected` comment remains anywhere in
the file, and no new dead code was introduced in its place. Original defect
confirmed gone.

### 9/F-10 [P3] closed - New 423/403 Login error branches have no automated coverage

**File:** src/pages/Login/Login.jsx:18-33
**Found:** 2026-09-18 by /audit independent (scope: current; lens: tests)
**Why it matters:** This delta adds two new conditional render branches keyed
off `error?.response?.status` (423 lockout message, 403 confirmation hint), on
top of the existing generic `ErrorMessage` fallback. A status-code typo (for
example `432` instead of `423`) would silently fall through to the generic
fallback and build, lint, and render without any error. `yarn build` and
`yarn lint` both pass and cannot catch this class of mistake. The feature spec
explicitly defers automated verification here to code inspection because no
backend account can be put into a locked or unconfirmed state in this
environment, mirroring the reasoning already recorded in F-09 for the
route/field migration; `tests/browser/login.spec.js` still only asserts that
the form renders.
**Suggested fix:** Once `tests/browser/login.spec.js` is extended per F-09's
`page.route` interception, add two more cases in the same file: fulfill the
login POST with a 423 response and assert the lockout paragraph renders, and
with a 403 response and assert both `ErrorMessage` and the confirmation hint
render. No live backend or new dependency needed. Low priority: small,
manually verifiable, and browser tests are outside `yarn verify`/CI.
**Resolution:** **Fixed** 2026-09-18 by `/implement`: added `shows the lockout
message on a 423 response` and `shows the backend message and a confirmation
hint on a 403 response` to `tests/browser/login.spec.js`, each mocking
`**/users/login` via `page.route` and asserting the corresponding rendered
message. `yarn test:browser tests/browser/login.spec.js` passes (3/3,
including the pre-existing render test). `yarn build` and `yarn lint` pass.
Not yet re-reviewed, so this stays `fixed` rather than `closed` until a later
`/audit` pass confirms the repair.
**Closed** 2026-09-18 by /audit independent (scope: current; lenses: quality,
security, performance, tests) against `01c18f5..5eb4802`, fresh subagent
review. Re-read `tests/browser/login.spec.js` and `src/pages/Login/Login.jsx`
together: the two new tests correctly mock `**/users/login` with status 423
and 403 respectively and assert exactly the strings `Login.jsx` renders on
those branches. Re-ran `yarn test:browser tests/browser/login.spec.js` in this
review session (not just trusting the ledger's own claim): 3/3 passed,
including both new cases. A status-code typo in `Login.jsx` (e.g. `432`
instead of `423`) would now fail the corresponding test instead of silently
falling through. Original defect (no coverage for these branches) confirmed
gone; no new issue introduced by the test additions.


## Independent review

**Status:** passed
**Target commit:** 5eb48024c091632ea3cc7ea348b84a5a0c3b9b84
**Base commit:** 01c18f5a4d77481efc85f34a40097dcb51cfe1c0
**Base ref:** master
**Spec hash:** 30a4fa300a833d3743dcaa29d2fa8173380c2df775c1faf46539f2a3b111a30d
**Prepared by:** claude
**Builder model:** claude-sonnet-5
**Requested reviewer:** claude
**Requested model:** claude-sonnet-5
**Requested execution:** automatic
**Requested at:** 2026-09-18T12:29:45Z
**Workflow:** regular
**Check required:** no

### Handoff

Review the active spec and the complete `01c18f5a4d77481efc85f34a40097dcb51cfe1c0..5eb48024c091632ea3cc7ea348b84a5a0c3b9b84` delta in a fresh
session or isolated subagent without the builder conversation. Run all Audit lenses from scratch.
Run Check when required above. Do not edit product code, accept findings, or
reuse the existing findings as the review scope.

**Reviewer adapter:** claude
**Reviewer model:** claude-sonnet-5
**Reviewer context:** fresh subagent
**Actual execution:** automatic
**Reviewed at:** 2026-09-18T00:00:00Z
**Scope:** current
**Lenses:** quality, security, performance, tests
**Verdict:** passed
**Check result:** not-required

### Commands

- `yarn build`: pass
- `yarn lint`: pass
- `yarn test:browser tests/browser/login.spec.js`: pass (3/3: pre-existing render test, new 423 lockout test, new 403 message+hint test)

### Evidence

- Full `01c18f5..5eb4802` diff read in one pass: `src/App.jsx`, `src/components/Header/Header.jsx`, `src/pages/Login/Login.css`, `src/pages/Login/Login.jsx`, `src/pages/Payment/Payment.jsx`, `src/pages/Publish/Publish.jsx`, `src/pages/Signup/Signup.jsx`, `tests/browser/login.spec.js`.
- `rg 'js-cookie|Cookies' src` returns no matches: token fully migrated off cookies, satisfying Step 1's done-when.
- `App.jsx`/`Header.jsx`/`Payment.jsx`/`Publish.jsx` all wire the in-memory `token` state/prop exactly per spec; no page persists the token to any storage.
- `Login.jsx` renders the fixed 423 lockout message, the existing `ErrorMessage` plus a 403 hint, and the generic fallback otherwise, matching the spec's three-branch rule; `withCredentials: true` added to the login POST.
- `Signup.jsx` re-read in full: no `Cookies.set`/`setIsConnected` comment remains (F-05).
- `tests/browser/login.spec.js` re-read alongside `Login.jsx`: the two new cases mock `**/users/login` via `page.route` with status 423 and 403 and assert exactly the strings `Login.jsx` renders on those branches (F-10); re-ran the command in this session rather than trusting the ledger's own claim.

### Findings

- None new. F-05 and F-10 re-examined and moved to `closed` in `blueprint/context/findings.md` (see their Resolution entries). F-06 and F-09 are unrelated to this delta and were left untouched.

### Remaining risk

- None identified.
