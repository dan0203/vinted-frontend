# Feature: Environment variables + generic error component

**From build-plan:** feature 7
**Build attempt:** 1
**Status:** verified
**Branch:** feature/environment-variables-generic-error-component

## Goal

Stop pointing the app at a stale/mismatched API host, stop shipping the Stripe
publishable key hard-coded in a component, and stop every auth form from
re-implementing (and sometimes crashing on) the same
`error.response?.data?.message` extraction.

## In scope

- `.env.example` documenting `VITE_API_URL` and `VITE_STRIPE_PUBLISHABLE_KEY`.
- Local `.env` updated to a working default for `VITE_API_URL` and to hold
  `VITE_STRIPE_PUBLISHABLE_KEY`.
- `Payment.jsx` reading the Stripe publishable key from
  `import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY` instead of a literal string.
- A shared `ErrorMessage` component that safely extracts a displayable message
  from an axios error (or renders a generic fallback when there is no response
  body) and renders nothing when there is no error.
- `Login.jsx` and `Signup.jsx` switched to store the raw caught error and
  render it through `ErrorMessage`, removing their duplicated
  `error.response.data.message` extraction and the crash when `error.response`
  is `undefined` (network failure, CORS, timeout).

## Out of scope

- Renaming the `/user/login` and `/user/signup` routes or the `token` /
  `accessToken` response field - that is feature 8.
- `Home.jsx` and `Offer.jsx`'s fetch error handling - they currently only
  `console.log` and have no error UI state; giving list/detail pages a real
  error state is feature 16.
- `Publish.jsx`'s error handling - it also only `console.log`s and has no
  error UI today; adding one is new UI behavior, not de-duplication, and pairs
  naturally with the success feedback work in feature 20.
- `CheckoutForm.jsx`'s hard-coded `https://lereacteur-vinted-api.herokuapp.com/v2/payment`
  call - that is the unrelated external test endpoint feature 6 replaces with a
  real `vinted-backend` payment route.

## Build loop

One step at a time. Implement a step, then stop for review before starting the
next (`workflow.stepReview: feature`). No checkpoint commits between steps
(`workflow.checkpointCommits: disabled`); `/complete` makes the final commit.

## Build steps

- [x] 1. Add `.env.example` (tracked) documenting `VITE_API_URL` and
      `VITE_STRIPE_PUBLISHABLE_KEY` with placeholder values and a one-line
      comment on each. Update the local `.env` (git-ignored, not part of the
      commit): set `VITE_API_URL=http://localhost:3000` (the project's
      existing commented-out local-dev option; there is no deployed
      `vinted-backend` URL on record - see Notes for the AI), drop the two
      stale commented-out URLs, and add `VITE_STRIPE_PUBLISHABLE_KEY` set to
      the key currently hard-coded in `Payment.jsx`.
      **Done when:** `.env.example` exists and is tracked (`git status` shows
      it), lists both variables, and `yarn build` still succeeds.
- [x] 2. In `src/pages/Payment/Payment.jsx`, replace the hard-coded
      `loadStripe('pk_test_...')` call with
      `loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY)`.
      **Done when:** no `pk_test_` (or any `pk_`) literal remains in
      `Payment.jsx`, and `yarn build` succeeds.
- [x] 3. Create `src/components/ErrorMessage/ErrorMessage.jsx` and
      `ErrorMessage.css`. Props: `{ error }`, where `error` is either the raw
      object caught from an axios call, a plain string, or falsy.
      Rendering rule: falsy `error` renders nothing (`null`); otherwise render
      `<p className="error-message">{message}</p>` where `message` is
      `error.response.data.message` when present, else `error` itself only
      when it is a plain string (already French), else the fallback
      "Une erreur est survenue. Veuillez réessayer." `error.message` from an
      axios/Error object is never shown - it is English/technical text
      (e.g. "Network Error") and would violate the project's French-only UI
      rule. Port the visual style from
      the existing `.main-login .error` / `.main-signup .error` rules
      (red-on-pink alert box) into `.error-message` in the new CSS file so it
      is host-page-agnostic.
      **Done when:** the component exists, exports default, and `yarn build`
      succeeds with it unused (verified for real in the next step).
