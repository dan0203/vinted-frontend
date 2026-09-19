# Feature: Migrate to /users/* routes and new offer field names

**From build-plan:** feature 8
**Build attempt:** 1
**Status:** verified
**Branch:** `feature/migrate-to-users-routes-and-new-offer-field-names`

## Goal

Bring the frontend's auth routes/field names and offer field names up to the
live `vinted-backend` contract, so the existing browse/detail/signup/login
screens actually work against the real API instead of a discontinued shape.
This is the gating item most near-term build-plan work depends on.

## In scope

- Signup and Login: post to `/users/signup` and `/users/login` (not
  `/user/signup` / `/user/login`), and read the returned access token from
  `response.data.accessToken` (not `response.data.token`).
- Home: read offers using the live flat shape (`name`, `price`, `image`,
  `details.brand`, `details.size`, `createdAt`) and delete the
  `product_details` array-reconstruction logic (`productDetails` rebuild
  loop, French `TAILLE`/`MARQUE` key lookups).
- Offer detail: read the same live flat shape (`name`, `description`,
  `price`, `image`, `details`) and delete its own
  `product_details`-array-to-`productDetails`-pairs reconstruction loop,
  rendering `details` entries directly.
- Home's client-side sort switches from the now-nonexistent
  `product_date` field to `createdAt` (same client-side sort behavior,
  corrected field name only; server-side sort is build-plan item 17).

## Out of scope

- Switching token storage to in-memory + httpOnly refresh cookie, and 403/423
  account-state handling (item 9).
- Silent token refresh on 401 (item 10).
- Server-side logout call (item 11).
- Signup "check your email" inactive-account state (item 12).
- Multi-image `pictures` gallery/upload (items 19-20).
- Server-side search/filter/sort/pagination (item 17).
- Any change to `Publish.jsx` (its route and fields already match the live
  backend per the build plan) or to Stripe/`CheckoutForm.jsx`/`Payment.jsx`.

## Build loop

Build one small step at a time. Follow `workflow.stepReview` in
`blueprint/config.json` (`feature`: one review packet after all steps, not
per-step). `workflow.checkpointCommits` is disabled, so no checkpoint commits
between steps. `/complete` makes the final feature commit. Never accept a
review packet that hasn't been read; split any diff too large to review.

## Build steps

- [x] **Step 1 - Migrate Signup and Login to the live `/users/*` contract** - in
  `src/pages/Signup/Signup.jsx` and `src/pages/Login/Login.jsx`, change the
  POST target from `/user/signup` / `/user/login` to `/users/signup` /
  `/users/login`, and change the success check from `response.data.token` to
  `response.data.accessToken` (still passed into the existing `handleToken`
  cookie flow - item 9 replaces that storage mechanism). *Done when:* both
  forms compile and submit to the renamed routes with `yarn build` passing;
  a successful response's `accessToken` is what gets stored, not `token`.
- [x] **Step 2 - Migrate Home to the live offer shape** - in
  `src/pages/Home/Home.jsx`, remove the `product_details`/`productDetails`
  reconstruction loop and read `offer.image`, `offer.price`,
  `offer.details.size`, `offer.details.brand` directly; sort the list by
  `offer.createdAt` instead of `offer.product_date`. *Done when:* `yarn
  build` and `yarn lint` pass, no reference to `product_image`,
  `product_price`, `product_details`, or `product_date` remains in the file,
  and the offer card still renders image, price, size, and brand when given
  an offer object shaped per the live contract.
- [x] **Step 3 - Migrate Offer detail to the live offer shape** - in
  `src/pages/Offer/Offer.jsx`, remove the `product_details`-array-to-pairs
  reconstruction loop and read `offer.image`, `offer.name`,
  `offer.description`, `offer.price`, and `offer.details` directly, rendering
  `Object.entries(offer.details)` in place of the old `productDetails` pairs
  list. *Done when:* `yarn build` and `yarn lint` pass, no reference to
  `product_image`, `product_name`, `product_description`, or `product_details`
  remains in the file, and the detail view still renders image, name,
  description, price, and each detail key/value when given an offer object
  shaped per the live contract.
