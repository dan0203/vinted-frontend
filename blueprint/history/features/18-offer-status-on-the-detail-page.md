# Feature: Offer status on the detail page

**From build-plan:** feature 18
**Build attempt:** 1
**Status:** verified

**Branch:** `feature/offer-status-on-the-detail-page`

## Goal

On `/offers/:id`, show the offer's `status` to the visitor and stop the "Acheter"
button from being usable when the offer is not `available`, since a reserved or
sold offer cannot actually be bought.

## In scope

- Read `offer.status` from the existing `GET /offers/:id` response (already
  fetched in `Offer.jsx`; no new request).
- When `status` is `reserved` or `sold`, render a badge with the matching French
  label ("Réservé" / "Vendu") next to the price.
- When `status` is not `available` (covers `reserved`, `sold`, and any other
  unexpected value defensively), replace the "Acheter" `Link` + button with a
  plain disabled `<button>` carrying the same label, so there is no anchor left
  to navigate to `/payment`. A disabled button nested inside a `Link` would
  still navigate on click, so the fix removes the `Link` for this state rather
  than only disabling the inner button.
- When `status` is `available` (or missing, e.g. a fixture without the field),
  keep today's `Link to="/payment"` + button exactly as is.

## Out of scope

- Any change to `/payment`, `Payment.jsx`, or `CheckoutForm.jsx` - the actual
  purchase flow is unrelated to display/gating on the detail page (build-plan
  item 6, separately blocked on backend work).
- Filtering `status` on the offers list (`Home.jsx`); the backend already
  excludes sold offers from `GET /offers` by default per the documented
  contract, and reserved-offer list treatment is not part of this feature.
- Any owner-only status change action (edit/delete/status transitions are
  build-plan item 23).
- A card-level badge on `Home.jsx`; this feature only covers the detail page,
  matching the build-plan line.

## Build loop

Build one small step at a time. Follow `workflow.stepReview` in
`blueprint/config.json` (currently `feature`: one review packet after all
steps). `workflow.checkpointCommits` is `disabled`, so no checkpoint commits
between steps. `/complete` makes the final feature commit. Never accept a
review packet that hasn't been read; split any diff too large to review.

## Build steps

- [x] **Step 1 - Status badge and disabled Buy button** - In
  `src/pages/Offer/Offer.jsx`, add a `STATUS_LABELS` map (`reserved`:
  `'Réservé'`, `sold`: `'Vendu'`). Render `{offer.status && offer.status !==
  'available' && <span className="offer-status-badge">{STATUS_LABELS[offer.status]
  ?? offer.status}</span>}` next to `product_price`. Replace the existing
  `<Link to="/payment" state={...}><button>Acheter</button></Link>` block with
  a conditional: when `offer.status === 'available' || !offer.status`, keep
  that `Link`/button unchanged; otherwise render `<button disabled>Acheter</button>`
  with no `Link` wrapper. Add matching `.offer-status-badge` and
  `button:disabled` rules to `src/pages/Offer/Offer.css` consistent with the
  existing `button:disabled` styling already used in `Home.css` /
  `ResetPassword.css` (grayed border/text, `cursor: not-allowed`).
  *Done when:* `yarn build` and `yarn lint` succeed, and loading `/offers/:id`
  with a mocked `status: 'sold'` response shows the "Vendu" badge and a
  disabled "Acheter" button with no surrounding link, while a mocked
  `status: 'available'` response (or a response with no `status` field) shows
  the existing clickable "Acheter" link unchanged.
- [x] **Step 2 - Browser coverage** - Add two tests to
  `tests/browser/offer.spec.js`, following its existing pattern of mocking
  `**/offers/*`: one mocks a full offer body with `status: 'sold'` and asserts
  the "Vendu" text is visible and the "Acheter" button is disabled; one mocks
  `status: 'available'` and asserts the "Acheter" button is enabled and still
  wrapped in a link to `/payment`.
  *Done when:* `yarn test:browser tests/browser/offer.spec.js` passes.