- [x] 4. Wire `ErrorMessage` into `Login.jsx` and `Signup.jsx`: import it,
      change each `catch (error) { ...; setError(error.response.data.message); }`
      to store the raw `error` (e.g. `setError(error)`), replace each
      `{error && <p className="error">{error}</p>}` with
      `<ErrorMessage error={error} />`, and remove the now-unused
      `.main-login .error` / `.main-signup .error` CSS rules from
      `Login.css` / `Signup.css`. Also remove `Login.jsx`'s
      `if (error.status === 400) { navigate('/signup'); }` redirect: axios
      v1.13 sets `error.status` as an alias for `error.response.status`, so
      this guard fired on every ordinary wrong-password 400, navigating away
      from `/login` before the user could read the new `ErrorMessage` banner
      (confirmed with a real browser check). Login now just shows the error
      and leaves the existing "Pas encore de compte ?" link for the user to
      go to `/signup` themselves.
      **Done when:** `yarn build` and `yarn lint` succeed, manually submitting
      Login or Signup while the configured `VITE_API_URL` is unreachable shows
      the generic French fallback message instead of a blank page or console
      error (`TypeError: Cannot read properties of undefined`), and submitting
      Login with wrong credentials (400) shows the error message and stays on
      `/login` instead of redirecting to `/signup`.

## Files / areas

- `.env.example` (new, tracked)
- `.env` (local only, git-ignored - not part of the commit diff)
- `src/pages/Payment/Payment.jsx`
- `src/components/ErrorMessage/ErrorMessage.jsx` (new)
- `src/components/ErrorMessage/ErrorMessage.css` (new)
- `src/pages/Login/Login.jsx`, `src/pages/Login/Login.css`
- `src/pages/Signup/Signup.jsx`, `src/pages/Signup/Signup.css`

## Data / contracts

None. No backend route, request, or response shape changes; this is
env/config plumbing and a presentational component only.

## Testing

No test runner is configured for this project. Verify with:

- `yarn lint` and `yarn build` (the project's `verify` command) after each
  step that touches source.
- Manual check in `yarn dev`: trigger a real validation error (e.g. wrong
  password) on Login/Signup and confirm the message still displays; then
  point `VITE_API_URL` at an unreachable host and confirm the fallback
  message displays instead of a crash.

## Notes for the AI

- There is no recorded deployed `vinted-backend` URL for this frontend yet
  (`blueprint/context/project-overview.md`'s Deployment section is an open
  TODO). `http://localhost:3000` is the project's own previously-commented
  local-dev default, not a guess at a production host. Since `.env` is
  git-ignored, this is a local default the user can change at any time
  without touching tracked files or requiring a new feature.
- Keep the Stripe key change to swapping the literal for the env read; do not
  touch `CheckoutForm.jsx`'s payment call, which is explicitly out of scope
  (feature 6).
- Do not extend `ErrorMessage` usage to `Home.jsx`, `Offer.jsx`, or
  `Publish.jsx` in this feature; each has a different, larger gap (missing
  error state entirely) that belongs to features 16 and 20.

<!-- blueprint:completion {"schemaVersion":1,"specBytes":7563,"specSha256":"21b693ac0cfcb7a9ce7136ab9ef4535365160c619ad42e4aad82ceccccec63c8","branch":"refs/heads/feature/environment-variables-generic-error-component","head":"7f80c151aceb1df1d22e8cd75bd158e7499c958e","baseRef":"refs/heads/master","baseCommit":"8a4269c4676d403abaaf59bce009d1de9bac1e5f","sourceTree":"414678e647f89c6cd976966e5679f4de3e1604ec","absentOptional":[]} -->

## Findings

### 07/F-01 [P2] closed - Playwright added as a permanent devDependency for a one-off manual check

**File:** package.json:25, yarn.lock
**Found:** 2026-09-18 by /audit (scope: current; lens: quality)
**Why it matters:** `@playwright/test` (plus `playwright-core`/`playwright`) was
installed mid-session to manually verify the error-message flow in a real
browser, then left in `devDependencies`/`yarn.lock` with no script, no config
file, and no test file referencing it. `coding-standards.md`'s Browser
Verification section is explicit: browser automation is separately opt-in
through `/tests browser`, which documents the runner as `Browser tests` in
`AGENTS.md`; a runner must not be added silently mid-feature. As committed,
this is an unused, undeclared dependency, not a working test setup: it adds
install weight and a supply-chain surface (a full Chromium download path) with
no current requirement backing it.
**Suggested fix:** Remove `@playwright/test` from `package.json` and revert
`yarn.lock` (`yarn remove @playwright/test`) before this feature is committed.
If durable browser-test coverage is wanted, add it through `/tests browser` as
its own deliberate step, which wires the command into `AGENTS.md` and adds
real spec files. Current requirement lost by removing it: none, no test file
or script depends on it.
**Resolution:** Ran `/tests browser` (2026-09-18): reused the already-installed
`@playwright/test`, added `playwright.config.js` and
`tests/browser/login.spec.js` (a real smoke test that launches `yarn dev` and
Chromium and asserts the login form renders), added the `test:browser` script,
documented `Browser tests: yarn test:browser` in `AGENTS.md`, added an
eslint Node-globals override for the config/test files, and git-ignored
`test-results`/`playwright-report`/`blob-report`. `yarn test:browser` passes;
`yarn lint` and `yarn build` are unaffected. Not added to `yarn verify` or CI.
Re-reviewed 2026-09-18 by `/audit` (scope: current): `package.json`/`yarn.lock`
now show `@playwright/test` backed by `playwright.config.js` and
`tests/browser/login.spec.js`, `yarn test:browser` passes, `test-results`/
`playwright-report`/`blob-report` are git-ignored, and `AGENTS.md` documents
the command. No new defect introduced by the repair. Closed.

### 07/F-02 [P3] closed - Login's redirect-on-400 removal isn't reflected in the feature spec

**File:** src/pages/Login/Login.jsx:42-44, blueprint/context/current-feature.md:83-94
**Found:** 2026-09-18 by /audit (scope: current; lens: quality)
**Why it matters:** The approved spec's step 4 only describes swapping the
per-form `error.response.data.message` extraction for `ErrorMessage`; it does
not mention removing the `if (error.status === 400) { navigate('/signup'); }`
auto-redirect. That redirect was dropped in this session (confirmed by
Playwright: with it in place, a real backend's 400 response for bad
credentials fired `handleToken`'s catch, then `navigate('/signup')` before the
user could ever read the error banner - axios v1.13 sets `error.status` as an
alias for `error.response.status`, so the guard fired on every ordinary bad
password). The fix is correct and was explicitly requested in chat, but the
spec's Build steps and Done-when text still describe the old behavior, so
`current-feature.md` no longer matches the diff it's meant to document.
**Suggested fix:** Update `current-feature.md` step 4 (or add a short step 5)
to record the redirect removal and why, so the archived spec in
`blueprint/history` matches what actually shipped. No code change needed.
**Resolution:** Updated `current-feature.md` step 4 (2026-09-18) to describe
the redirect removal and its updated Done-when. Re-reviewed 2026-09-18 by
`/audit` (scope: current): `current-feature.md` step 4 now documents the
redirect removal and its rationale, matching `Login.jsx`'s diff. Closed.

## Independent review

**Status:** passed
**Target commit:** 7f80c151aceb1df1d22e8cd75bd158e7499c958e
**Base commit:** 8a4269c4676d403abaaf59bce009d1de9bac1e5f
**Base ref:** refs/heads/master
**Spec hash:** 21b693ac0cfcb7a9ce7136ab9ef4535365160c619ad42e4aad82ceccccec63c8
**Prepared by:** claude
**Builder model:** claude-sonnet-5
**Requested reviewer:** claude
**Requested model:** runtime default (exact model not known until reviewer starts)
**Requested execution:** automatic
**Requested at:** 2026-09-18T10:05:49Z
**Workflow:** regular
**Check required:** yes
**Reviewer adapter:** claude
**Reviewer model:** claude-sonnet-5
**Reviewer context:** fresh subagent
**Actual execution:** automatic
**Reviewed at:** 2026-09-18T00:00:00Z
**Scope:** current
**Lenses:** quality, security, performance, tests
**Verdict:** passed
**Check result:** passed

### Commands

- `git rev-parse HEAD`: pass (matches Target commit)
- `git merge-base HEAD refs/heads/master`: pass (matches Base commit)
- `git status --porcelain=v1 -uall`: pass (clean working tree; no path differs from target)
- `sha256sum blueprint/context/current-feature.md`: pass (matches Spec hash)
- `yarn lint`: fail (2 pre-existing `no-unused-vars` errors in `src/App.jsx:14`
  and `src/pages/Offer/Offer.jsx:2`, both present unchanged at the base
  commit and outside this feature's files; not part of the project's
  declared Verify command)
- `yarn build` (project's `Verify` command, `vite build`): pass

### Evidence

- Full `<base>..<target>` diff reviewed (single squash commit
  `7f80c15`, 15 files changed): `.env.example`, `.gitignore`,
  `AGENTS.md`, `eslint.config.js`, `package.json`, `playwright.config.js`,
  `src/components/ErrorMessage/ErrorMessage.{jsx,css}`,
  `src/pages/Login/Login.{jsx,css}`, `src/pages/Payment/Payment.jsx`,
  `src/pages/Signup/Signup.{jsx,css}`, `tests/browser/login.spec.js`,
  `yarn.lock`.
- Confirmed every build step in `current-feature.md` is implemented as
  specified: `.env.example` documents both vars, `Payment.jsx` reads
  `VITE_STRIPE_PUBLISHABLE_KEY` via `import.meta.env` with no `pk_` literal
  remaining, `ErrorMessage` renders `null` on falsy error, extracts
  `error.response.data.message`, falls back to a string error or the French
  fallback text, never renders `error.message`, and its CSS matches the
  ported `.main-login .error`/`.main-signup .error` styling.
  `Login.jsx`/`Signup.jsx` store the raw caught error, render it via
  `ErrorMessage`, and the old duplicated extraction and dead `.error` CSS
  rules are removed; grep confirmed no remaining `className="error"` or
  `.error` CSS selector reference in `src/`.
- Confirmed the `error.status === 400` auto-redirect removal in `Login.jsx`
  and that `current-feature.md` step 4 already documents this change and its
  rationale (previously ledger F-02, closed).
- Confirmed no secret is newly exposed: `.env.example` holds only a
  placeholder Stripe key and a local dev URL; the real local `.env` remains
  git-ignored (confirmed via `.gitignore` and `git status`).
- Confirmed `@playwright/test` (previously ledger F-01) is now a backed
  dependency: `playwright.config.js`, `tests/browser/login.spec.js`, the
  `test:browser` script, the `AGENTS.md` "Browser tests" line, the
  eslint Node-globals override for `playwright.config.js`/`tests/browser/**`,
  and the `.gitignore` entries for `test-results`/`playwright-report`/
  `blob-report` are all present and consistent; not wired into `yarn verify`
  or CI, matching AGENTS.md's stated scope for browser tests.
- Confirmed via `git show <base>:src/App.jsx` and
  `git show <base>:src/pages/Offer/Offer.jsx` that the two `yarn lint`
  failures predate this feature's base commit and are in files untouched by
  this diff.

### Findings

- 07/F-03 [P3] unverified (non-blocking: pre-existing unrelated `yarn lint`
  failures)

### Remaining risk

- `yarn lint` is currently red on code outside this feature's scope
  (`src/App.jsx`, `src/pages/Offer/Offer.jsx`); tracked as 07/F-03, does not
  block this receipt since it predates the base commit and the project's
  Verify command (`vite build`) does not include lint.
- `tests/browser/login.spec.js` was not executed live during this review
  (no `yarn test:browser` run); its presence, config, and wiring were
  verified by inspection only, consistent with browser tests being outside
  `yarn verify`/CI per `AGENTS.md`.