- [x] **Step 4 - Repair independent-review findings introduced by this diff
  (F-07, F-08)** - in `src/pages/Offer/Offer.jsx`, add a `DETAIL_LABELS` map
  (English `details` keys -> French labels) instead of rendering raw English
  keys, and guard `offer.image`/`offer.details` the same way Home already
  guards them. *Done when:* `yarn build` and `yarn lint` pass, and both
  findings are marked `fixed` in `blueprint/context/findings.md`.
  shaped per the live contract.

## Files / areas

- `src/pages/Signup/Signup.jsx`
- `src/pages/Login/Login.jsx`
- `src/pages/Home/Home.jsx`
- `src/pages/Offer/Offer.jsx`

## Data / contracts

- Offer (live `vinted-backend` shape, from `project-overview.md`): `_id`,
  `name`, `description`, `price`, `details` (flat object: `brand`, `size`,
  `color`, `condition`, `city`), `image` (single Cloudinary image object with
  a `url`), `pictures` (secondary images, not consumed until items 19-20),
  `status`, `owner` (populated `{ _id, account }`), `createdAt`.
- Auth response (signup/login): access token is returned as
  `accessToken` in the response body (short-lived JWT). This feature only
  renames the field read from the response; it does not change how or where
  the token is stored (still the existing `handleToken` -> `js-cookie` flow).
- No persisted-data or schema changes; this is a client-side read-shape
  correction against an already-live backend contract.

## Testing

No test runner is configured yet (unit testing is opt-in and not set up in
this project per `AGENTS.md`/`coding-standards.md`), so this feature relies on
`yarn build` (part of the declared `yarn verify` command) and `yarn lint` as
evidence, plus manual verification against a running `vinted-backend` when
available. This is UI/integration-shaped work (reading fields off API
responses and rendering them), not pure logic, so it's exempt from the
unit-test gate even if a runner existed. No `Browser tests` command is
declared, so no Playwright coverage is added; if a live backend isn't
reachable in this environment, verify by starting `yarn dev` and inspecting
the rendered Home/Offer pages, or by confirming the legacy field names are
fully removed and the build stays green.

## Notes for the AI

- Do not touch `Publish.jsx`: the build plan says its route and fields
  already match the live backend.
- Do not change the token *storage* mechanism (still `js-cookie` via
  `handleToken`) - that rework is build-plan item 9, not this feature.
- Leave the "if no token in the response, do nothing" fallback in
  Signup/Login as-is; the "check your email" inactive-account UI is item 12.
- `details` is already a flat object on the live contract, so Offer detail's
  rendering can iterate `Object.entries(offer.details)` directly with no
  reconstruction step, unlike the current array-shaped legacy code.


<!-- blueprint:completion {"schemaVersion":1,"specBytes":7089,"specSha256":"0af3e940c4e3a272d4f8ad9b957c21d623d96a1cce4bc4972d3b9fef6d1af918","branch":"refs/heads/feature/migrate-to-users-routes-and-new-offer-field-names","head":"726679c641fd6911a3c8de91e1e2601a9dc7d985","baseRef":"refs/heads/master","baseCommit":"b4b966f6e65f6d425d08d6fd233663f375149e5e","sourceTree":"ee4075dc02249410250119e8730af32660cf1536","absentOptional":[]} -->

## Findings

### 8/F-03 [P3] invalid - `yarn lint` fails on pre-existing errors unrelated to this feature

**File:** src/App.jsx:14, src/pages/Offer/Offer.jsx:2
**Found:** 2026-09-18 by /audit independent (scope: current; lens: quality)
**Why it matters:** `yarn lint` currently fails with two `no-unused-vars`
errors (`isConnected` in `App.jsx`, `data` in `Offer.jsx`). Both lines are
unchanged by this feature's diff and both errors are already present at the
base commit `8a4269c4676d403abaaf59bce009d1de9bac1e5f` (confirmed via
`git show <base>:src/App.jsx` and `git show <base>:src/pages/Offer/Offer.jsx`),
so they predate this feature and are out of its scope (`App.jsx` and
`Offer.jsx` are not touched by the `.env`/`ErrorMessage` build plan). The
project's Verify command (`yarn verify` = `vite build`) does not run lint and
passed cleanly, so this does not block this feature, but `yarn lint` itself is
currently red on `master`-descended code independent of this work.
**Suggested fix:** Remove the unused `isConnected`/`setIsConnected` state in
`App.jsx` if genuinely unused, or use it; remove the unused `data` import in
`Offer.jsx`'s `react-router` import. Track as a small separate cleanup step,
not part of this feature.
**Resolution:** Re-examined 2026-09-18 by `/audit full` (scope: full; lens: quality).
`yarn lint` now passes cleanly (exit 0, no errors). Current `App.jsx` has no
`isConnected` state (only `search`/`setSearch` and `handleToken`); current
`Offer.jsx` imports only `Link, useParams` from `react-router`, no unused
`data`. The unused variables were removed on `master` after this finding was
raised; the finding no longer applies to current code.

