# Feature: Signup: handle inactive-account response

**From build-plan:** feature 12
**Build attempt:** 1
**Status:** verified

**Branch:** `feature/signup-handle-inactive-account-response`

## Goal

On a successful signup, stop logging the visitor in and redirecting to Home.
Show a "check your email" confirmation message instead, since the account is
created inactive and the backend refuses login until the emailed
confirmation link is followed.

## In scope

- `Signup.jsx`: on a successful `POST /users/signup` (still identified by the
  existing `response.data.accessToken` check, matching the same
  success-detection the endpoint already uses), stop calling `handleToken`
  and stop navigating to `/`. Instead set a `submitted` state and render a
  confirmation message in place of the form.
- Confirmation message text (French, matching existing app tone): "Merci de
  votre inscription ! Un email de confirmation vous a été envoyé, cliquez sur
  le lien qu'il contient pour activer votre compte."
- Keep the existing `ErrorMessage` rendering and `error` state for the
  failure path; only the success path changes.

## Out of scope

- Calling `handleToken` with the returned `accessToken` at all: the account
  is inactive immediately after signup and login is refused until confirmed
  (per feature 9 and the documented `active` field), so this feature never
  stores or uses that token, avoiding an authenticated session tied to an
  account the backend does not yet consider usable. If a later feature needs
  that token for something else, it can be revisited then.
- The `/confirm/:token` screen itself (build-plan item 13).
- Resending the confirmation email (build-plan item 14).
- Any change to the signup request payload, route, or the `ErrorMessage`
  component.

## Build loop

Build one small step at a time. Follow `workflow.stepReview` in
`blueprint/config.json` (currently `feature`: one review packet after all
steps). `workflow.checkpointCommits` is `disabled`, so no checkpoint commits
between steps. `/complete` makes the final feature commit. Never accept a
review packet that hasn't been read; split any diff too large to review.

## Build steps

