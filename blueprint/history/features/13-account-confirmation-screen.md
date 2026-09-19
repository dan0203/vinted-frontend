# Feature: Account confirmation screen

**From build-plan:** feature 13
**Build attempt:** 1
**Status:** verified

**Branch:** `feature/account-confirmation-screen`

## Goal

Add a `/confirm/:token` route that calls `GET /users/confirm/:token` on load
and shows the visitor whether their account is now activated or the link is
invalid/expired, since accounts are created inactive (build-plan item 12) and
following this emailed link is how they become usable for login.

## In scope

- New page `src/pages/Confirm/Confirm.jsx` + `src/pages/Confirm/Confirm.css`,
  registered as `<Route path="/confirm/:token" element={<Confirm />} />` in
  `src/App.jsx`.
- On mount, read `token` via `useParams` and call
  `axios.get(import.meta.env.VITE_API_URL + '/users/confirm/' + token)`,
  following the existing unauthenticated-GET pattern in `Offer.jsx` (plain
  `axios`, not the authenticated `client.js` instance, since this call needs
  no `Authorization` header or refresh cookie).
- Three renderable states, matching the app's existing loading wording
  (`Offer.jsx`'s "Chargement en cours..."):
  - **Loading** while the request is in flight.
  - **Success** (request resolves without throwing): a confirmation message
    ("Votre compte est activé ! Vous pouvez maintenant vous connecter.") and
    a `Link` to `/login`.
  - **Error** (request throws): render `ErrorMessage` for the backend's
    `error.response?.data?.message` (falls back to its existing generic
    message when absent) and a `Link` to `/login`.
- Reuse the shared `container` class for the page wrapper, consistent with
  every other page.

## Out of scope

- The resend-confirmation form/request itself (build-plan item 14, `POST
  /users/confirm/resend`). Item 14 already describes itself as "reachable
  from login and from the failed-confirmation screen", meaning this feature
  only needs to exist as that future landing point; it does not add the
  `/confirm/resend` route or call. The error state's link goes to `/login`
  (which already shows a confirmation hint on a 403) rather than to a route
  that doesn't exist yet.
- Any change to `Login.jsx` or `Signup.jsx`.
- Auto-login or auto-redirect after a successful confirmation. `GET
  /users/confirm/:token` is not documented to return an `accessToken`, and
  the plan only asks for a status message; the visitor still logs in
  normally afterward.
- Distinguishing "invalid" from "expired" with different copy. The build-plan
  item groups them ("invalid/expired"), and no response shape distinguishes
  them is documented; both render the same error state driven by whatever
  message the backend returns (or the generic fallback).
- Any change to `api/client.js`, the refresh interceptor, or `withCredentials`
  handling; this call carries no auth state.

## Build loop

Build one small step at a time. Follow `workflow.stepReview` in
`blueprint/config.json` (currently `feature`: one review packet after all
steps). `workflow.checkpointCommits` is `disabled`, so no checkpoint commits
between steps. `/complete` makes the final feature commit. Never accept a
review packet that hasn't been read; split any diff too large to review.

## Build steps

- [x] **Step 1 - Add the `/confirm/:token` route and page** - Create
  `src/pages/Confirm/Confirm.jsx`: `useParams` for `token`, `useState` for
  `isLoading` (default `true`) and `error` (default `null`), a `useEffect`
  keyed on `token` that calls `axios.get(import.meta.env.VITE_API_URL +
  '/users/confirm/' + token)`, sets `isLoading` to `false` on both success
  and failure, and sets `error` on failure. Render `"Chargement en
  cours..."` while loading; otherwise render the success message and
  `/login` link when `error` is `null`, or `ErrorMessage` plus the `/login`
  link when it is set. Add `src/pages/Confirm/Confirm.css` following
  `Login.css`'s `.main-login .container` structure (use `.main-confirm`).
  Import `Confirm` in `src/App.jsx` and add the route. *Done when:* `yarn
  build` and `yarn lint` succeed, and visiting `/confirm/anytoken` with a
  mocked 200 response shows the activated message and login link, while a
  mocked 400 response shows the error message and login link.
- [x] **Step 2 - Browser coverage** - Add `tests/browser/confirm.spec.js`
  following the existing pattern in `tests/browser/login.spec.js`: one test
  that mocks `**/users/confirm/*` with a 200 and asserts the activated
  message and a link to `/login` are visible; one test that mocks it with a
  400 (`{ message: 'Lien de confirmation invalide ou expiré.' }`) and asserts
  that message and the `/login` link are visible instead. *Done when:* `yarn
  test:browser tests/browser/confirm.spec.js` passes.

## Files / areas

- `src/pages/Confirm/Confirm.jsx` - new page.
- `src/pages/Confirm/Confirm.css` - new styles.
- `src/App.jsx` - add the `/confirm/:token` route.
- `tests/browser/confirm.spec.js` - new browser test file.

## Data / contracts

- `GET /users/confirm/:token` - no request body. Success/failure is detected
  the same way as every other call in this app: the promise resolving means
  activated, throwing means invalid/expired. No specific success response
  body is required to render the success state (a static French message is
  shown); a failure's `error.response.data.message` is shown via the
  existing `ErrorMessage` component when present, otherwise its built-in
  generic fallback.
- No new fields are added to the `User` data model by this feature; it only
  triggers the backend's existing activation side effect on `active`.

## Testing

- No unit test runner is configured, and this feature has no
  parser/formatter/validator logic, so no unit tests are added.
- `yarn build` and `yarn lint` are the available automated checks; run both
  after each step.
- `Browser tests` (`yarn test:browser`) is declared in `AGENTS.md`, so add
  the coverage in Step 2; run `yarn test:browser tests/browser/confirm.spec.js`
  before considering that step done.

## Notes for the AI

- Do not build the resend-confirmation form or route; that is build-plan
  item 14, which will wire its own link into this screen later.
- Keep all new UI text in French, no em dashes.
- Match the existing unauthenticated-GET style (`Offer.jsx`), not the
  `client.js` axios instance, since no auth header or refresh cookie is
  involved.


<!-- blueprint:completion {"schemaVersion":1,"specBytes":6338,"specSha256":"5939d99da739ae30fc3c2921c98a8dbe4a1e2cf628a7c9ea8fbfeee13cecbb64","branch":"refs/heads/feature/account-confirmation-screen","head":"08c1bd1daee513d1f576b166fe3dac94c44549cc","baseRef":"refs/heads/master","baseCommit":"98167d4903aa32751ea716aa890428c125a7aedb","sourceTree":"50e01a6082dc692ccb631a2fd0bddbff4837db26","absentOptional":[]} -->

## Independent review

**Status:** passed
**Target commit:** 08c1bd1daee513d1f576b166fe3dac94c44549cc
**Base commit:** 98167d4903aa32751ea716aa890428c125a7aedb
**Base ref:** refs/heads/master
**Spec hash:** 5939d99da739ae30fc3c2921c98a8dbe4a1e2cf628a7c9ea8fbfeee13cecbb64
**Spec snapshot:** blueprint/.state/review-specs/08c1bd1daee513d1f576b166fe3dac94c44549cc-5939d99da739ae30fc3c2921c98a8dbe4a1e2cf628a7c9ea8fbfeee13cecbb64.md
**Prepared by:** claude
**Builder model:** claude-sonnet-5
**Requested reviewer:** claude
**Requested model:** runtime default (exact model not known until reviewer starts)
**Requested execution:** automatic
**Requested at:** 2026-09-18T00:00:00Z
**Workflow:** regular
**Check required:** no

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

- `git rev-parse HEAD`: pass (matches Target commit)
- `git merge-base refs/heads/master 08c1bd1daee513d1f576b166fe3dac94c44549cc`: pass (matches Base commit)
- `git status --porcelain=v1`: pass (only pre-existing unstaged `src/pages/Signup/Signup.jsx` diff, unrelated to this feature and predating this branch; no other path differs from the target)
- `sha256sum` of spec snapshot and `blueprint/context/current-feature.md`: pass (both hash to the recorded Spec hash and are byte-identical)
- `yarn build`: pass
- `yarn lint`: pass
- `yarn test:browser tests/browser/confirm.spec.js`: pass (2 passed)

### Evidence

- Reviewed the complete `98167d49..08c1bd1d` delta (amended after review to drop an AI attribution trailer from the commit message; tree, parent, and reviewed content are unchanged): `src/App.jsx` (route addition), `src/pages/Confirm/Confirm.jsx` and `Confirm.css` (new page), `tests/browser/confirm.spec.js` (new browser test).
- `Confirm.jsx` matches the spec: `useParams` for `token`, `useState` for `isLoading`/`error`, a `useEffect` keyed on `token` calling plain `axios.get(VITE_API_URL + '/users/confirm/' + token)` (no auth header, matching the `Offer.jsx` unauthenticated-GET pattern), loading/success/error states with the exact required copy, `Link` to `/login` in both success and error states, and the shared `container` class.
- Error rendering goes through the existing `ErrorMessage` component (`src/components/ErrorMessage/ErrorMessage.jsx`), which reads `error.response.data.message` safely via optional chaining and falls back to a generic message; React's JSX text rendering means neither that message nor the `token` route param can execute as markup/script, so no unsafe-rendering issue exists.
- `Confirm.css` follows `Login.css`'s `.main-login .container` structure with `.main-confirm .container`, consistent with sibling pages.
- No unused imports, no dead code, no commented-out code; UI text is French with no em dashes.
- `tests/browser/confirm.spec.js` follows the same `page.route` mock + `getByText`/`getByRole` assertion pattern as `tests/browser/login.spec.js`, and its two cases (200 success, 400 error) match the spec's Step 2 done-when exactly; both pass.
- Compared against `findings.md`: the one open entry (F-06, Home/Offer state-mutation in render) is unrelated to any file touched in this delta, so it was not re-examined and remains untouched.

### Findings

- None

### Remaining risk

- None identified