### 8/F-04 [P1] accepted - CheckoutForm never clears `isLoading` after a Stripe validation error or network failure

**File:** src/components/CheckoutForm/CheckoutForm.jsx:23-72
**Found:** 2026-09-18 by /audit full (scope: full; lens: quality)
**Why it matters:** `handleSubmit` calls `setIsLoading(true)` on line 23, then
has three exit paths that never call `setIsLoading(false)`: the `elements ==
null` early return (line 25-27), the `elementsData.error` branch (line 31-35,
returns without resetting), and the outer `catch` block (line 70-72, logs and
swallows without resetting). Only the success path (line 69, reached solely
when no error is set and no exception is thrown) resets loading. In practice
this means any invalid card entry, network failure, or Stripe API error
permanently disables the Pay button (`disabled={!stripe || !elements ||
isLoading}` at line 86) for the rest of the session, with no way to retry
without a page reload. This is the checkout page's primary submit path.
**Suggested fix:** Wrap the body in `try/finally` (or add `setIsLoading(false)`
to each early-return and catch branch) so `isLoading` always resets once the
submit attempt ends, matching the same pattern already used correctly
elsewhere (e.g. `Home.jsx`'s single `try/catch` with a terminal
`setIsLoading(false)` inside `try`).
**Resolution:** Accepted 2026-09-18 by the user. `CheckoutForm.jsx` is
untouched by build-plan item 8 and belongs to item 6 (real Stripe checkout),
which is itself a pending TODO gated on backend payment-route work; the user
chose to accept this pre-existing defect for now rather than repair it inside
this unrelated feature, unblocking `/complete` for item 8.

### 8/F-07 [P2] closed - Offer detail renders raw English `details` keys as French UI labels

**File:** src/pages/Offer/Offer.jsx:38-42
**Found:** 2026-09-18 by /audit independent (scope: current; lens: quality)
**Why it matters:** The new `Object.entries(offer.details).map(([key, value]))`
renders `key` directly as the visible label, and the live contract's `details`
keys are English (`brand`, `size`, `color`, `condition`, `city`). The legacy
shape this replaced carried French keys (`MARQUE`, `TAILLE`), so the detail page
previously showed French labels and now shows "brand", "size", "color",
"condition", "city" to a French-speaking user. `AGENTS.md` states "UI copy is
French; keep new UI text French to match the existing app", and the sibling
`Home.jsx` card avoids the problem only because it renders the values without
labels. This is a user-visible copy regression introduced by this diff, not a
pre-existing condition.
**Suggested fix:** Add a small literal label map in `Offer.jsx`
(`brand: 'Marque', size: 'Taille', color: 'Couleur', condition: 'État',
city: 'Emplacement'`) and render `labels[key] ?? key` so unknown keys still
degrade to the raw key. No new dependency or abstraction needed.
**Resolution:** Fixed 2026-09-18 by `/implement`. Added a `DETAIL_LABELS`
map (`brand`/`size`/`color`/`condition`/`city` -> French labels) in
`Offer.jsx` and render `DETAIL_LABELS[key] ?? key`. `yarn build` and `yarn
lint` pass.
Closed 2026-09-18 by /audit independent (scope: current; lenses: quality,
security, performance, tests) against `b4b966f..726679c`. Re-reviewed
`Offer.jsx:6-12,46-53`: the module-level `DETAIL_LABELS` map covers exactly the
five keys `Publish.jsx:35-39` submits (`brand`, `size`, `color`, `condition`,
`city`) and matches that form's own French labels; `DETAIL_LABELS[key] ?? key`
degrades unknown keys to the raw key as suggested. The map is a plain literal
outside the component, so it is not rebuilt per render and adds no dependency
or abstraction. No new defect introduced; original copy regression is gone.

