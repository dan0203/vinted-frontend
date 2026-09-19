# Feature: Forgot password flow

**From build-plan:** feature 15
**Build attempt:** 1
**Branch:** feature/forgot-password-flow
**Status:** verified

## Goal

Let a user who forgot their password request a reset code by email, then use
that code to set a new password, without needing to be logged in.

## In scope

- A "Mot de passe oublié ?" link on the Login page.
- A request step: email-only form that calls `POST /users/reset/request`.
- A confirm step: code + new password form that calls `POST /users/reset/confirm`.
- Loading, success, and error feedback for both steps, including the case
  where the code is wrong or expired.
- A link back to Login from both steps.

## Out of scope

- Changing password while already logged in (no backend route for that yet -
  see build-plan item 24's note).
- Rate limiting or resend-code UX beyond what the backend itself enforces.
- Any change to the login/signup/confirm flows themselves beyond the one new
  link on Login.

## Build loop

Follow `workflow.stepReview: "feature"` - pause for review after each step
below. Checkpoint commits are disabled (`workflow.checkpointCommits:
"disabled"`), so do not commit mid-feature; `/complete` makes the final commit.

## Build steps

1. **Add the `ResetPassword` page skeleton and route.**
   - Create `src/pages/ResetPassword/ResetPassword.jsx` and
     `src/pages/ResetPassword/ResetPassword.css`, following the structure of
     `src/pages/ResendConfirmation/ResendConfirmation.jsx` (same `main`/`container`
     layout, same CSS class-naming pattern scoped under `.main-reset-password`).
   - Register `<Route path="/reset-password" element={<ResetPassword />} />` in
     `src/App.jsx`, alongside the other public auth routes.
   - Render just the heading and an empty shell for now (no form logic yet).
   - Done when: `yarn build` succeeds and navigating to `/reset-password` in
     the dev server renders the page shell.

2. **Implement the request step (email -> code sent).**
   - Add local state (`email`, `error`, `step` or equivalent) and a form that
     posts `{ email }` to `import.meta.env.VITE_API_URL + '/users/reset/request'`
     with plain `axios` (unauthenticated call, matching `ResendConfirmation.jsx`
     and `Confirm.jsx`, not the `client.js` wrapper).
   - On success, advance to the confirm step (do not reveal whether the email
     existed, matching the existing resend-confirmation copy pattern: "Si un
     compte existe pour cette adresse...").
   - Show `ErrorMessage` on failure and keep the user on the request step.
   - Done when: submitting a request in the dev server (against a real or
     mocked backend response) shows the "code sent" transition, and a failed
     request shows an error without losing the entered email.

3. **Implement the confirm step (code + new password -> reset).**
   - Add a second form with `code`, `password`, and a password-confirmation
     field. Client-side, block submit when the two password fields do not
     match and show that as a local validation message.
   - On submit, post `{ code, password }` to
     `import.meta.env.VITE_API_URL + '/users/reset/confirm'` with plain `axios`.
   - On success, show a confirmation message with a `Link` to `/login` (do not
     auto-log-in, since login still requires the user to submit credentials
     themselves - matches the Signup-after-confirmation precedent).
   - On failure (wrong/expired code), show `ErrorMessage` and keep the user on
     the confirm step with their entered code/password preserved.
   - Done when: a mismatched-password submission is blocked client-side with a
     visible message, and a submit that reaches the backend shows success or
     `ErrorMessage` per response.

4. **Link the flow from Login.**
   - Add a "Mot de passe oublié ?" `Link` to `/reset-password` in
     `src/pages/Login/Login.jsx`, near the existing `/signup` link.
   - Done when: the link renders on `/login` and navigates to
     `/reset-password`.

## Files / areas

- `src/pages/ResetPassword/ResetPassword.jsx` (new)
- `src/pages/ResetPassword/ResetPassword.css` (new)
- `src/App.jsx` (add route)
- `src/pages/Login/Login.jsx` (add link)
- Reuses `src/components/ErrorMessage/ErrorMessage.jsx` as-is.

## Data / contracts

- `POST /users/reset/request` - body `{ email }`. Unauthenticated. Response
  shape not otherwise consumed (success/failure only); treat any 2xx as
  success and any non-2xx as an `ErrorMessage`-rendered failure, matching the
  `ResendConfirmation` and `Confirm` pages' existing error handling.
- `POST /users/reset/confirm` - body `{ token, password }` (confirmed against
  `vinted-backend`'s `routes/user.route.js:244-276`; the field is named
  `token` even though its content is the plain-text code emailed to the user -
  `utils/email.js:52-74` sends it as inline text, not a clickable link, since
  confirming a reset also requires POSTing the new password in the same
  request, which a mail client can't do on its own). Unauthenticated. Same
  success/failure handling as above.
- Neither call uses `client.js` (no access token exists for a logged-out
  user) and neither needs `withCredentials`, matching `ResendConfirmation.jsx`
  and `Confirm.jsx`.

## Testing

- No test runner is configured for logic tests
  (`verification.logicTests: "when-configured"` in `blueprint/config.json`);
  none added.
- No browser-test command is declared as part of this project's automated
  suite beyond the manual `yarn test:browser` Playwright harness, and adding
  new scripted coverage for a two-step form is disproportionate for this
  feature; verify manually in the dev server per the steps' `Done when`
  criteria.
- Run `yarn build` after each step (`verification.uiEvidence:
  "when-available"` - no live backend is available in this environment, so UI
  evidence is manual dev-server navigation only, not full end-to-end
  submission against `vinted-backend`).

## Notes for the AI

- Match existing patterns exactly: unauthenticated pages use raw `axios` with
  `import.meta.env.VITE_API_URL`, not the `client.js` wrapper (that wrapper's
  401-refresh interceptor is for authenticated calls only and would be wrong
  here).
- Keep the two steps as one page/route (`/reset-password`) rather than two
  routes. The backend contract calls it a "code", not a URL token like
  `/confirm/:token`, implying the user copies/types the code manually - a
  single page with an internal step toggle matches the existing
  `ResendConfirmation` single-page pattern and needs no route param.
- UI copy in French, no em dashes, consistent with the rest of the app.
- Do not add a "resend code" affordance beyond re-submitting the request form
  again from the confirm step's back-link - no such endpoint distinction
  exists in the contract.


<!-- blueprint:completion {"schemaVersion":1,"specBytes":6789,"specSha256":"ddd5b71274c2e75fd4394ae5d8387c8160d3cb3ac58bba52fe8addb84ef7863b","branch":"refs/heads/feature/forgot-password-flow","head":"9a0e57a8c44908f390f7f00dfb59e9b8985e269e","baseRef":"refs/heads/master","baseCommit":"b36657c8a86fa777d00f96a436a532e6a6673505","sourceTree":"1de56ce753516de83c5d6d0da7ef6fe1713f6364","absentOptional":[]} -->

## Findings

### 15/F-07 [P2] closed - No browser-test coverage for the new reset-password flow

**File:** src/pages/ResetPassword/ResetPassword.jsx (missing: tests/browser/reset-password.spec.js)
**Found:** 2026-09-18 by /audit (scope: current; lens: tests)
**Why it matters:** `AGENTS.md` declares `Browser tests: yarn test:browser`
(Playwright, `tests/browser/`), and coding-standards.md's Browser Verification
section says to add focused coverage for stable behavioral done-whens once
that command is declared, when proportionate. Every other page in this auth
family with stable behavioral done-whens already has a matching spec file
(`login.spec.js`, `signup.spec.js`, `confirm.spec.js`,
`resend-confirmation.spec.js`), each covering the render, a mocked-success
transition, and a mocked-error message - the same shape this new two-step page
needs. `current-feature.md`'s Testing section states "No browser-test command
is declared as part of this project's automated suite" - that is factually
wrong (the command is declared at `AGENTS.md:62`) and appears to be why
`/implement` skipped writing coverage. The feature was instead verified during
`/check` with an ad hoc Playwright script run against the real local backend
and deleted afterward, so none of that evidence is repeatable or part of the
suite.
**Suggested fix:** Add `tests/browser/reset-password.spec.js` mirroring
`resend-confirmation.spec.js`: render the request form, mock a successful
`POST /users/reset/request` and assert the transition to the token/password
step, mock a failed request and assert `ErrorMessage` renders, submit
mismatched passwords and assert the client-side mismatch message, and mock a
failed `POST /users/reset/confirm` and assert the backend error renders. This
is proportional to the existing sibling specs, not new tooling.
**Resolution:** Added `tests/browser/reset-password.spec.js` 2026-09-18 by
`/implement`, mirroring `resend-confirmation.spec.js`: renders the request
form, transitions to the token/password step on a mocked success, shows
`ErrorMessage` on a mocked request failure, blocks submit client-side on
mismatched passwords, shows `ErrorMessage` on a mocked confirm failure, shows
the success screen and its `/login` link on a mocked confirm success, and
checks the Login page's link to `/reset-password`. `yarn test:browser` - all
23 specs pass (7 new). `yarn lint` clean. Marked `fixed`, not `closed`; needs a
review pass to close.
Re-reviewed 2026-09-18 by `/audit` (scope: current; lenses: quality, security,
performance, tests) against the working tree at merge base `b36657c`.
`tests/browser/reset-password.spec.js` covers the render, request
success/error, client-side mismatch block, confirm success/error, and the
Login link - matches the shape and isolation of the sibling specs (no shared
state, no time/order dependence, no excessive mocking). Re-ran `yarn lint`
(clean), `yarn verify`/`vite build` (passes), and `yarn test:browser` (23/23
pass, including all 7 new cases). Original gap confirmed closed; no new defect
introduced. Closed.
Re-confirmed 2026-09-18 by /audit independent (scope: current; lenses: quality,
security, performance, tests) against `b36657c..4f7fe6c`: the spec file is part
of the reviewed delta and `yarn test:browser` passes 23/23, including all 7
reset-password cases. Status unchanged.

### 15/F-08 [P2] closed - Reset-password forms have no loading or disabled state while a request is in flight

**File:** src/pages/ResetPassword/ResetPassword.jsx:23-38, src/pages/ResetPassword/ResetPassword.jsx:66-87
**Found:** 2026-09-18 by /audit independent (scope: current; lens: quality)
**Why it matters:** `current-feature.md`'s In scope lists "Loading, success, and
error feedback for both steps", but neither submit handler tracks an in-flight
state: the buttons stay enabled and nothing indicates work is happening while
`axios.post` is pending. Success and error feedback are both implemented, so
this is the one declared in-scope item with no implementation. The project
already has the pattern to reuse: `CheckoutForm.jsx:18,85` keeps an `isLoading`
flag and passes `disabled={... || isLoading}` to its submit button, and
`Confirm`/`Home`/`Offer` render a `Chargement en cours...` paragraph. Beyond the
missing feedback, nothing prevents a second submit: repeated clicks on "Recevoir
le code" fire repeated `POST /users/reset/request` calls, and on a slow link a
second click on "Reinitialiser le mot de passe" fires a duplicate
`POST /users/reset/confirm`. Whether a duplicate request invalidates the first
emailed code is backend behavior that was not verified here, so the concrete
consequence is unconfirmed; the missing in-scope feedback itself is confirmed by
reading the file. The sibling auth forms (`Login`, `Signup`,
`ResendConfirmation`) share the gap, so this is not a regression, but their specs
did not declare loading feedback and this one does.
**Suggested fix:** Add one `isSubmitting` state to the page, set it around both
`axios.post` calls in `try`/`finally`, and use it to disable the two submit
buttons, mirroring `CheckoutForm.jsx`. No new dependency or abstraction is
needed.
**Resolution:** Fixed 2026-09-18 by `/implement`. Added `isSubmitting` state,
set in `try`/`finally` around both `axios.post` calls, and passed to
`disabled` on both submit buttons, matching `CheckoutForm.jsx`'s pattern.
`yarn lint` clean, `yarn verify` passes, `yarn test:browser` 24/24. Marked
`fixed`, not `closed`; needs a review pass to close.
Re-reviewed 2026-09-18 by /audit independent (scope: current; lenses: quality,
security, performance, tests) against `b36657c..4f3f4f1`. Confirmed at
`ResetPassword.jsx:15` (`isSubmitting` state), `:28`/`:39-41` (request handler
sets it before the call and clears it in `finally`), `:82`/`:92-94` (confirm
handler does the same, and the client-side mismatch early return at `:77-80`
correctly never sets it), and `:57`/`:128` (both submit buttons take
`disabled={isSubmitting}`). This matches `CheckoutForm.jsx:18,85` and removes the
double-submit path the finding described. `yarn lint` clean, `yarn verify`
passes, `yarn test:browser` 24/24. Original defect gone, no new defect in the
repair. Closed. The in-flight state is now correct but still invisible (the
button keeps its custom background and `cursor: pointer` while disabled);
recorded separately as F-12 rather than holding this entry open.

### 15/F-09 [P3] closed - Confirm step asserts a code was sent, dropping the spec's non-disclosure wording

**File:** src/pages/ResetPassword/ResetPassword.jsx:89
**Found:** 2026-09-18 by /audit independent (scope: current; lens: security)
**Why it matters:** Build step 2 says the success transition must "not reveal
whether the email existed, matching the existing resend-confirmation copy
pattern: 'Si un compte existe pour cette adresse...'". The implemented confirm
step instead opens with "Saisissez le code recu par email et votre nouveau mot
de passe.", which states as fact that a code was sent to the address the user
typed. The flow does not actually enumerate accounts by itself (the transition
depends only on a 2xx, and `ResendConfirmation.jsx:17-20` is the hedged-copy
precedent), so this is wording drift from the verified spec rather than a
working enumeration oracle, hence P3 and not a security break. It does mislead a
user who typed an address with no account into waiting for an email that will
never arrive.
**Suggested fix:** Reword the confirm-step intro in the hedged form the spec
names, for example "Si un compte existe pour cette adresse, un code vient de lui
etre envoye. Saisissez-le ci-dessous avec votre nouveau mot de passe." Copy-only
change, French, no em dashes.
**Resolution:** Fixed 2026-09-18 by `/implement`. Reworded the confirm-step
intro to "Si un compte existe pour cette adresse, un code vient de lui être
envoyé. Saisissez-le ci-dessous avec votre nouveau mot de passe.", matching
the hedged `ResendConfirmation.jsx` pattern. Copy-only change. `yarn
test:browser` 24/24. Marked `fixed`, not `closed`; needs a review pass to
close.
Re-reviewed 2026-09-18 by /audit independent (scope: current; lenses: quality,
security, performance, tests) against `b36657c..4f3f4f1`. `ResetPassword.jsx:97-100`
now reads "Si un compte existe pour cette adresse, un code vient de lui être
envoyé. Saisissez-le ci-dessous avec votre nouveau mot de passe.", the hedged
form build step 2 requires and the same pattern as
`ResendConfirmation.jsx:17-20`. French, no em dashes, copy-only. No other copy
regressed. Closed.

### 15/F-10 [P3] closed - Client-side mismatch message and a stale backend error can show at once

**File:** src/pages/ResetPassword/ResetPassword.jsx:60-65, src/pages/ResetPassword/ResetPassword.jsx:70-74
**Found:** 2026-09-18 by /audit independent (scope: current; lens: quality)
**Why it matters:** `passwordMismatch` is only recomputed on submit and `error`
is only cleared on a successful call, so two stale-feedback cases are reachable
on the confirm step. After a failed `POST /users/reset/confirm` (for example an
expired code), a follow-up submit with mismatched passwords returns early at
line 72 without clearing `error`, leaving the backend message and "Les mots de
passe ne correspondent pas." stacked as two contradictory errors. And once the
mismatch message appears it stays visible while the user corrects the fields,
until the next submit. Cosmetic only: the guard itself is correct and no wrong
request is sent.
**Suggested fix:** Clear `error` (and optionally `passwordMismatch`) at the top
of the confirm handler before branching, and reset `passwordMismatch` in the two
password `onChange` handlers.
**Resolution:** Fixed 2026-09-18 by `/implement`. The confirm handler now
clears both `error` and `passwordMismatch` at the top before branching, so a
later mismatched submit no longer stacks a stale backend error with the
mismatch message. Added a regression test
(`tests/browser/reset-password.spec.js`: "clears the stale backend error when
a later submit mismatches") asserting the old error text is gone once the
mismatch message shows. `yarn test:browser` 24/24. Marked `fixed`, not
`closed`; needs a review pass to close.
Re-reviewed 2026-09-18 by /audit independent (scope: current; lenses: quality,
security, performance, tests) against `b36657c..4f3f4f1`. Confirmed at
`ResetPassword.jsx:74-80`: the confirm handler calls `setError(null)` and
`setPasswordMismatch(false)` before the mismatch branch, so the stacked
backend-error-plus-mismatch state the finding titled is unreachable, and the
regression test at `tests/browser/reset-password.spec.js:89-117` asserts both
the mismatch message and `toHaveCount(0)` for the old backend text. Verified
passing in `yarn test:browser` 24/24. Titled defect gone, repair introduced no
new one. Closed. The finding's secondary, explicitly optional half (the mismatch
message persisting while the user corrects the fields) was not implemented and
is now tracked as F-11.

### 15/F-11 [P3] closed - Mismatch message stays visible while the user corrects the password fields

**File:** src/pages/ResetPassword/ResetPassword.jsx:110-127
**Found:** 2026-09-18 by /audit independent (scope: current; lens: quality)
**Why it matters:** `passwordMismatch` is set only in the submit handler and
cleared only at the top of the next submit, and neither password `onChange`
(lines 115-117 and 124-126) resets it. After a blocked mismatched submit, "Les
mots de passe ne correspondent pas." stays on screen while the user retypes the
confirmation field, so the form reads as still invalid even once both values
match. This is the residual half of F-10, which the repair did not cover.
Cosmetic only: the guard itself is correct, state is recomputed on every submit,
and no wrong request is sent.
**Suggested fix:** Call `setPasswordMismatch(false)` in the `password` and
`confirmPassword` `onChange` handlers, the remaining half of F-10's suggested
fix. No new state or abstraction needed.
**Resolution:** Fixed 2026-09-18 by `/implement`. Both password `onChange`
handlers now call `setPasswordMismatch(false)`. Added a regression assertion
in the existing "blocks submit client-side" test confirming the message
disappears once the confirm field matches. `yarn test:browser` 25/25. Marked
`fixed`, not `closed`; needs a review pass to close.
Re-reviewed 2026-09-18 by /audit independent (scope: current; lenses: quality,
security, performance, tests) against `b36657c..9a0e57a`. Confirmed at
`ResetPassword.jsx:115-118` (the `password` `onChange` calls `setPassword` then
`setPasswordMismatch(false)`) and `:125-128` (the `confirmPassword` `onChange`
does the same), so the message clears on the first keystroke in either field
rather than waiting for the next submit. The submit handler still recomputes the
guard at `:74-80`, so no invalid submit becomes reachable through the added
clear. Regression coverage at `tests/browser/reset-password.spec.js:63-64`
asserts `toHaveCount(0)` once the confirm field is corrected, and it passes in
`yarn test:browser` 25/25. Original defect gone, repair introduced no new one.
Closed.

### 15/F-12 [P3] closed - Disabled submit buttons give no visible in-flight feedback

**File:** src/pages/ResetPassword/ResetPassword.css:20-28
**Found:** 2026-09-18 by /audit independent (scope: current; lens: quality)
**Why it matters:** `current-feature.md`'s In scope lists "Loading, success, and
error feedback for both steps". F-08's repair added the correct `isSubmitting`
state and `disabled` attributes, which removes the double-submit path, but the
page has no `:disabled` rule and `.main-reset-password form > button` sets an
explicit `background-color`, `color`, and `cursor: pointer`. Those custom values
override the browser's default disabled appearance, so while a request is in
flight the button looks and feels exactly as it did before: same color, same
pointer cursor, same label. A user on a slow link gets no signal that the submit
was accepted. The project already has both halves of the pattern to reuse: the
`.loading` paragraph ("Chargement en cours...") in `Confirm.jsx:35`,
`Home.jsx:28`, and `Offer.jsx:37`. Confirmed by reading the stylesheet, not by
timing a real slow request, but the CSS has no disabled selector at all.
**Suggested fix:** Add a `.main-reset-password form > button:disabled` rule
(muted background plus `cursor: default`), or swap the button label to a
loading string while `isSubmitting`. Pure styling/copy change, no new dependency.
**Resolution:** Fixed 2026-09-18 by `/implement`. Added
`.main-reset-password form > button:disabled` (muted background/border,
`cursor: not-allowed`). Added a regression test
("disables the submit button while the request is in flight") that delays the
mocked response and asserts the button is disabled mid-flight. `yarn
test:browser` 25/25. Marked `fixed`, not `closed`; needs a review pass to
close.
Re-reviewed 2026-09-18 by /audit independent (scope: current; lenses: quality,
security, performance, tests) against `b36657c..9a0e57a`. Confirmed at
`ResetPassword.css:30-34`: `> button:disabled` inside the
`.main-reset-password form` nesting block sets `background-color: #a8d9dc`,
`border-color: #a8d9dc`, and `cursor: not-allowed`. Its extra pseudo-class beats
the base `> button` rule at `:20-28`, so the muted style wins while
`isSubmitting` is true, and both submit buttons (`ResetPassword.jsx:57` and
`:130`) carry `disabled={isSubmitting}`. Native CSS nesting compiles cleanly
(`yarn verify` passes) and the in-flight state is asserted by
`tests/browser/reset-password.spec.js:67-79`, passing in `yarn test:browser`
25/25. Original defect gone, repair introduced no new one. Closed. One
observation not worth its own entry: the disabled button keeps `color: #fff`
over the muted `#a8d9dc`, so the label itself is low-contrast while in flight.
WCAG 1.4.3 exempts inactive controls and the state change is clearly visible,
which is what this finding asked for.

## Independent review

# Independent Review

**Status:** passed
**Target commit:** 9a0e57a8c44908f390f7f00dfb59e9b8985e269e
**Base commit:** b36657c8a86fa777d00f96a436a532e6a6673505
**Base ref:** refs/heads/master
**Spec hash:** ddd5b71274c2e75fd4394ae5d8387c8160d3cb3ac58bba52fe8addb84ef7863b
**Prepared by:** claude
**Builder model:** claude-sonnet-5
**Requested reviewer:** claude
**Requested model:** claude-opus-5
**Requested execution:** automatic
**Requested at:** 2026-09-18T00:00:00.000Z
**Workflow:** regular
**Check required:** no
**Reviewer adapter:** claude
**Reviewer model:** claude-opus-5
**Reviewer context:** fresh subagent
**Actual execution:** automatic
**Reviewed at:** 2026-09-18T00:00:00.000Z
**Scope:** current
**Lenses:** quality, security, performance, tests
**Verdict:** passed
**Check result:** not-required

## Commands

- `git rev-parse HEAD`: pass (matches Target commit)
- `git merge-base refs/heads/master HEAD`: pass (matches Base commit)
- `sha256sum blueprint/context/current-feature.md`: pass (matches Spec hash)
- `git status --porcelain`: pass (clean; no path differs from the target)
- `yarn lint`: pass
- `yarn verify` (`vite build`): pass
- `yarn test:browser`: pass (25/25, including all 9 reset-password specs)

## Evidence

- Reviewed the complete `b36657c8..9a0e57a8` delta: 5 files, 378 insertions, no
  deletions - `src/pages/ResetPassword/ResetPassword.jsx` (new, 149 lines),
  `src/pages/ResetPassword/ResetPassword.css` (new), `src/App.jsx` (one import,
  one route), `src/pages/Login/Login.jsx` (one link), and
  `tests/browser/reset-password.spec.js` (new, 9 specs).
- Quality: the page follows the `ResendConfirmation.jsx` structure the spec
  named (same `main`/`container` layout, classes scoped under
  `.main-reset-password`, plain `useState`, raw `axios`, no `client.js`
  wrapper). All four build steps are implemented: route at `App.jsx:41`, request
  step at `ResetPassword.jsx:21-61`, confirm step at `:62-134`, success screen
  at `:135-143`, Login link at `Login.jsx:90`. UI copy is French with no em
  dashes. One layout drift found and recorded as F-13.
- Security: both calls go to `import.meta.env.VITE_API_URL` with no hard-coded
  host or secret; no token, code, or password is logged or persisted; the
  request step's success transition depends only on a 2xx and the confirm-step
  copy at `:97-100` keeps the non-disclosure wording, so the flow is not an
  account-enumeration oracle; the reset body is `{ token, password }`, matching
  the contract the spec verified against the backend route. No new trust
  boundary is introduced (the page is unauthenticated by design).
- Performance: no effects, no polling, no fetch on render; the two `axios.post`
  calls fire only on submit and `isSubmitting` closes the double-submit path.
  Nothing unbounded.
- Tests: `tests/browser/reset-password.spec.js` covers request render, request
  success transition, request failure, client-side mismatch block plus its
  clear-on-edit, in-flight disabled button, confirm failure, stale-error
  clearing, confirm success with the `/login` link, and the Login link. All
  network is mocked via `page.route`; no shared state, no `test.skip`, no
  `test.only`, no placeholder assertions.
- F-11 repair verified at `ResetPassword.jsx:115-118` and `:125-128`; F-12
  repair verified at `ResetPassword.css:30-34`. Both closed in the ledger.

## Findings

- F-13 [P3] open - Login's two footer links render with no spacing between them
- F-11 [P3] closed - mismatch clearing on edit confirmed
- F-12 [P3] closed - disabled-button styling confirmed

## Remaining risk

- No unit-test runner is configured (`verification.logicTests:
  "when-configured"`), so there is no logic-level coverage command to run; the
  page carries no pure logic beyond the mismatch comparison, which the browser
  suite exercises.
- `yarn test:browser` is not part of `yarn verify` or CI, so this delta's only
  automated behavioral coverage runs on demand rather than on every push.
- No live backend is available in this environment, so both endpoints were
  exercised only against `page.route` mocks. Real backend responses for
  `POST /users/reset/request` and `POST /users/reset/confirm` (including
  whether a repeat request invalidates a previously emailed code) remain
  unverified end to end.
- The "disables the submit button while the request is in flight" spec races a
  300 ms delayed mock against the assertion. It passed here, but it is timing
  dependent by construction and is the most flake-prone spec in the file.
- The disabled submit button keeps `color: #fff` over the muted `#a8d9dc`
  background, leaving the label low-contrast while in flight. WCAG 1.4.3
  exempts inactive controls, so this is recorded as an observation under F-12
  rather than a finding.
