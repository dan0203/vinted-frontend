# Feature: Resend confirmation email

**From build-plan:** feature 14
**Build attempt:** 1
**Status:** verified

**Branch:** `feature/resend-confirmation-email`

## Goal

Let a user with an unconfirmed account request a new confirmation email,
reachable from the login page's "account not confirmed" hint and from the
failed/expired confirmation screen, without revealing whether the submitted
email exists.

## In scope

- New page `src/pages/ResendConfirmation/ResendConfirmation.jsx` (+ matching
  `.css`) at route `/resend-confirmation`: single email input, submit button,
  calls `POST /users/confirm/resend` with `{ email }`.
- On success (2xx), replace the form with a confirmation message ("if an
  account exists for this address, an email was sent") instead of redirecting,
  matching the backend's same-response-either-way behavior so the UI never
  implies whether the address is registered.
- On request failure, show the existing `ErrorMessage` component under the
  form (same pattern as Login/Signup/Confirm).
- Link to `/resend-confirmation` from:
  - `Login.jsx`'s existing 403 hint block (`src/pages/Login/Login.jsx:26-31`),
    alongside the current "check your email" text.
  - `Confirm.jsx`'s error branch (`src/pages/Confirm/Confirm.jsx:36-40`),
    alongside the existing "back to login" link.
- New route registered in `src/App.jsx` next to the other auth routes.

## Out of scope

- Forgot-password flow (build-plan item 15, separate backend route).
- Rate limiting or resend cooldown UI - not part of the backend contract
  described for this route; add only if the backend response requires it.
- Any change to `Signup.jsx`'s own post-signup confirmation message.

## Build loop

Per `blueprint/config.json`: `workflow.stepReview` is `feature` (pause for
review after this spec, not after each step) and `checkpointCommits` is
`disabled` (no intermediate commits between steps; `/complete` makes the
single feature commit).

## Build steps

1. [x] **Add the resend-confirmation page and route.**
   - Create `src/pages/ResendConfirmation/ResendConfirmation.jsx`: local
     `email` and `error` state (mirroring `Signup.jsx`'s pattern), a `submitted`
     boolean state, an email `<input>`, a submit handler that posts to
     `import.meta.env.VITE_API_URL + '/users/confirm/resend'` with
     `{ email }`, sets `submitted` on success, and sets `error` (render via
     `ErrorMessage`) on failure. When `submitted` is true, render the generic
     "email sent if the account exists" message instead of the form (same
     `submitted`-gated pattern as `Signup.jsx`).
   - Create `src/pages/ResendConfirmation/ResendConfirmation.css` following
     the existing per-page layout pattern (`main-resend-confirmation`
     wrapper, centered `container`, form width/spacing consistent with
     `Login.css`/`Confirm.css`).
   - Register `<Route path="/resend-confirmation" element={<ResendConfirmation />} />`
     in `src/App.jsx`.
   - All UI copy in French, matching the rest of the app.
   - Done when: `yarn build` succeeds and navigating to `/resend-confirmation`
     renders the email form; submitting shows the confirmation message on a
     successful response and an `ErrorMessage` on a failed one.

2. [x] **Link to the new page from Login and Confirm.**
   - In `Login.jsx`, add a `Link to="/resend-confirmation"` inside the
     existing 403 (`login-hint`) block, right after the current text.
   - In `Confirm.jsx`, add a `Link to="/resend-confirmation"` inside the
     error branch, alongside the existing "Retour à la connexion" link.
   - Done when: `yarn build` succeeds and both links are present in the
     rendered markup (verified by reading the updated JSX; manual browser
     check optional since it requires a live 403/expired-token response from
     `vinted-backend`).

## Files / areas

- `src/pages/ResendConfirmation/ResendConfirmation.jsx` (new)
- `src/pages/ResendConfirmation/ResendConfirmation.css` (new)
- `src/App.jsx` (new route)
- `src/pages/Login/Login.jsx` (add link)
- `src/pages/Confirm/Confirm.jsx` (add link)

## Data / contracts

- `POST /users/confirm/resend`, body `{ email: string }`.
- Per the project overview, the backend returns the same response whether or
  not the email matches an account, so the frontend must not branch on the
  response body - only on request success vs. failure (network/validation
  error via axios `catch`).
- No token or session state involved; this call needs no `Authorization`
  header and no `withCredentials` (unauthenticated route, like `/users/signup`).

## Testing

No test runner configured for logic tests (per `AGENTS.md`). `yarn verify`
(build) is the available automated check; run it after each step. Browser
tests (`yarn test:browser`) are not required for this scope - the success
path is a static confirmation message with no fixture available for a real
403/423/email-exists condition beyond what `Signup`/`Login`/`Confirm` already
cover the same way.

## Notes for the AI

- Reuse the `ErrorMessage` component and the `submitted`-boolean pattern
  already used in `Signup.jsx` - do not introduce a new error-display or
  toast mechanism.
- Keep the confirmation message intentionally non-committal about whether the
  email was found, matching the backend's identical-response behavior; do not
  add client-side "email not found" messaging.
- No `Authorization` header or `withCredentials` needed for this request.


<!-- blueprint:completion {"schemaVersion":1,"specBytes":5439,"specSha256":"af34d56e2957f986a498a3d12a6d8c2daa76a81c5c8ee8e306db205f0de225ea","branch":"refs/heads/feature/resend-confirmation-email","head":"9cfc767446296c6ce5362e14178680e4c7b2b8ce","baseRef":"refs/heads/master","baseCommit":"9cfc767446296c6ce5362e14178680e4c7b2b8ce","sourceTree":"31956f703c11de00b62d86cfc2c5ab9ba451bdc9","absentOptional":[]} -->

## Findings

### 14/F-07 [P1] closed - Login 403 hint edit broke an existing browser test

**File:** src/pages/Login/Login.jsx:26-33
**Found:** 2026-09-18 by /audit (scope: current; lens: tests)
**Why it matters:** Feature 14 (resend confirmation email) rewrote the 403
hint paragraph to append a "renvoyez l'email de confirmation" link, changing
the sentence from ending in a period ("...pour retrouver le lien de
confirmation.") to a comma followed by the new clause
("...confirmation, ou renvoyez l'email de confirmation."). The pre-existing
`tests/browser/login.spec.js:35` ("shows the backend message and a
confirmation hint on a 403 response") asserts the original sentence verbatim
via `getByText`, which is now a substring that no longer exists in the
rendered DOM. Reproduced: `yarn test:browser` fails this exact test with
"element(s) not found" (confirmed both during `/check` and again during this
audit, identical failure both times against unchanged code).
**Suggested fix:** Keep the original sentence intact and add the resend link
as a separate trailing sentence (for example, a second `<p>` or an
unconditional-period first sentence followed by "Vous pouvez aussi
renvoyer l'email de confirmation."), so the existing test's exact-text
assertion keeps matching. Do not edit `login.spec.js` to route around the
regression; the wording changed, not just a test fixture.
**Resolution:** Fixed 2026-09-18 by /implement. `Login.jsx:26-35` now keeps
the original sentence intact ("...pour retrouver le lien de confirmation.")
as its own sentence and adds the resend link in a second sentence ("Vous
pouvez aussi renvoyer l'email de confirmation."). `yarn test:browser` passes
`login.spec.js:35` again (16/16 total). Re-examined 2026-09-18 by /audit
(scope: current; lens: tests): `Login.jsx:26-38` diff confirmed (original
sentence intact, link now a separate trailing sentence), `yarn test:browser`
rerun confirms `login.spec.js:35` passes and no new regression was
introduced. Closed.

### 14/F-08 [P2] closed - New resend-confirmation page has no browser test despite an established, feasible pattern

**File:** src/pages/ResendConfirmation/ResendConfirmation.jsx (new file, no
matching spec added under tests/browser/)
**Found:** 2026-09-18 by /audit (scope: current; lens: tests)
**Why it matters:** `Browser tests` is a declared, opt-in command in this
project (`yarn test:browser`, Playwright), and `Signup.jsx`, `Login.jsx`, and
`Confirm.jsx` each have a matching `tests/browser/*.spec.js` covering their
success/error form-submission paths via `page.route` response mocking. The
new `ResendConfirmation.jsx` has the same shape (email-only form, axios POST,
submitted/ErrorMessage branching) but ships with no equivalent spec file. The
feature spec's Testing section claimed "no fixture available for a real
403/423/email-exists condition," but `/check` demonstrated the opposite: a
`page.route('**/users/confirm/resend', ...)` mock exercises the success
message, the error message, and both new inbound links (from `Login.jsx` and
`Confirm.jsx`) without needing a live backend, matching the existing
`confirm.spec.js`/`login.spec.js` pattern exactly.
**Suggested fix:** Add `tests/browser/resend-confirmation.spec.js` covering:
the form rendering, the success message on a mocked 2xx response, the
`ErrorMessage` on a mocked failure response, and that the `Login.jsx` 403
hint and `Confirm.jsx` error branch each render a working link to
`/resend-confirmation`. `/check` already proved a working version of this
spec during verification; recreate it as a permanent test rather than a
throwaway one.
**Resolution:** Fixed 2026-09-18 by /implement. Added
`tests/browser/resend-confirmation.spec.js`: form render, success message,
error message, and both inbound links (Login 403 hint, Confirm error
branch), all via `page.route` mocks matching the existing pattern. Passes as
part of the full 16/16 `yarn test:browser` run. Re-examined 2026-09-18 by
/audit (scope: current; lens: tests): `tests/browser/resend-confirmation.spec.js`
reviewed line by line, covers form render, success message, error message,
and both inbound links using the same `page.route` pattern as
`confirm.spec.js`/`login.spec.js`, locators correctly scoped (no strict-mode
ambiguity). Closed.