- [x] **Step 3 - Repair F-14 and F-15 (audit findings)** - F-14: the existing
  third test in `tests/browser/offer.spec.js` ("shows an error message instead
  of a stuck spinner...") mocks `**/offers/*`, which also intercepts the
  top-level navigation to `/offers/:id` itself, so the page never actually
  mounts React and the assertion passes only because the mocked JSON body
  happens to contain the same French string. Change that route to
  `http://localhost:3000/offers/*` (matching the two tests from Step 2), and
  add an assertion that `page.getByRole('heading')`-free ErrorMessage markup is
  actually present (e.g. assert the app root rendered, not just the text) so a
  future collision cannot silently pass again. F-15: add a one-line comment
  above each `page.route('http://localhost:3000/offers/*', ...)` call in this
  file explaining that the host-qualified pattern is required because
  `/offers/:id` collides with the frontend's own route under the plain
  `**/offers/*` glob (see F-14).
  *Done when:* `yarn test:browser tests/browser/offer.spec.js` passes, and
  temporarily reverting the third test's route back to `**/offers/*` makes it
  fail (proving the fixed assertion actually detects the collision).

## Files / areas

- `src/pages/Offer/Offer.jsx` - badge rendering and conditional Buy control.
- `src/pages/Offer/Offer.css` - badge and disabled-button styling.
- `tests/browser/offer.spec.js` - new coverage for both statuses.

## Data / contracts

- `offer.status` is `'available' | 'reserved' | 'sold'` per the documented
  `Offer` data model; this feature only reads it, no request or route changes.
- No new fields are sent to the backend; the Buy button's disabled state is
  purely a client-side rendering rule derived from the already-fetched offer.

## Testing

- No unit test runner is configured, and this feature has no
  parser/formatter/validator logic, so no unit tests are added.
- `yarn build` and `yarn lint` are the available automated checks; run both
  after each step.
- `Browser tests` (`yarn test:browser`) is declared in `AGENTS.md`; add the
  coverage in Step 2 and run
  `yarn test:browser tests/browser/offer.spec.js` before considering it done.

## Notes for the AI

- Keep all new UI text in French, no em dashes.
- Do not touch the existing error/loading branches in `Offer.jsx`; only the
  success-render branch changes.
- Mock a complete offer body in the new tests (including `owner.account` and
  `details`) matching the shape `Offer.jsx` already destructures, since the
  component reads `offer.owner.account.username` unconditionally.


<!-- blueprint:completion {"schemaVersion":1,"specBytes":6568,"specSha256":"6e4314eb134262d098a24080f382d32f00a26f42c33f7aef7b84eec68127acde","branch":"refs/heads/feature/offer-status-on-the-detail-page","head":"8137ff5e4075322afd9a566a0086ea71fe5daea5","baseRef":"refs/heads/master","baseCommit":"8137ff5e4075322afd9a566a0086ea71fe5daea5","sourceTree":"1fdd500b83f1e36bb2c9ddec6a88ec3e41d6959e","absentOptional":[]} -->

## Findings

### 18/F-14 [P1] closed - offer.spec.js's error-state test never actually runs the React app

**File:** tests/browser/offer.spec.js:51-66 (pre-existing, unchanged by feature 18)
**Found:** 2026-09-19 by /audit (scope: current; lens: tests)
**Why it matters:** The test mocks `**/offers/*` and then calls
`page.goto('/offers/64a000000000000000000000')`. That glob also matches the
top-level document request for the frontend's own `/offers/:id` route, not just
the backend API call, because Playwright's `page.route` intercepts navigation
requests the same as XHR/fetch. Reproduced directly: with that mock installed,
`document.getElementById('root')` never mounts (`hasReactRoot: false`) and
`document.body.innerText` is the raw JSON string
`{"message":"Cette offre n'existe pas."}` - the browser navigated straight to
the mocked JSON response instead of loading `index.html`. The test's assertion
`getByText("Cette offre n'existe pas.")` still passes only because that exact
French sentence happens to appear verbatim inside the raw JSON body, and
`getByText('Chargement en cours...')` trivially passes `not.toBeVisible()` on a
page with no React tree at all. The test has provided zero real coverage of
`Offer.jsx`'s error branch (`ErrorMessage` rendering, spinner clearing) since it
was written for build-plan item 16; a regression that broke that error branch
entirely would not be caught by this test.
**Suggested fix:** Scope the route to the API origin instead of the frontend's
own path, matching the fix already applied for feature 18's two new tests in the
same file (`http://localhost:3000/offers/*` instead of `**/offers/*`), or filter
by `route.request().resourceType() !== 'document'`. After the fix, verify the
test still passes with `hasReactRoot: true` and the message rendered inside the
actual `ErrorMessage` component, not the raw response body.
**Resolution:** Fixed in feature 18, Step 3: the test's route now uses the
shared `API_URL` constant (`${API_URL}/offers/*`) instead of `**/offers/*`, and
all three tests in the file now assert `page.locator('main.main-offer')` is
visible before checking their specific content, proving the app actually
mounted. Falsification check: temporarily reverting this test's route back to
`**/offers/*` made it fail on the new `main.main-offer` assertion (confirmed via
`yarn test:browser tests/browser/offer.spec.js -g "shows an error message"`),
proving the fix actually detects the collision. `yarn build`, `yarn lint`, and
the full `offer.spec.js` suite (3/3) pass. Re-reviewed 2026-09-19 by `/audit`
(scope: current; all lenses): re-ran the same falsification independently
(reverted the third test's route to `**/offers/*`, confirmed it failed on the
`main.main-offer` assertion, restored it, confirmed 3/3 pass again), re-read the
full diff fresh, and confirmed the repair introduced no new defect. Closed.

### 18/F-15 [P3] closed - Feature 18's route-mock origin literal is undocumented and duplicated

**File:** tests/browser/offer.spec.js:18, tests/browser/offer.spec.js:33
**Found:** 2026-09-19 by /audit (scope: current; lens: quality)
**Why it matters:** Both new tests hardcode `http://localhost:3000/offers/*`
instead of the `**/offers/*` glob convention every other spec file in
`tests/browser/` uses (see `home.spec.js:6`, `home-filters.spec.js:20,163`,
`silent-token-refresh.spec.js:32,64`). The deviation is deliberate and correct
(it avoids the exact collision described in F-14, since `/offers/:id` is both a
frontend route and an API path), but nothing in the file says so. A later editor
matching the file's own third test (`offer.spec.js:54`, still on the old glob)
could "clean up" the two new tests back to the broken pattern, silently
reintroducing F-14's failure mode in tests that currently work correctly. The
literal is also duplicated across two tests with no shared constant tying it to
`.env`'s `VITE_API_URL=http://localhost:3000`.
**Suggested fix:** Extract a `const API_URL = 'http://localhost:3000';` (or a
short comment above each `page.route` call) explaining that the host-qualified
pattern is required here specifically because the page and API paths collide
under `**/offers/*`, per F-14. No shipped behavior changes; this is
test-file-only cleanup.
**Resolution:** Fixed in feature 18, Step 3: added a shared `const API_URL =
'http://localhost:3000'` used by all three `page.route` calls in the file, with
a comment above it explaining the collision with F-14. `yarn lint` passes.
Re-reviewed 2026-09-19 by `/audit` (scope: current; all lenses): confirmed the
constant is the single source used by all three tests and the explanatory
comment is present and accurate. Closed.
