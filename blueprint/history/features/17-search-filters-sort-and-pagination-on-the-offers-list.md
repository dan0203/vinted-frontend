# Feature: Search, filters, sort, and pagination on the offers list

**From build-plan:** feature 17
**Build attempt:** 1
**Status:** verified
**Branch:** `feature/search-filters-sort-and-pagination-on-the-offers-list`

## Goal

Replace Home's fully client-side, unfiltered offer list with server-driven
search, price filtering, sort, and pagination, so the existing header search
box actually does something and the list scales past one page of results.

## In scope

- Wire the existing Header search input (`search`/`setSearch`, currently owned
  by `App.jsx` and threaded to `Header` but never consumed anywhere) into
  Home's fetch as `?title=`.
- Add a price range filter (min/max) on Home, sent as `?priceMin=&priceMax=`.
- Add a sort control on Home with two explicit orders, `?sort=price-asc` and
  `?sort=price-desc`, replacing the current client-side
  `.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))`. With no
  sort selected, no `sort` param is sent (server default order applies).
- Add pagination using `?page=`, 20 offers per page, driven by the response's
  `count`/`page`/`totalPages` fields (Previous/Next plus a "page X / Y"
  indicator).
- Reset to page 1 whenever the search text, price filters, or sort change.
- An empty-results state ("no offers match") distinct from the error state.

## Out of scope

- Persisting filters in the URL (query string / back-button support) - no
  existing precedent (`useSearchParams`) elsewhere in the app; internal
  component state is enough for this iteration.
- Auto-navigating to `/` when the user types in the header search while on
  another page - the search box already renders on every route today with no
  effect at all, so this does not regress existing behavior.
- Offer status badges (item 18), multi-image gallery (item 19), favorites
  (item 21) - separate build-plan items.
- Changing `axios` to the shared `client` instance in `Home.jsx` - `GET
  /offers` is unauthenticated and every other unauthenticated page
  (`Offer.jsx`, `Signup.jsx`, `Login.jsx`, etc.) already calls `axios`
  directly; switching only `Home.jsx` would be an unrelated cleanup.

## Build loop

Build one small step at a time. Follow `workflow.stepReview` in
`blueprint/config.json` (currently `feature`): produce one review packet after
all steps are done, rather than pausing after each. `workflow.checkpointCommits`
is `disabled`, so no intermediate commits; `/complete` makes the final feature
commit. Never accept a review packet that hasn't been read; split any diff too
large to review.

## Build steps

- [x] **Step 1 - Wire search to `?title=`** - pass `search` from `App.jsx`
  into `Home` as a prop, and add it as a debounced (about 400ms, plain
  `setTimeout`/`clearTimeout` in the fetch effect, no new dependency) `title`
  query param on `GET /offers`. *Done when:* typing in the header search box
  while on `/` re-fetches the list filtered by that title after the user
  pauses typing, and clearing the box goes back to the unfiltered list.

- [x] **Step 2 - Price range filter** - add two number inputs ("Prix min" /
  "Prix max") on Home above the offer grid; include `priceMin`/`priceMax` in
  the query only when the field is non-empty and parses to a number. *Done
  when:* setting either or both fields re-fetches and only matching-priced
  offers are shown; clearing both fields removes the constraint.

- [x] **Step 3 - Server-side sort** - add a sort `<select>` ("Plus pertinents"
  default / "Prix croissant" / "Prix décroissant") next to the price filters,
  wired to `?sort=price-asc|price-desc` (omitted for the default). Remove the
  now-redundant client-side `.sort()` call. *Done when:* switching the sort
  option re-fetches and the returned order is used as-is (no client
  re-sorting), and the default option sends no `sort` param.

- [x] **Step 4 - Pagination** - track a `page` state (reset to 1 by steps 1-3),
  send `?page=`, and render Previous/Next buttons plus a "Page X / Y" label
  from the response's `page`/`totalPages`. Disable Previous on page 1 and Next
  on the last page. *Done when:* navigating pages fetches the requested page
  and the buttons disable correctly at both ends.

- [x] **Step 5 - Empty-results state** - when a successful response's `offers`
  array is empty, show a "Aucun article ne correspond a votre recherche."
  message instead of an empty grid (kept visually distinct from the existing
  error state). *Done when:* a search/filter combination with no matches shows
  that message, and clearing the filters restores the grid.

## Files / areas

- `src/pages/Home/Home.jsx`, `src/pages/Home/Home.css` - fetch logic, filter
  bar, sort control, pagination controls, empty state.
- `src/App.jsx` - pass `search` down to `<Home />`.
- `src/components/Header/Header.jsx` - unchanged; already exposes
  `search`/`setSearch`.

## Data / contracts