- [x] **Step 1 - Show a confirmation message instead of auto-login** - In
  `src/pages/Signup/Signup.jsx`, add `const [submitted, setSubmitted] =
  useState(false)`. In the submit handler's success branch
  (`response.data.accessToken` truthy), remove the `handleToken(...)` call
  and the `navigate('/')` call, and instead call `setSubmitted(true)` and
  `setError(null)`. In the render, when `submitted` is `true`, show the
  confirmation paragraph ("Merci de votre inscription ! Un email de
  confirmation vous a été envoyé, cliquez sur le lien qu'il contient pour
  activer votre compte.") instead of the form and the "Tu as déjà un compte ?"
  link; when `submitted` is `false`, render the form exactly as today.
  *Done when:* `yarn build` and `yarn lint` succeed, and submitting the form
  with a mocked 201 response replaces the form with the confirmation message
  without navigating away from `/signup`.
- [x] **Step 2 - Browser coverage** - Add `tests/browser/signup.spec.js`
  following the existing pattern in `tests/browser/login.spec.js`: one test
  asserting the signup form renders (heading, username/email/password
  inputs, submit button), and one test that mocks `**/users/signup` with a
  201 response (`{ accessToken: 'token' }`) and asserts the confirmation
  message is visible and the form inputs are gone.
  *Done when:* `yarn test:browser tests/browser/signup.spec.js` passes.

## Files / areas

- `src/pages/Signup/Signup.jsx` - submit handler and render logic.
- `tests/browser/signup.spec.js` - new browser test file.

## Data / contracts

- `POST /users/signup` request/response shape is unchanged: `{ email,
  username, password, newsletter }` in, `{ accessToken }` on success (201).
  This feature only changes what the frontend does with that response; it
  does not change the request or add new fields.
- The returned `accessToken` is not stored anywhere (not in state, a cookie,
  or `localStorage`) by this feature. See Out of scope for why.
- No new route is added; the visitor stays on `/signup` after a successful
  submission.

## Testing

- No unit test runner is configured, and this feature has no
  parser/formatter/validator logic, so no unit tests are added.
- `yarn build` and `yarn lint` are the available automated checks; run both
  after each step.
- `Browser tests` (`yarn test:browser`) is declared in `AGENTS.md`, so add
  the coverage in Step 2 above; run
  `yarn test:browser tests/browser/signup.spec.js` before considering the
  step done.

## Notes for the AI

- Do not build the `/confirm/:token` screen or the resend-confirmation form;
  those are separate build-plan items.
- Keep all new UI text in French, no em dashes.
- Do not add a mount-time or interval check for confirmation status; the
  confirmation message is a static, terminal state for this page load.


<!-- blueprint:completion {"schemaVersion":1,"specBytes":5017,"specSha256":"ba39b4a79aad84fdd93d447b3ca89ab3c45b34a5e40992733f197b0fd46f80f7","branch":"refs/heads/feature/signup-handle-inactive-account-response","head":"c73a91bf3f0d2a69386fc18febec65329c4fb9a1","baseRef":"refs/heads/master","baseCommit":"80037c1aeec820601821c4f8cfbd280520144897","sourceTree":"9c52c838fe235dd52aa5aaad7661cdfd0957f4fe","absentOptional":[]} -->

## Independent review

**Status:** passed
**Target commit:** c73a91bf3f0d2a69386fc18febec65329c4fb9a1
**Base commit:** 80037c1aeec820601821c4f8cfbd280520144897
**Base ref:** refs/heads/master
**Spec hash:** ba39b4a79aad84fdd93d447b3ca89ab3c45b34a5e40992733f197b0fd46f80f7
**Prepared by:** claude
**Builder model:** claude-sonnet-5
**Requested reviewer:** claude
**Requested model:** claude-opus-5
**Requested execution:** automatic
**Requested at:** 2026-09-18T00:00:00Z
**Workflow:** regular
**Check required:** no

**Reviewer adapter:** claude
**Reviewer model:** claude-opus-5
**Reviewer context:** fresh subagent
**Actual execution:** automatic
**Reviewed at:** 2026-09-18T14:37:16Z
**Scope:** current
**Lenses:** quality, security, performance, tests
**Verdict:** passed
**Check result:** not-required

### Commands

- `yarn build`: pass (vite build, 128 modules, 1.49s)
- `yarn lint`: pass (eslint, no output)
- `yarn test:browser tests/browser/signup.spec.js`: pass (2/2 chromium)

### Evidence

- Freshness verified: `HEAD` equals the target commit, `git merge-base refs/heads/master HEAD` equals the base commit, `git status --porcelain` is empty, and the current `blueprint/context/current-feature.md` bytes hash to the recorded spec hash.
- Delta reviewed in full: `src/App.jsx` (stops passing `handleToken` to `Signup`), `src/pages/Signup/Signup.jsx` (adds `submitted` state, replaces the auto-login/redirect success branch with the French confirmation paragraph), and the new `tests/browser/signup.spec.js`.
- Security: the signup `accessToken` is no longer read into state, a cookie, or `localStorage`; a grep over `src/` confirms the only remaining `accessToken` consumers are `Login.jsx` and the refresh path in `api/client.js`. No secret or API host is hard-coded; the request still goes through `import.meta.env.VITE_API_URL`.
- Quality: the removed prop is cleaned up at the single call site, no dead `useNavigate` import remains, the failure path and `ErrorMessage` are untouched as the spec requires, and the new UI copy is French with no em dash.
- Performance: render-only conditional with no new effects, fetches, loops, or unbounded work; the confirmation state is terminal for the page load as the spec directs.
- Tests: the new spec mirrors the `tests/browser/login.spec.js` pattern, mocks `**/users/signup` with a 201, and asserts both the visible confirmation message and the absence of the form plus an unchanged `/signup` URL. No skipped, focused, or placeholder tests.

### Findings

- None

### Remaining risk

- No unit test runner is configured in this project, so the signup submit handler has no unit-level coverage; the browser spec plus build and lint are the only automated signals. This is a declared project state, not a regression in this delta.
- A 201 response without an `accessToken` field still leaves the form in place with no feedback. This success-detection rule is pre-existing and explicitly retained by the approved spec, so it is recorded as residual risk rather than a finding.
- F-06 (P3, `unverified`) remains in the ledger and was not re-examined: its files (`Home.jsx`, `Offer.jsx`) are outside this delta.
