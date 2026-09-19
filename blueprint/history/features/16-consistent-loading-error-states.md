# Feature: Consistent loading/error states

**From build-plan:** feature 16
**Build attempt:** 1
**Branch:** feature/consistent-loading-error-states
**Status:** verified

## Goal

Every page that fetches data on load resolves to a real, visible error state
when the request fails, instead of leaving the loading spinner stuck forever.

## In scope

- [Home.jsx](src/pages/Home/Home.jsx): the offers-list fetch swallows errors
  with only a `console.log`, never calls `setIsLoading(false)` on failure, and
  never renders anything for the failure case, so the page is stuck on
  "Chargement en cours..." forever and a retry is impossible.
- [Offer.jsx](src/pages/Offer/Offer.jsx): the single-offer fetch has the same
  bug (`console.log` only, no `setIsLoading(false)` on failure, no error UI),
  plus the success path unconditionally reads `offer.owner.account.avatar`,
  which crashes if `offer` is ever rendered before data arrives correctly.
- Reuse the existing `finally { setIsLoading(false) }` + `error` state +
  `ErrorMessage` component pattern already used correctly in
  [Confirm.jsx](src/pages/Confirm/Confirm.jsx), so all fetch-driven pages
  follow one consistent shape.

## Out of scope

- Favorites and "My offers" pages (build-plan items 22 and 26) - they do not
  exist yet in this codebase; they must follow this same pattern when built,
  but there is nothing to fix here today.
- Non-GET-on-mount interactions (login/signup/publish form submissions,
  payment) - these already set their own loading/error state per submit and
  are not "stuck spinner on page load" cases.
- Retry buttons, toasts, or any new UI pattern beyond what `ErrorMessage` and
  the existing `.loading` class already provide.

## Build loop

Single build step; the fix is small and self-contained. Follow
`workflow.stepReview: feature` - implementation stops after the step for
review. `workflow.checkpointCommits` is disabled, so no intermediate commits
are created during the step; `/complete` makes the final commit.

## Build steps

- [x] 1. Fix the stuck-spinner bug in Home and Offer.
  - In `Home.jsx`: add an `error` state; in the fetch's `catch`, call
    `setError(error)` instead of only logging; move `setIsLoading(false)` into
    a `finally` block so it always runs. Render `ErrorMessage` when `error` is
    set (in place of the offers list), instead of leaving the loading branch
    active.
  - In `Offer.jsx`: add the same `error` state, `setError(error)` in `catch`,
    and `setIsLoading(false)` in a `finally` block. Render `ErrorMessage` when
    `error` is set (in place of the offer detail markup), so the existing
    unguarded `offer.owner.account.avatar` access is never reached with an
    empty `offer`.
  - Keep the existing `.loading` class and `ErrorMessage` component; do not
    introduce a new loading/error UI pattern.
  - Done when: `yarn build` succeeds, and manually stopping the backend (or
    pointing `VITE_API_URL` at an unreachable host) while loading `/` or an
    `/offers/:id` route shows the error message instead of an indefinite
    spinner.

## Files / areas

- `src/pages/Home/Home.jsx`
- `src/pages/Offer/Offer.jsx`
- `src/components/ErrorMessage/ErrorMessage.jsx` (reused, unchanged)

## Data / contracts

No API or data-shape changes. Both pages already call the live
`/offers` and `/offers/:id` endpoints (build-plan item 8); this feature only
changes client-side state handling around those existing calls.

## Testing

No test runner is configured for logic tests in this project. Verify via
`yarn build` (already passing on the current baseline) and manual check in
the browser per the `Done when` above; no `yarn test:browser` scenario exists
for this yet and adding one is disproportionate to a state-handling fix.

## Notes for the AI

- Match `Confirm.jsx`'s existing try/catch/finally + `ErrorMessage` shape
  exactly; it is the proven, already-reviewed pattern in this codebase for
  this kind of fetch-on-mount page.
- `Home.jsx` currently derives `isLoading` and the offers list render from a
  single ternary; splitting into `isLoading` / `error` / success branches
  (in that order, matching `Confirm.jsx`) keeps the fix minimal.


<!-- blueprint:completion {"schemaVersion":1,"specBytes":4193,"specSha256":"47f40cf26a3f9af98eef6c16bfbe1c1c5b022cd42303dc07d4d3274b17672eda","branch":"refs/heads/feature/consistent-loading-error-states","head":"40dbe7848ac43db44c4de4ec528cd2e65a0e281b","baseRef":"refs/heads/master","baseCommit":"40dbe7848ac43db44c4de4ec528cd2e65a0e281b","sourceTree":"2516581f8704e3d482a3dbd5e5523a21a7065ba7","absentOptional":[]} -->

## Findings

### 16/F-14 [P2] closed - No browser coverage for Home/Offer's new error state

**File:** src/pages/Home/Home.jsx, src/pages/Offer/Offer.jsx
**Found:** 2026-09-18 by /audit (scope: current; lens: tests)
**Why it matters:** Feature 16 adds a stable, purely behavioral claim to both
pages: on a failed fetch, render `ErrorMessage` instead of leaving the loading
spinner stuck. `AGENTS.md` declares `Browser tests: yarn test:browser`, and
`coding-standards.md`'s Browser Verification section says to "add focused
coverage for stable behavioral done-whens when it is proportionate" once that
command exists. This is exactly that case: `tests/browser/confirm.spec.js`
already covers the identical shape (mock a failing response via `page.route`,
assert the error text is visible) for `Confirm.jsx`, the page this feature's
spec explicitly used as the pattern to copy. Home and Offer copied the
runtime pattern but not the test that goes with it, so a future regression
that reintroduces the stuck-spinner bug (for example, dropping the `finally`)
would not be caught by `yarn test:browser` or `yarn verify`, only by a manual
`/check` run.
**Suggested fix:** Add `tests/browser/home.spec.js` and
`tests/browser/offer.spec.js` (or one shared file) mocking `GET /offers` and
`GET /offers/:id` to fail via `page.route`, then asserting `.error-message`
(or its text) is visible and the loading text is gone - mirroring
`confirm.spec.js:20-33`. Small, proportionate addition; no new dependency or
abstraction needed.
**Resolution:** Fixed 2026-09-18: added `tests/browser/home.spec.js` and
`tests/browser/offer.spec.js`, each mocking the relevant GET to fail and
asserting `ErrorMessage`'s text is visible and the loading text is gone,
mirroring `confirm.spec.js:20-33`. Full `yarn test:browser` suite passes
(27/27); `yarn lint` clean. Marked `fixed`, not `closed` - awaiting a review
pass to confirm.
Re-examined 2026-09-18 by /audit (scope: current; lens: tests) against
feature 16, working tree vs `40dbe78`. `tests/browser/home.spec.js` and
`tests/browser/offer.spec.js` reviewed fresh: each mocks its GET to fail,
asserts the `ErrorMessage` text is visible, and asserts the loading text is
gone - matching the suggested fix. Full `yarn test:browser` (27/27) and
`yarn lint` both pass; no new defect introduced. Closed.