- `GET /offers` query params (all optional): `title` (string, substring
  match), `priceMin`/`priceMax` (numbers), `sort` (`price-asc` | `price-desc`,
  omit for default order), `page` (1-based integer, 20 per page per the
  build-plan contract).
- Response shape (per build-plan item 17 and the project data model): `{
  offers: Offer[], count, page, totalPages }`. `Offer` fields used here:
  `_id`, `name`, `price`, `details.size`, `details.brand`, `image.url`,
  `owner.account.{username,avatar}`, unchanged from the current contract.
- No persisted-data or auth boundary here: `GET /offers` is public and
  read-only.

## Testing

- No test runner is configured in this project (`AGENTS.md` Commands has no
  `test` entry), so this is verified by build (`yarn verify`) plus manual
  exercise against the running dev server: search, each price filter
  combination, each sort option, paging through a result set larger than 20,
  and a filter combination that returns zero offers.
- `Browser tests` is not declared in `AGENTS.md`, so no Playwright coverage is
  added for this feature.

## Notes for the AI

- Keep the existing `isLoading`/`error`/`ErrorMessage` pattern from
  `Home.jsx` unchanged; the empty-results state in step 5 is a third render
  branch alongside loading/error/list, not a replacement for either.
- Query params should only be included in the axios `params` object when they
  have a real value; do not send empty-string `title` or `NaN` price bounds.
- `details?.size` / `details?.brand` optional-chaining and the `image`/
  `owner.account.avatar` guards already in `Home.jsx` are unrelated to this
  feature; leave them as-is.


<!-- blueprint:completion {"schemaVersion":1,"specBytes":6539,"specSha256":"ca3872a25c43aff9fd5dd131bfb98a0a4542734a6ce8266e55cfed2781b26a7f","branch":"refs/heads/feature/search-filters-sort-and-pagination-on-the-offers-list","head":"a1fec774f9dd8526fb0777858a492621e89c84d6","baseRef":"refs/heads/master","baseCommit":"a1fec774f9dd8526fb0777858a492621e89c84d6","sourceTree":"7b04a5219f79ebb2be97a8ec25af28ca5b8829de","absentOptional":[]} -->

## Findings

### 17/F-06 [P3] closed - Home/Offer mutate fetched state objects in place during render

**File:** src/pages/Home/Home.jsx:53
**Found:** 2026-09-18 by /audit full (scope: full; lens: quality)
**Why it matters:** `Home.jsx` assigns `offer.productDetails = {}` and mutates
it while mapping over the `offers` state array inside the render body (not an
effect), and also calls `.sort()` on the `offers` state array in place, which
mutates React state directly rather than deriving a new array. `Offer.jsx`
does the same by pushing into `offerToDisplay.productDetails` after that
object is already the value passed to `setOffer`. This works today only
because each effect runs once and nothing else reads the pre-mutation shape,
but it is a real anti-pattern: mutating state in place breaks under
`StrictMode` double-invocation or any future code path that re-reads the
original fetched value, and doing it in the render body (`Home.jsx`) rather
than the effect mixes side effects into rendering. No currently observable
bug was reproduced, so this is unverified rather than a confirmed defect.
**Suggested fix:** Build the `productDetails` shape into a new local variable
inside the `fetchData` effect before calling `setOffers`/`setOffer`, and sort
into a new array (`[...offers].sort(...)`) instead of sorting in place. Note
both call sites are already flagged for a larger rework in build-plan item 8
(new flat `details` object replaces this array-reconstruction logic entirely),
so this may be superseded rather than fixed standalone.
**Resolution:** Re-examined 2026-09-18 by /audit independent (scope: current;
lenses: quality, security, performance, tests) against
`b4b966f..652e0be`. Partially superseded as predicted: build-plan item 8 landed
and deleted both `productDetails` reconstruction sites, so `Home.jsx` no longer
assigns to offer objects during render and `Offer.jsx` no longer pushes into an
object it already handed to `setOffer` (that whole block is gone, the effect now
calls `setOffer(response.data)` directly). One part remains: `Home.jsx:44` still
calls `.sort()` on the `offers` state array in place inside the render body
(only the sort key changed, `product_date` -> `createdAt`). Kept `unverified`
because no observable bug was reproduced; remaining fix is the
`[...offers].sort(...)` half of the original suggestion.
Re-examined 2026-09-18 by /audit (scope: current; lens: quality) against
feature 16 (`feature/consistent-loading-error-states`, working tree vs
`40dbe78`). The remaining `.sort()`-in-place call moved to `Home.jsx:53` (new
error-branch JSX added above it shifted the line); behavior and risk are
unchanged by this feature. Still `unverified`, file reference updated.
Re-examined 2026-09-19 by /audit (scope: current; lens: quality) against
feature 17 (`feature/search-filters-sort-and-pagination-on-the-offers-list`,
working tree vs `master`@`a1fec77`). The remaining in-place `.sort()` call is
gone: feature 17 replaced client-side date sorting with the server's
`?sort=price-asc|price-desc`, so `Home.jsx` now renders `offers.map(...)`
directly with no sort call at all, in-place or otherwise. Closing: the
underlying anti-pattern this finding tracked no longer exists in the code.