### 8/F-08 [P2] closed - Offer detail reads `image` and `details` unguarded while Home guards the same fields

**File:** src/pages/Offer/Offer.jsx:34, src/pages/Offer/Offer.jsx:38
**Found:** 2026-09-18 by /audit independent (scope: current; lens: quality)
**Why it matters:** The same diff added defensive reads on the Home card
(`{offer.image && ...}` at `Home.jsx:57`, `offer.details?.size` /
`offer.details?.brand` at `Home.jsx:61-65`) but left the detail page reading
`offer.image.url` and `Object.entries(offer.details)` with no guard. If an offer
reaches the client without one of those fields, the card renders fine and links
to a detail route that throws a `TypeError` during render; there is no error
boundary in `App.jsx`, so the result is a blank page rather than a degraded one.
`Publish.jsx` lets a user submit the form with no file selected (`file` starts as
`{}`), which is the plausible path to an image-less offer. The old code was also
unguarded, but it threw inside the effect's `try/catch`, so the failure mode
degrades from a stuck "Chargement en cours..." to an unhandled render crash.
Exact backend behavior for a missing `image`/`details` was not confirmed from
this repository, so the crash is reachable-in-principle rather than reproduced;
the guard inconsistency itself is confirmed.
**Suggested fix:** Mirror the Home guards in `Offer.jsx`: wrap the `<img>` in
`{offer.image && ...}` and iterate `Object.entries(offer.details ?? {})`. Two
small edits, no new abstraction; nothing in the current requirements is lost.
**Resolution:** Fixed 2026-09-18 by `/implement`. `Offer.jsx` now wraps the
`<img>` in `{offer.image && ...}` and iterates
`Object.entries(offer.details ?? {})`, mirroring Home's guards. `yarn build`
and `yarn lint` pass.
Closed 2026-09-18 by /audit independent (scope: current; lenses: quality,
security, performance, tests) against `b4b966f..726679c`. Re-reviewed
`Offer.jsx:42` and `Offer.jsx:46`: both reads are now guarded exactly as
suggested and as `Home.jsx:57,61-65` guards the same fields, so a missing
`image` or `details` degrades the detail page instead of throwing during
render. No new defect introduced. Remaining unguarded chain
`offer.owner.account` (`Offer.jsx:58`, mirrored at `Home.jsx:49`) is
pre-existing, untouched by this diff, and backed by the populated `owner`
contract, so it is not tracked as a new finding.


## Independent review

**Status:** passed
**Target commit:** 726679c641fd6911a3c8de91e1e2601a9dc7d985
**Base commit:** b4b966f6e65f6d425d08d6fd233663f375149e5e
**Base ref:** master
**Spec hash:** 0af3e940c4e3a272d4f8ad9b957c21d623d96a1cce4bc4972d3b9fef6d1af918
**Spec snapshot:** blueprint/.state/review-specs/726679c641fd6911a3c8de91e1e2601a9dc7d985-0af3e940c4e3a272d4f8ad9b957c21d623d96a1cce4bc4972d3b9fef6d1af918.md
**Prepared by:** claude
**Builder model:** claude-sonnet-5
**Requested reviewer:** claude
**Requested model:** claude-opus-5
**Requested execution:** automatic
**Requested at:** 2026-09-18T11:50:00Z
**Workflow:** regular
**Check required:** no
**Reviewer adapter:** claude
**Reviewer model:** claude-opus-5
**Reviewer context:** fresh subagent
**Actual execution:** automatic
**Reviewed at:** 2026-09-18T12:40:00Z
**Scope:** current
**Lenses:** quality, security, performance, tests
**Verdict:** passed
**Check result:** not-required

## Commands

- `git rev-parse HEAD`: pass (`726679c641fd6911a3c8de91e1e2601a9dc7d985`, matches Target commit)
- `git merge-base master HEAD`: pass (`b4b966f6e65f6d425d08d6fd233663f375149e5e`, matches Base commit)
- `git status --porcelain`: pass (clean tree; no path differs from the target)
- `sha256sum blueprint/context/current-feature.md`: pass (matches Spec hash)
- `sha256sum <Spec snapshot>`: pass (identical raw-byte digest; both paths ignored via `.gitignore:35`, absent from the index and from `Target commit`)
- `git diff b4b966f..726679c`: pass (4 files, +51/-72, reviewed in full)
- `yarn lint`: pass (eslint, exit 0, no errors)
- `yarn build`: pass (vite build, 128 modules, exit 0)
- `yarn test:browser`: not run (Playwright harness needs a dev server and is outside `yarn verify`/CI)