### 17/F-14 [P2] closed - Home's initial offer fetch is delayed by the search/filter debounce

**File:** src/pages/Home/Home.jsx:22-59
**Found:** 2026-09-18 by /audit (scope: current; lens: quality)
**Why it matters:** The single fetch effect wraps every `GET /offers` call in a
400ms `setTimeout`, added for feature 17 (search debounce) so typing doesn't
fire a request per keystroke. That timeout also fires on the component's first
mount, since `page`/`search`/`priceMin`/`priceMax`/`sort` are all effect
dependencies and the effect runs unconditionally on mount like any other.
Before this feature, Home's first fetch started immediately; now every visit to
`/` shows "Chargement en cours..." for at least 400ms longer than necessary,
with no user input to debounce yet. This is a plain, always-reproducible
regression, not a timing-dependent edge case: load `/` once and the delay is
there on every load.
**Suggested fix:** Skip the timeout on the first effect run (a `useRef`
"has mounted" flag, or splitting the initial fetch out of the debounced path)
so only fetches triggered by an actual search/filter/sort/page change are
delayed. No new dependency needed.
**Resolution:** Fixed 2026-09-18. `Home.jsx` now tracks an `isFirstRun` ref;
the effect calls `fetchData()` immediately on the first run and only wraps
later runs (triggered by a search/filter/sort/page change) in the 400ms
`setTimeout`. Re-examined 2026-09-19 by /audit (scope: current; lens: quality)
against `Home.jsx:25-63`: confirmed the first effect run calls `fetchData()`
synchronously with no `setTimeout`, and only the branch reached on later runs
schedules the 400ms delay. Manually re-verified `/` loads without an added
delay. Closed.

### 17/F-15 [P2] closed - No stale-response guard on Home's debounced offers fetch

**File:** src/pages/Home/Home.jsx:22-59
**Found:** 2026-09-18 by /audit (scope: current; lens: performance)
**Why it matters:** Each debounced fetch is a plain `axios.get` with no
`AbortController` and no request-id/generation check before `setOffers`/
`setPageCount` run in `.then`. The 400ms debounce cancels a *scheduled* fetch
that hasn't fired yet (via the effect's `clearTimeout` cleanup), but once two
requests are actually in flight - which happens whenever the network round
trip takes longer than the gap between two user actions (e.g. clicking
"Suivant" twice, or a slow connection) - nothing stops an older response from
resolving after a newer one and overwriting its state with stale offers/page
count. This is a real, present gap in the code (no cancellation or staleness
check exists), but reproducing the wrong-render-wins case needs an artificially
slow or reordered network, so it is unverified rather than confirmed.
**Suggested fix:** Track a ref that increments per effect run (or an
`AbortController` per fetch, aborted in the cleanup function) and ignore a
response whose token no longer matches the latest one before calling
`setOffers`.
**Resolution:** Fixed 2026-09-18. `Home.jsx` now tracks a `requestIdRef`
counter, incremented once per effect run; the fetch captures its own
`requestId` and every `setOffers`/`setPageCount`/`setError`/`setIsLoading`
call checks it still matches `requestIdRef.current` before writing state, so a
response from a superseded request is ignored. Re-examined 2026-09-19 by
/audit (scope: current; lens: performance) against `Home.jsx:25-63`: the
guard is present and correctly placed before every state write in both the
success and error branches, and `finally` only clears `isLoading` when the
request is still current. The underlying race (needing an artificially
slow/reordered network) was not independently reproduced or given a dedicated
regression test, but the code-level fix matches the suggested fix exactly.
Closed on code inspection.

### 17/F-16 [P2] closed - No browser-test coverage added for feature 17's search/filter/sort/pagination flows

**File:** tests/browser/ (no new file)
**Found:** 2026-09-18 by /audit (scope: current; lens: tests)
**Why it matters:** `Browser tests: yarn test:browser` is declared in
`AGENTS.md` and already covers this exact page (`tests/browser/home.spec.js`,
the stuck-spinner regression test), so there is a live precedent and harness
for Home. Feature 17 adds five new observable behaviors on this same page
(title search, price-range filtering, server-side sort, pagination, and the
empty-results state) with no persisted test exercising any of them; the only
verification was an ad-hoc `/check` spec that was deliberately deleted after
the run. A future change to the fetch/query-building logic (including the 17/F-14
or 17/F-15 fixes above) has no automated guard against silently breaking one of
these five behaviors.
**Suggested fix:** Add a `tests/browser/home-filters.spec.js` alongside the
existing `home.spec.js`, reusing its `page.route('**/offers', ...)` mocking
pattern to assert the `title`/`priceMin`/`priceMax`/`sort`/`page` query params
are sent correctly and that the empty-results message and pagination
disabled-states render as specified. Proportional given the existing
`Browser tests` command and direct precedent on this page; not a request to add
a test runner or new tooling.
**Resolution:** Fixed 2026-09-18. Added `tests/browser/home-filters.spec.js`
covering all five behaviors (search/title, price range, sort, pagination,
empty-results), plus updated the pre-existing `tests/browser/home.spec.js`
route glob (`**/offers` -> `**/offers*`) since every request now always sends
a `page` query param. Full `yarn test:browser` run 3x clean (32/32) to rule
out flakiness.
Re-examined 2026-09-19 by /audit (scope: current; lens: tests) against
`tests/browser/home-filters.spec.js`: coverage for all five behaviors exists
as described, so the original absence this finding tracked is resolved.
Kept at `fixed` rather than `closed`: three of the five new tests (search,
price filter, sort) assert against the real local backend's live data
instead of mocking `**/offers*` like the fourth and fifth tests (pagination,
empty-results) already do in the same file. That gap in the fix is tracked
separately as 17/F-17, since it is a distinct defect in the new file rather than
the original missing-coverage problem.
Re-examined 2026-09-19 by /audit (scope: current; lens: tests) after 17/F-17 was
fixed: all five tests in `home-filters.spec.js` now mock `**/offers*`, so the
file no longer depends on the real backend at all. Closing: the original gap
(no coverage) and its knock-on defect (live-data coupling) are both resolved.

### 17/F-17 [P2] closed - New Home filter/sort/search tests assert against live backend data instead of mocking, and one can pass vacuously

**File:** tests/browser/home-filters.spec.js:9-79
**Found:** 2026-09-19 by /audit (scope: current; lens: tests)
**Why it matters:** Three of the five tests added for 17/F-16
("search filters...", "price range filter...", "sort select...",
lines 9-29, 31-51, 53-79) call `page.route('**/offers*', ... route.continue())`
or nothing at all and read real results from whatever the local dev backend
currently has seeded, unlike the other two tests in the same file
(pagination, empty-results) which fully mock the response with
`route.fulfill(...)`. Two concrete problems follow:
1. The price-filter test's assertion is a `for` loop over the returned prices
   (lines 41-45) with no assertion that the loop ran at least once. If the
   live dataset happens to have zero offers priced 100-130 at the moment the
   suite runs, the loop body never executes and the test passes without
   checking anything, so a broken `priceMin`/`priceMax` param would not be
   caught.
2. All three tests are coupled to specific live content (an offer whose name
   contains "Robe", at least one offer priced 100-130, more than one distinct
   price for the sort check) that nothing in the test file establishes or
   guarantees; they will start failing or silently stop testing anything the
   moment the seeded data changes shape, which is expected to happen soon
   (per this session's separate discussion of reseeding with 100 offers).
**Suggested fix:** Mock `**/offers*` with `route.fulfill(...)` in these three
tests too, the same way the pagination and empty-results tests already do,
returning a small fixed fixture (a few named offers with known, spread-out
prices). That removes the vacuous-loop risk and the coupling to whatever data
happens to be seeded, and matches the file's own established pattern rather
than depending on the real backend at all.
**Resolution:** Fixed 2026-09-19. All five tests now install a shared
`installOffersMock()` helper that fully mocks `**/offers*` against a fixed,
intentionally price-unsorted 3-item fixture (`FIXTURE_OFFERS`, prices
40/120/25), filtering/sorting it the same way the real backend does. Every
assertion now checks an exact expected count or exact price order instead of
a loop that could run zero times, and none of the five tests depend on the
real backend being up or seeded any particular way. Re-run `tests/browser/`
5x (4 full 32-test runs plus one earlier before this fix) with only one
unrelated one-off failure in the (untouched) pagination test under 4-worker
parallel load, not reproducible in isolation or on later full runs; not
attributable to this change. Re-reviewed, see 17/F-16.
Confirmed 2026-09-19 by a formal `/audit` pass (scope: current; all lenses)
against the same file: no weak assertions, shared state, or live-data coupling
remain across all five tests; `installOffersMock()` and the two helper
functions read cleanly with no duplication concern beyond ordinary test
fixture code. `yarn lint`, `yarn verify`, and `home.spec.js` +
`home-filters.spec.js` (6/6) re-run clean.