## Evidence

- Auth contract: `Login.jsx:31,36-37` and `Signup.jsx:35,40-41` now POST to `/users/login` / `/users/signup` off `import.meta.env.VITE_API_URL` and read `response.data.accessToken` into the unchanged `handleToken` cookie flow, exactly as the spec's Step 1 requires. No hard-coded host or secret introduced.
- Home migration: `Home.jsx:43-69` renders the live flat shape (`image`, `price`, `details?.size`, `details?.brand`) and sorts on `createdAt`. The `productDetails` rebuild loop and the French `TAILLE`/`MARQUE` lookups are gone.
- Offer migration: `Offer.jsx:26` calls `setOffer(response.data)` directly; the `product_details`-to-pairs reconstruction loop is deleted; `Offer.jsx:44,55-56,67,72-73` read `price`, `name`, `description`.
- Repair step: module-level `DETAIL_LABELS` (`Offer.jsx:6-12`) covers exactly the five keys `Publish.jsx:35-39` submits and reuses that form's own French labels; `Offer.jsx:49` degrades unknown keys via `DETAIL_LABELS[key] ?? key`; `Offer.jsx:42,46` guard `image` and `details ?? {}`, mirroring `Home.jsx:57,61-65`.
- Legacy-name sweep across `src/` and `tests/`: no `product_image`, `product_price`, `product_name`, `product_description`, `product_date`, `product_details`, `productDetails`, `/user/` or live `data.token` read remains. Only stale `product_*` CSS class names (paired with `Offer.css:28-68`, so still correct) and the two commented-out `data.token` lines already tracked as F-05.
- Security lens: the diff renames routes and one response field; it adds no new trust boundary, no `dangerouslySetInnerHTML`, no secret, and no auth/ownership logic. Token storage is unchanged and deferred to build-plan item 9 per the spec's Out of scope.
- Performance lens: deleting both reconstruction loops removes per-render O(n*m) `Object.entries` work; `DETAIL_LABELS` is hoisted outside the component so it is not rebuilt per render. The only remaining concern is the pre-existing in-place `.sort()` at `Home.jsx:44`, already tracked as F-06.
- Tests lens: `tests/browser/login.spec.js` is the only spec and asserts rendering only; no runner is configured, so `yarn build` and `yarn lint` are the whole automated signal. Tracked as F-09.
- Ledger gate: F-04 is `[P1] accepted` with the user's explicit reason recorded in its Resolution, so it does not block. No P0 or P1 entry is `open` or `fixed` anywhere in the ledger (F-03 invalid, F-05 P3 open, F-06 P3 unverified, F-07/F-08 P2 closed, F-09 P3 open).

## Findings

- None new. This pass added no ledger entries and changed no existing status: F-07 and F-08 remain correctly `closed` against this target, F-05 and F-09 remain `open` at P3, F-06 remains `unverified` at P3, and its remaining half (`Home.jsx:44` in-place sort) was re-confirmed unchanged.

## Remaining risk

- `yarn test:browser` was not run from this review session: it needs a live dev server, and the harness is excluded from `yarn verify` and CI, so no browser evidence backs this receipt.
- No unit or integration test runner is configured, so both halves of this contract migration are unverified by automation. F-09 tracks the auth half; the offer-shape half (`image`, `price`, `details.brand`/`size`, `createdAt` in Home and Offer) has the same silent-failure profile and the same absent coverage, and is not separately ticketed.
- The live `vinted-backend` was not reachable from this session, so the renamed routes, `accessToken`, and the flat offer shape were verified against the frozen spec's Data/contracts section and `Publish.jsx`, not against a running API.
- F-04 (P1, CheckoutForm never clears `isLoading` on a Stripe error) is accepted, not repaired. The defect is still live in `src/components/CheckoutForm/CheckoutForm.jsx:23-72` and remains a real checkout risk once build-plan item 6 ships.
- `offer.owner.account` is still read unguarded at `Offer.jsx:58` and `Home.jsx:49`. Pre-existing, untouched by this diff, and backed by the populated `owner` contract, so it is not tracked as a finding.
