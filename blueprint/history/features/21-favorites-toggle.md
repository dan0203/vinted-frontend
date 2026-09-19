# Feature: Favorites toggle

**From build-plan:** feature 21
**Build attempt:** 1
**Status:** verified
**Branch:** `feature/favorites-toggle`

## Goal

Let a signed-in user add or remove an offer from their favorites with one click,
from both the offer card on the home list and the offer detail page, with the
control reflecting the real server state and reacting optimistically.

## In scope

- A reusable heart toggle control, rendered on each Home offer card and on the
  offer detail page.
- Reading the signed-in user's `_id` so the favorites routes can be addressed.
- Loading the user's current favorites once per page so the control starts in
  the right state.
- Optimistic toggle: flip immediately, reconcile from the server response, roll
  back and show an error on failure.
- Hiding the control entirely when the user is not signed in.

## Out of scope

- The `/favorites` page (build-plan item 22). This feature adds no route.
- Any owner action, offer edit, status change, or profile work (items 23 to 27).
- Changing how the session bootstraps on a cold page load. Today the app starts
  with no in-memory token after a reload and therefore renders as signed out;
  that is existing behavior and this feature must not try to fix it.
- Gating the toggle on offer status. A `sold` or `reserved` offer can be
  favorited, so this must not reuse feature 18's availability rule.

## Build loop

`workflow.stepReview` is `feature`: implement both build steps, then stop for a
single review of the whole feature. `workflow.checkpointCommits` is `disabled`,
so do not commit between steps; `/complete` creates the one feature commit.

## Build steps

- [x] **1. Current-user id, favorites hook, and the detail-page control.**

  Add a `getUserId()` export to `src/api/client.js` that reads the `sub` claim of
  the in-memory access token and returns `null` when there is no token or the
  payload cannot be parsed. Derive it from the token rather than storing the
  `_id` that login returns, because `POST /users/refresh` returns only
  `accessToken`: a separately stored id would go stale the moment the silent
  refresh replaces the token. Decode base64url (`-` and `_`) with `atob`; add no
  dependency. This value only addresses the client's own requests, so an
  unverified decode is fine: the backend still authorizes and answers 403 on a
  mismatched id.

  Add `src/utils/useFavorites.js` next to the existing `useBrokenUrls.js`,
  following the same shape (a hook returning a small read helper plus stable
  callbacks). It must:
  - do nothing and report itself unavailable when `getUserId()` is `null`;
  - otherwise `GET /users/:id/favorites` once through `src/api/client.js` with
    `skipAuthRedirect: true`, so a background favorites read that cannot refresh
    never yanks a browsing user to `/login`, and keep the returned offer `_id`s
    as a Set;
  - report itself unavailable if that read fails, so the caller renders no
    control at all rather than a dead one;
  - expose `isFavorite(offerId)`, a `toggle(offerId)` that flips local state
    first then calls `POST` or `DELETE /users/:id/favorites/:offerId` through the
    same client, reconciles from the response's `favorites` array, and on failure
    restores the previous Set and exposes the error for display.

  Corrected during build step 3: this originally said the toggle "replaces the
  Set from the response's `favorites` array (the authoritative id list)". That
  wording is what produced finding F-27, and it is wrong. The returned list is
  the server's view at the instant it answered, so it omits any other offer whose
  own request is still open, and replacing the whole Set with it drops that
  offer's flip. The list is authoritative only about the offer the request was
  for. See build step 3.

  Add `src/components/FavoriteButton/FavoriteButton.jsx` and its `.css`. It is an
  icon-only toggle: `HiHeart` when favorited and `HiOutlineHeart` otherwise (both
  from `react-icons/hi2`, already a dependency and already the icon set used by
  `Header.jsx`), `aria-pressed` reflecting the state, and an accessible name of
  `Retirer des favoris` when favorited and `Ajouter aux favoris` otherwise. While
  the favorites Set has not loaded yet the button renders unfavorited and
  `disabled`, so no toggle can start from an unknown baseline and produce a wrong
  optimistic flip.

  Wire it into `src/pages/Offer/Offer.jsx` in the `aside`, near the price and the
  Buy button, and render `ErrorMessage` for a failed toggle. Leave the offers
  fetch on raw `axios` as it is; it is public and needs no auth.

  Add browser coverage in `tests/browser/favorites.spec.js` following the
  existing `offer.spec.js` pattern: host-qualify every route to
  `http://localhost:3000` (a bare `**/offers/*` glob also matches the app's own
  navigation), stub the offer, the favorites read, and the toggle call.

  Done when, on `/offers/:id` with a signed-in session: the heart is absent when
  signed out, shows the offer's real favorited state once loaded, flips
  immediately on click, and reverts with a visible French error when the toggle
  call fails. `yarn verify` and `yarn lint` pass, and the new cases in
  `yarn test:browser` pass.

  Corrected during implementation: this step originally asked for the state to
  "still match the server after a reload of the page". That cannot be observed
  in this app and contradicts the Out of scope note above, because the access
  token lives only in memory, so a reload signs the user out and removes the
  control. The reachable equivalent, covered instead, is that the flip survives
  leaving the page and coming back to the list, which proves it reached the
  server rather than only local state.

- [x] **2. The control on the Home offer card.**

  Render the same `FavoriteButton` on each card in `src/pages/Home/Home.jsx`,
  sharing one `useFavorites` instance for the whole list so the page makes a
  single favorites read rather than one per card.

  The card is currently `<Link><article>...</article></Link>`
  (`src/pages/Home/Home.jsx:138-165`), so a button cannot simply be dropped
  inside: a `<button>` nested in an `<a>` is invalid HTML and a click would
  navigate to the offer. Restructure to `<article>` containing the `<Link>` and
  the button as siblings, and move the grid sizing accordingly: `.main-home a`
  currently carries `width: calc((100% - 48px) / 5)` while `.main-home article`
  is `width: 100%` (`src/pages/Home/Home.css:98-106`). The grid item must end up
  being the `article`. Position the heart over the card corner and keep the
  existing card metrics unchanged.

  Show one shared `ErrorMessage` for a failed toggle rather than one per card.

  Add the Home cases to `tests/browser/favorites.spec.js`.

  Done when, on `/`: signed out shows no hearts; signed in shows the correct
  state per card; clicking a heart toggles it without navigating to the offer;
  clicking anywhere else on the card still opens it; the card grid still lays out
  five per row as before. `yarn verify` and `yarn lint` pass, and
  `yarn test:browser` passes.

- [x] **3. Reconcile per offer instead of replacing the whole list (finding F-27).**

  Raised by the independent review of checkpoint `843041e`. On success the hook
  does `setFavoriteIds(new Set(response.data.favorites ?? []))`, gated by a
  request counter so only the newest answer may do it. Both halves are wrong for
  the same reason: the answer describes the server at the instant it replied, so
  it cannot know about another offer whose request is still open. Clicking card A
  then card B, with B answering first while the server has not applied A yet,
  sends A's heart back to unfavorited while A's own `POST` is still in flight,
  and A's later answer is then dropped as stale.

  Apply the response only to the offer its request was about:
  `setFavoriteIds(current => flip(current, offerId, confirmed.has(offerId)))`,
  where `confirmed` is the returned id list. That keeps the server as the truth
  for this offer, which is the part the request actually settles, and leaves
  every other offer to its own toggle. Cross-offer interference then cannot
  happen at all, so `requestIdRef` becomes dead and must be removed rather than
  left as reassuring but inert machinery. `pendingIds` stays: it is what keeps
  one offer from having two requests open at once.

  Add a regression test with a hostile stub, since the existing F-24 test drives
  this interleaving but answers the second request with a list that already
  contains the first offer, which is the friendly ordering that hides the bug.

  Done when, on `/`: clicking two hearts in quick succession leaves both pressed
  even when the second answer omits the first offer and the first answer arrives
  last. `yarn verify` and `yarn lint` pass, and `yarn test:browser` passes.

- [x] **4. Review cleanups (findings F-28, F-29, F-30).**

  Raised by the independent review of checkpoint `c001c79`, all three P3.

  **F-28**, `Home.jsx`: the list renders one shared `ErrorMessage` above the
  grid, as step 2 asks, but with five cards per row a heart on the fourth row
  reverts with its only explanation outside the viewport, which reads as the
  click having done nothing. Keep the single shared message and bring it to the
  user: an effect on `favorites.error` calling `scrollIntoView({ block: 'center' })`
  on the message container. Step 2's contract is unchanged.

  **F-29**, `favorites.spec.js`: every fixture was `status: 'available'`, so the
  rule this spec states most explicitly, that a `sold` or `reserved` offer can
  still be favorited, was the one rule no check would notice breaking. Add a case
  stubbing the detail route with `status: 'sold'` and asserting the heart works
  beside a disabled Acheter. This is a coverage gap, not a defect: the behavior
  was already verified live during `/check`.

  **F-30**, `useFavorites.js`: `toggle` was wrapped in `useCallback` with deps
  that change on every flip, settle and rollback, while both call sites wrap it
  in a fresh arrow and nothing reads its identity. It copied `useBrokenUrls`'s
  shape without the `[]` that earned it, so it advertised a stability the code
  does not have. Declare it as a plain async function.

  Done when: a failed toggle on a card below the fold scrolls its message into
  view; a `sold` offer shows a disabled Acheter and a working heart; `toggle` is
  a plain function. `yarn verify` and `yarn lint` pass, and `yarn test:browser`
  passes.

- [x] **5. Second review cleanups (findings F-31, F-32).**

  Raised by the independent review of checkpoint `4d224d4`, both P3.

  **F-32**, `Home.jsx`: `favorites.error` was cleared in one place only, the
  start of the next toggle, so a failure stayed pinned above the grid, still
  scrolled into view, after a search or a page change replaced the offers under
  it. The message belongs to the list the failure happened on. Expose a
  `clearError` from the hook and call it when the offers request succeeds. This
  one earns its `useCallback`, unlike `toggle`, because it sits in that effect's
  dependency array.

  **F-31**, `favorites.spec.js`: step 2 asks for one favorites read for the whole
  list rather than one per card, and the code does that, but nothing observed it:
  moving `useFavorites()` into the card body would have turned 1 request into N
  with every case still green. Make `stubFavorites` return a hit counter and
  assert `1` in the twenty-card case.

  Done when: a toggle failure message disappears once a search loads a new list,
  and the twenty-card case asserts exactly one favorites read. `yarn verify` and
  `yarn lint` pass, and `yarn test:browser` passes.

## Files / areas

- `src/api/client.js` - add `getUserId()`.
- `src/utils/useFavorites.js` - new hook.
- `src/components/FavoriteButton/FavoriteButton.jsx` + `.css` - new component.
- `src/pages/Offer/Offer.jsx` - render the control in the `aside`.
- `src/pages/Home/Home.jsx` + `src/pages/Home/Home.css` - render the control,
  restructure the card wrapper and move the grid width rule.
- `tests/browser/favorites.spec.js` - new browser coverage.

## Data / contracts

Verified live against `http://localhost:3000` on 2026-09-19, seeded account
`jo.pires@example.com` (seed password `Seed1234!`), with the probe's favorite
added and removed again so the seed was left as found.

- `POST /users/login` returns `{ _id, accessToken, account: { username } }`.
- `POST /users/refresh` returns `{ accessToken }` only, with no `_id`. This is
  why the id comes from the token.
- The access token's JWT payload carries `sub`, equal to the user's `_id`
  (checked against the `_id` from the same login response).
- `GET /users/:id/favorites` returns `{ favorites: [ ...populated Offer
  documents ] }`, full offers rather than ids, and includes `reserved` and
  `sold` offers. Requires auth: 401 unauthenticated.
- `POST /users/:id/favorites/:offerId` returns 200 with
  `{ favorites: [ ...offer id strings ] }`. Note the asymmetry with the read
  above: the toggle responses carry ids, not documents.
- `DELETE /users/:id/favorites/:offerId` returns 200 with the same id-array
  shape.
- Both are idempotent: a repeated `POST` on an already-favorited offer and a
  repeated `DELETE` on an absent one both return 200.
- `:id` other than the authenticated user returns 403; unauthenticated returns
  401.

All authenticated calls go through `src/api/client.js`, which already sets
`withCredentials: true`, attaches the bearer token, and handles the 401 refresh
and replay.

## Testing

No `test` command is declared in `AGENTS.md`, so unit tests are not a gate here
and none are added. `Browser tests` is declared (`yarn test:browser`), and this
feature is exactly the click-driven, auth-dependent, client-state behavior the
standards call out for browser evidence, so both steps ship focused Playwright
coverage in `tests/browser/favorites.spec.js`: signed-out absence, correct
initial state, optimistic flip, rollback on a failed call, and (step 2) the
click not navigating.

Browser tests are not part of `yarn verify` or CI; run them with the documented
command during `/check`. `yarn verify` was green on `master` before this spec.

## Notes for the AI

- UI copy is French.
- Do not add a state library, a context provider, or a new dependency. One hook
  used by the two pages in this feature is the whole abstraction budget.
- The heart is deliberately hidden, not disabled, when the user is signed out or
  when the favorites read fails. A disabled icon-only control with no
  explanation is worse than no control, and the app has no tooltip pattern. The
  build-plan line allows either.
- Do not couple the control to `offer.status`.
- `Home.jsx` fetches offers with raw `axios` because that endpoint is public.
  Keep it that way; only the favorites calls use `src/api/client.js`.
- Offer images are unrelated to this feature: leave `imageUrl`, `useBrokenUrls`,
  and the `Home.jsx:145` `url` versus `secure_url` drift alone. That drift is a
  known separate `/fix` recorded in
  `blueprint/reference/api-offer-response.md`.


<!-- blueprint:completion {"schemaVersion":1,"specBytes":15438,"specSha256":"4cb5dbc0ade05b93830704562f907b3d9595c3d72475b0cf0fe1e5aed1170b99","branch":"refs/heads/feature/favorites-toggle","head":"c6ec52335d24cf7df646f380956dbe68ae72847e","baseRef":"refs/heads/master","baseCommit":"36dfb31988e7a4afc7d219a3faf643c8eb021b09","sourceTree":"f2b8cd4fc5a25b1a2ed7ba0a9cc5753cb74a6db2","absentOptional":[]} -->

## Findings

### 21/F-23 [P3] closed - Home calls imageUrl four times for one card image

**File:** src/pages/Home/Home.jsx:144-155
**Found:** 2026-09-19 by /audit (scope: current; lens: quality)
**Why it matters:** The card block calls `imageUrl(offer.image)` in the
condition, in `src`, in `onError` and again to choose between
`Image indisponible` and `Pas de photo`. The function is pure and cheap, so this
is readability rather than cost: the reader has to notice that all four calls
return the same value to see that the branch is really "one url, three states".
`Avatar.jsx:11` shows the shape this should have, binding
`const url = usable(imageUrl(account.avatar))` once. Not introduced by the
useBrokenUrls extraction, which kept the call count it found.
**Suggested fix:** Give the map callback a body and bind the url once:
`offers.map(offer => { const url = imageUrl(offer.image); return (...); })`, then
use `usable(url)`, `src={url}` and `markBroken(url)`. The placeholder text keeps
reading `url` to distinguish a dead url from an absent one.
**Resolution:** Still open after feature 21. Re-examined 2026-09-19: the card
block was restructured (the `<Link>` and `<article>` swapped places) but the four
`imageUrl(offer.image)` calls were carried over unchanged. Line reference updated
from 144-155 to 158-167. Fixed 2026-09-19: the map callback now has a block body
binding `const url = imageUrl(offer.image)` once, and `usable(url)`, `src={url}`,
`markBroken(url)` and the placeholder branch all read it. Closed 2026-09-19 by
the independent review of 843041e: `src/pages/Home/Home.jsx` was in the reviewed
set, line 150 binds the url once inside the map callback's block body, and lines
163, 165, 167 and 171 are its only readers. One call per card confirmed, and the
placeholder still distinguishes a dead url from an absent one, so the repair
changed no behavior and introduced no new defect.

### 21/F-24 [P1] closed - A slow favorites toggle overwrites a newer one

**File:** src/utils/useFavorites.js:51-81
**Found:** 2026-09-19 by /audit (scope: current; lens: quality)
**Why it matters:** `toggle` has no in-flight guard and no request sequencing, so
the response that lands last wins rather than the request that was sent last.
Two reachable sequences break the feature's core contract, that the heart
reflects the real server state:

1. Double-click one heart. Click 1 sends `POST` (optimistic add), click 2 sends
   `DELETE` (optimistic remove). If the `POST` response lands second, line 76
   writes the server's *older* list back and the heart shows favorited while the
   offer is not. Nothing disables the button between the two clicks.
2. Click two different hearts in the list. Each `toggle` closes over the
   `favoriteIds` it captured (line 78 restores that captured snapshot on error),
   so a failure on the first can also wipe the second.

The divergence persists until the component remounts, which on the offer list
means until the user navigates away and back. Both local patterns for this
already exist in the repo and were not followed: `Home.jsx:35,38,61` guards its
own fetches with a `requestIdRef` counter, and `Publish` disables its submit
button while a request is in flight (covered by
`tests/browser/publish.spec.js:172`).
**Suggested fix:** Mirror the existing `requestIdRef` idiom: keep a counter ref,
capture it per toggle, and ignore any response whose id is stale before calling
`setFavoriteIds`. Roll back with a functional update rather than the captured
`favoriteIds`. Disabling the button while its own request is in flight would also
remove sequence 1, and matches `Publish`.
**Resolution:** Fixed 2026-09-19 in `src/utils/useFavorites.js`. A `requestIdRef`
counter now gates the full-list replace, so only the newest toggle may overwrite
the set; the error path undoes the single offer with a functional update instead
of restoring a captured snapshot; and a `pendingIds` set disables the heart while
that offer's own request is in flight. Two regression tests added in
`tests/browser/favorites.spec.js:167` and `:197`. Both were confirmed to fail
against the pre-fix logic (`toBeDisabled` at line 188, and the second card
reverting to "Ajouter aux favoris" at line 227), then to pass after it.
Closed 2026-09-19 by the independent review of 843041e. `src/utils/useFavorites.js`
was in the reviewed set and both recorded sequences are gone: sequence 1 can no
longer start, because `toggle` returns early on `pendingIds.has(offerId)`
(line 69) and `FavoriteButton` is `disabled` while `isPending`
(`FavoriteButton.jsx:15`); sequence 2 is gone, because the error path flips the
single offer with a functional update (line 99) instead of restoring a captured
set. The regression tests exist at `tests/browser/favorites.spec.js:192` and
`:222` (the line numbers recorded above have drifted) and both passed in this
pass's `yarn test:browser` run. The residual cross-offer overwrite recorded as
F-27 is not introduced by this repair: the pre-fix code replaced the whole set
unconditionally, so that path was strictly worse before. It is tracked as its own
entry rather than keeping this one open.

### 21/F-25 [P3] closed - FavoriteButton's own styles are redeclared by both consumers

**File:** src/components/FavoriteButton/FavoriteButton.css:1-25
**Found:** 2026-09-19 by /audit (scope: current; lens: quality)
**Why it matters:** `Offer.css` re-declares six of the component's properties
(`width`, `border`, `color`, `background-color`, `padding`, `font-size`) plus the
`.is-favorite` and `:disabled` variants, and `Home.css` re-declares three more.
The component stylesheet only really governs `display`, `border-radius` and
`cursor`. The cause is pre-existing and not introduced here: `.main-offer aside
button` (`Offer.css:167`) styles every button in the aside by element name, at a
specificity the component's single class cannot reach, so any non-primary button
added to that aside has to undo it. The cost is that the button's appearance now
lives in three files and a change to one of them silently does nothing.
**Suggested fix:** Scope the existing rule to the button it was written for by
giving the Buy button a class (`aside .buy-button` instead of `aside button`),
then delete the override block in `Offer.css`. This changes shipped styling only
if another element-level button is later added to that aside, so it is a
deliberate change to existing code and needs an explicit decision rather than a
silent repair.
**Resolution:** Fixed 2026-09-19 with the user's explicit approval ("Fix all").
`aside button` became `aside .buy-button`, both Acheter buttons carry that class,
and the 18-line override block in `Offer.css` is gone; `FavoriteButton.css` now
governs its own appearance, with only `flex: 0 0 auto` set by the aside. No other
element-level button exists in that aside, so no shipped styling changed. Covered
by the existing sold/reserved cases in `tests/browser/offer.spec.js`.
Closed 2026-09-19 by the independent review of 843041e. `src/pages/Offer/Offer.css`,
`src/pages/Home/Home.css` and `src/components/FavoriteButton/FavoriteButton.css`
were all in the reviewed set. `Offer.css:170,179` now target `.buy-button`, both
Acheter buttons (`Offer.jsx:206,209`) carry the class, no element-level `button`
rule remains in that aside, and `.offer-actions > .favorite-button` sets only
`flex: 0 0 auto`. The three declarations `Home.css:112-119` keeps (`width`,
`height`, `font-size`) are a deliberate smaller card-corner variant expressed by
context rather than a specificity fight, which is how this project already writes
size variants in plain CSS. No new defect from the repair, and `yarn test:browser`
including the sold/reserved cases in `offer.spec.js` passed in this pass.

### 21/F-26 [P3] closed - getUserId's malformed-token path has no coverage

**File:** src/api/client.js:18-36
**Found:** 2026-09-19 by /audit (scope: current; lens: tests)
**Why it matters:** `getUserId()` is a parser with real edge cases (no token, a
token with fewer than three segments, base64url that `atob` rejects, valid JSON
with no `sub`), and its whole `catch` branch is what keeps a corrupt token from
throwing during render. No configured check reaches it: `tests/browser/favorites.spec.js`
only ever supplies a well-formed token, and the project declares no `test`
command, so the standards' unit-test gate does not apply. The risk is low, since
every failure mode returns `null` and degrades to "signed out", but the branch
that guarantees that is currently unexercised.
**Suggested fix:** Correction 2026-09-19: an earlier version of this finding said
a browser test could not reasonably cover this. That was wrong, and was checked.
Stubbing `/users/login` with `accessToken: 'pas-un-jwt'` drives the exact branch
through the real app: the token reaches `setToken`, `getUserId()` throws inside
`split`/`atob`, the catch returns null, and the page renders signed out instead
of crashing. The test asserts the list still renders, no heart appears, and no
`pageerror` fired. Verified passing in 2s with no new dependency. That is the
cheap fix. Adding a unit runner via `/tests` remains an option, but it is a
separate decision: declaring a `test` command in `AGENTS.md` makes unit tests a
permanent gate for every future logic-bearing step, which this finding alone does
not justify.
**Resolution:** Fixed 2026-09-19 with the user's explicit choice of the browser
test over adding a unit runner. `tests/browser/favorites.spec.js:164` stubs the
login with `accessToken: 'pas-un-jwt'`, signs in through the real form, and
asserts the offers list still renders, no heart appears, and no `pageerror`
fired. No dependency added and no `test` command declared, so the standards'
unit-test gate stays off for this project.
Closed 2026-09-19 by the independent review of 843041e. `src/api/client.js` and
`tests/browser/favorites.spec.js` were both in the reviewed set. The test
"survives a token it cannot decode" exists at `favorites.spec.js:168`, drives the
real `catch` branch through a stubbed login, and asserts the list still renders,
no heart appears, and `crashes` is empty; it passed in this pass's
`yarn test:browser` run (68 of 68). The remaining sub-cases (a valid JWT with no
`sub`, base64url that `atob` rejects) stay uncovered, but each returns `null`
through the same guarded path and none is a distinct reachable behavior, so the
finding closes rather than reopening. No new defect introduced.

### 21/F-27 [P2] closed - The newest toggle's server list discards another offer's in-flight flip

**File:** src/utils/useFavorites.js:93-95
**Found:** 2026-09-19 by /audit independent (scope: current; lens: quality)
**Why it matters:** When a toggle response is the newest one, the hook replaces
the whole favorites Set with the server's list:
`setFavoriteIds(new Set(response.data.favorites ?? []))`. That list is the
server's view at the moment it answered, so it does not contain the optimistic
flip of any *other* offer whose own request is still in flight, and the replace
silently drops it. Reachable on the home list, where every heart shares one hook
instance (`Home.jsx:25`) and only the clicked offer is disabled (`pendingIds` is
per-offer, `useFavorites.js:69`):

1. Click the heart on card A. `POST /users/:id/favorites/A` is sent, the request
   counter becomes 1, and the Set optimistically becomes `{A}`.
2. Click the heart on card B before A answers. The counter becomes 2 and the Set
   becomes `{A, B}`.
3. B's answer lands first (network reordering, or simply a slower A) carrying
   `favorites: [B]`, because the server has not applied A yet. Request id 2 is
   still current, so the Set is replaced with `{B}` and card A's heart returns to
   unfavorited while its own `POST` is still open.
4. A's answer lands with `favorites: [B, A]`, but its request id is now stale, so
   line 93 drops it. The list keeps showing `{B}`.

The UI then disagrees with the server until the component remounts. It is
self-healing on the next click (the heart sends a `POST` the API treats as
idempotent) and it errs toward showing less than the truth rather than claiming a
favorite that does not exist, which is why this is P2 rather than P1.

The F-24 regression test at `tests/browser/favorites.spec.js:222` drives this
exact interleaving but cannot catch it, because its stub answers the second call
with `favorites: [OFFER_ID, OTHER_OFFER._id]` (line 241), that is, with the first
offer already applied server-side. That is the friendly ordering; the failing
case is the same stub answering `favorites: [OTHER_OFFER._id]`.
**Suggested fix:** Re-apply the still-pending offers on top of the server list
instead of trusting it wholesale: replace line 94 with a functional update that
starts from the response ids and then re-flips every id in `pendingIds` other
than this one to the value its own optimistic flip chose. A simpler alternative
is to accept the server list only when no other toggle is in flight and otherwise
keep the local Set. Add the missing case to the existing test by answering the
second call with the second id alone. No current requirement is lost either way.
**Resolution:**
**Resolution:** Fixed 2026-09-19. The success path no longer replaces the whole
Set: it reads the returned id list and applies it to the offer the request was
about, `setFavoriteIds(current => flip(current, offerId, confirmed.has(offerId)))`.
Cross-offer interference is then structurally impossible, so `requestIdRef` was
removed rather than left as inert machinery; `pendingIds` stays, since it is what
stops one offer having two open requests. The spec line that produced this
finding was corrected in `current-feature.md` and the repair recorded as build
step 3. Regression test at `tests/browser/favorites.spec.js:259` uses the hostile
ordering the F-24 test lacked: it was confirmed to fail against the pre-fix code
(first card reverting, line 286), then to pass after.

Closed 2026-09-19 by the independent review of c001c79. `src/utils/useFavorites.js`
was in the reviewed set and the repaired `toggle` (lines 66-104) was re-examined in
full. The recorded sequence can no longer occur: the success path at line 89 is
`setFavoriteIds(current => flip(current, offerId, confirmed.has(offerId)))`, which
touches one id, so B's answer carrying `favorites: [B]` cannot clear A. Every write
to the Set inside `toggle` is now a functional single-id flip (optimistic line 77,
success line 89, rollback line 93), and the only whole-Set replace left is the
one-shot mount read at line 52, which cannot overlap a toggle because the button is
`disabled` until `isLoaded`. `requestIdRef` is gone from `src/utils/useFavorites.js`
(the remaining matches in the repo are Home's own offers-fetch counter at
`Home.jsx:35,38,61`), so no inert machinery was left behind, and `pendingIds` still
holds one request per offer. The add, the remove, the failure and both two-card
interleavings were walked by hand against the new code and no case moves another
offer's heart. The repair introduced no new defect: removing the request counter
removed the only path that discarded a fresh answer as stale. The hostile-ordering
regression test at `tests/browser/favorites.spec.js:259` passed in this pass's
`yarn test:browser` run (69 of 69).

### 21/F-28 [P3] closed - A failed toggle on the home list explains itself off-screen

**File:** src/pages/Home/Home.jsx:141-145
**Found:** 2026-09-19 by /audit independent (scope: current; lens: quality)
**Why it matters:** The list renders one shared `ErrorMessage` above the grid, as
build step 2 asks. With five cards per row and a full page of offers, a heart on
the third or fourth row sits far below that message, so the visible result of a
failed toggle is a heart that flips and silently flips back while the only
explanation is outside the viewport. The offer page does not have this problem (the
message is in the same `aside` as the control, `Offer.jsx:193`), which is why the
existing rollback test only proves the case that works. Step 1's done-when asks for
"a visible French error"; on the list it is rendered but not necessarily seen. No
browser case covers the list's error path at all, since the rollback test drives the
offer page, so `Home.jsx:141-145` is never executed by `yarn test:browser`.
**Suggested fix:** Keep the single shared error and bring it to the user instead of
the user to it: `useEffect` on `favorites.error` calling `scrollIntoView` on the
message node is the smallest version. Add a home-list case to
`tests/browser/favorites.spec.js` that fails a toggle on a card and asserts both the
revert and the message. No current requirement is lost.
**Resolution:** Fixed 2026-09-19 using the suggested fix. `Home.jsx` keeps the
single shared message and adds an effect on `favorites.error` calling
`scrollIntoView({ block: 'center' })` on its container, so step 2's contract is
untouched. Regression test at `tests/browser/favorites.spec.js:322` renders 20
cards, fails a toggle on the last one and asserts `toBeInViewport()`. Confirmed
to fail without the effect (line 349; note `toBeVisible()` passed there, since
the message was rendered but off-screen, which is exactly the defect), then to
pass with it.
Closed 2026-09-19 by the independent review of 4d224d4. `src/pages/Home/Home.jsx`
was in the reviewed set. The single shared message is still the only one
(`Home.jsx:152-156`, one `ErrorMessage` above the grid, so build step 2's
contract is unchanged), and the effect at `Home.jsx:39-43` calls
`scrollIntoView({ block: 'center' })` on the container ref whenever
`favorites.error` becomes truthy. The ref is attached on the same commit that
first renders the container, so the effect never runs against a null node. The
repair introduced no new defect: the effect's only dependency is the error
object, which axios recreates per failure, so a repeated failure still scrolls,
and `toggle` clearing the error to `null` first (`useFavorites.js:74`) produces a
no-op effect run rather than a spurious scroll. The regression test
`tests/browser/favorites.spec.js:322` passed in this pass's `yarn test:browser`
run (71 of 71).

### 21/F-29 [P3] closed - The sold and reserved offers the spec calls out have no favorite coverage

**File:** tests/browser/favorites.spec.js:20-33
**Found:** 2026-09-19 by /audit independent (scope: current; lens: tests)
**Why it matters:** The spec puts "Gating the toggle on offer status" out of scope
and states that a `sold` or `reserved` offer can be favorited, and `Offer.jsx:214`
carries a comment asserting exactly that. Every fixture in
`tests/browser/favorites.spec.js` is `status: 'available'` (`OFFER` line 28,
`OTHER_OFFER` line 33), so nothing ever executes the heart beside a disabled Buy
button. `offer.spec.js` does cover sold and reserved, but signed out, where no heart
renders. The behavior is correct by inspection, since the control sits outside the
availability ternary, so this is a coverage gap rather than a suspected bug: the one
rule the spec was most explicit about is the one no configured check would notice
being broken.
**Suggested fix:** Add one case to `tests/browser/favorites.spec.js` that stubs the
offer with `status: 'sold'` and asserts the Acheter button is disabled while the
heart is present and togglable, reusing `stubOffers` with a per-test override. No
current requirement is lost.
**Resolution:** Fixed 2026-09-19. `tests/browser/favorites.spec.js:296` stubs the
detail route with `status: 'sold'` after `stubOffers`, then asserts the "Vendu"
badge, a disabled Acheter, and a heart that is enabled and toggles. As the
finding says, this closes a coverage gap rather than a defect: the behavior was
already proven live during `/check` on a reserved offer (screenshot
`screenshots/check-offer-reserved.png`), so this test passes both before and
after, by design.
Closed 2026-09-19 by the independent review of 4d224d4.
`tests/browser/favorites.spec.js` was in the reviewed set. The case
"lets a sold offer be favorited, with Acheter disabled beside it"
(`favorites.spec.js:296-317`) registers its `status: 'sold'` detail stub after
`stubOffers`, so it wins the detail route, and it asserts the Vendu badge, a
disabled Acheter, and a heart that is enabled, clickable and flips. That is the
rule `Offer.jsx:213-222` states, now executed rather than only inspected. It
passed in this pass's `yarn test:browser` run. The added stub does not leak into
the other cases, since it is registered inside the test. Coverage gap closed; no
new defect. A separate coverage gap found in the same file this pass is recorded
as F-31 rather than keeping this entry open.

### 21/F-30 [P3] closed - toggle's useCallback copies a shape whose reason does not apply

**File:** src/utils/useFavorites.js:66,103
**Found:** 2026-09-19 by /audit independent (scope: current; lens: quality)
**Why it matters:** `toggle` is wrapped in `useCallback` with
`[favoriteIds, pendingIds, userId]`, and two of those change on every optimistic
flip, every settle and every rollback, so the identity is rebuilt on essentially
every render that matters. Nothing consumes that identity: both call sites wrap it
in a fresh arrow (`Home.jsx:187`, `Offer.jsx:219`) and it appears in no dependency
array. The hook was told to follow `useBrokenUrls.js`, but that file's `useCallback`s
are `[]` and it records why (`useBrokenUrls.js:10-11`: so `reset` can sit in
`Home.jsx:88`'s effect deps). The shape was copied without the property that earned
it, so it reads as a stability guarantee the code does not have.
**Suggested fix:** Drop the `useCallback` and its dependency array and declare
`toggle` as a plain `const toggle = async offerId => {...}`. Nothing loses
memoization it was using and the misleading signal goes away. No current requirement
is lost.
**Resolution:** Fixed 2026-09-19. `toggle` is now a plain
`const toggle = async offerId => {...}` with a comment recording why it is not
memoized, and `useCallback` is no longer imported in the hook. No call site
changed, since both already wrapped it in a fresh arrow.
Closed 2026-09-19 by the independent review of 4d224d4.
`src/utils/useFavorites.js` was in the reviewed set. `toggle` is now a plain
`const toggle = async offerId => {...}` (`useFavorites.js:68`) and `useCallback`
is no longer imported (`useFavorites.js:1` imports only `useEffect` and
`useState`). Removing the memoization introduced no new defect: the hook returns
a fresh object literal on every render anyway, both call sites wrap `toggle` in a
new arrow (`Home.jsx:198`, `Offer.jsx:220`), and the only effect that reads
anything off the returned object depends on `favorites.error` rather than on
`favorites` or `toggle` (`Home.jsx:43`). `yarn lint` is clean, so no exhaustive-
deps rule is violated by the change.

### 21/F-31 [P3] closed - Nothing checks that the home list reads the favorites once

**File:** tests/browser/favorites.spec.js:72-74
**Found:** 2026-09-19 by /audit independent (scope: current; lens: tests)
**Why it matters:** Build step 2 makes one read for the whole list an explicit
requirement ("sharing one `useFavorites` instance for the whole list so the page
makes a single favorites read rather than one per card"), and the hook's own
comment repeats it (`useFavorites.js:16-17`). The code satisfies it today, since
`Home.jsx:25` holds the single instance, but no configured check observes it:
`stubFavorites` fulfils `/users/*/favorites` without counting, so moving
`useFavorites()` into the card body would turn one request into one per card and
every one of the twelve favorites cases would still pass. That is a network
regression a future refactor could ship unnoticed, on the page that renders the
most controls. The `F-28` case already renders 20 cards, which is exactly where
the difference would be one request versus twenty.
**Suggested fix:** Count the hits in the existing stub: give `stubFavorites` a
counter incremented in the route handler, and assert it is `1` at the end of one
home-list case (the 20-card case in `favorites.spec.js:322` is the cheapest
host). No new fixture and no current requirement is lost.
**Resolution:**

### 21/F-32 [P3] closed - A failed toggle's message outlives the list it belonged to

**File:** src/pages/Home/Home.jsx:152
**Found:** 2026-09-19 by /audit independent (scope: current; lens: quality)
**Why it matters:** `favorites.error` is cleared in exactly one place, the start
of the next `toggle` (`useFavorites.js:74`). Nothing else resets it, and the home
list's offers are replaced independently of the hook. So after a heart fails,
typing in the search box or paging to the next page leaves the message pinned
above a completely different set of cards, still describing a toggle on an offer
that may no longer be on screen. The message is also scrolled into view once
(`Home.jsx:39-43`) and then never withdrawn, so it reads as a live complaint
about whatever list is now showing. This project already treats stale error text
as a defect elsewhere: `tests/browser/reset-password.spec.js:114` exists purely to
prove a stale backend error is cleared before the next attempt.
**Suggested fix:** Expose a `clearError` from `useFavorites` (a one-line
`setError(null)` callback) and call it from `Home.jsx` where the offers request
succeeds, or key the message to the current `filterKey`/`page`. The offer page
needs no change, since its offer does not change under the message. No current
requirement is lost.
**Resolution:**

<!-- resolutions appended 2026-09-19 -->
F-31 resolution: `stubFavorites` now returns a live hit counter and the
twenty-card case asserts `reads.count === 1`
(`tests/browser/favorites.spec.js:72-82`, assertion at `:345`). Like F-29 this
closes a coverage gap rather than a defect, so the assertion passes against the
pre-fix code by design; its value is that moving the hook into the card body
would now fail it.

F-32 resolution: the hook exposes a memoized `clearError`
(`src/utils/useFavorites.js:109`), and `Home.jsx:80` calls it when the offers
request succeeds, with the identity stable enough to sit in that effect's
dependencies (`Home.jsx:104`). Regression test at
`tests/browser/favorites.spec.js:367` fails a toggle, types in the header search
and asserts the message is gone. Confirmed to fail against the pre-fix code
(`toHaveCount(0)` at line 385), then to pass.

<!-- closures appended 2026-09-19 by /audit independent (checkpoint c6ec523) -->

F-31 closed 2026-09-19 by the independent review of c6ec523.
`tests/browser/favorites.spec.js` was in the reviewed set. `stubFavorites`
(`:74-83`) now increments `reads.count` inside the route handler and returns the
counter, and the twenty-card case asserts `expect(reads.count).toBe(1)` at `:348`,
immediately after `await expect(cards).toHaveCount(20)`. The assertion is not
racy: `useFavorites()` is called at `Home.jsx:25`, so its effect is registered
before Home's own effects and the favorites GET is issued before the offers GET,
which means the counter is already 1 by the time twenty cards can render. Moving
the hook into the card body would make it 20 and fail the case, which is exactly
what the finding asked for. The repair introduced no new defect: the returned
object is ignored by the eleven call sites that do not need it, and the second
`stubFavorites` call in `shows the new state when the list is opened again`
(`:441`) still wins the route by registration order.

F-32 closed 2026-09-19 by the independent review of c6ec523.
`src/utils/useFavorites.js` and `src/pages/Home/Home.jsx` were both in the
reviewed set. The hook exposes `clearError = useCallback(() => setError(null), [])`
(`useFavorites.js:105`), and `Home.jsx:80` calls it on the offers request's
success path, inside the same `requestId` guard that protects the other writes,
so a superseded response cannot clear a live message. The `[]` deps make the
identity stable, so listing it in the effect's dependency array (`Home.jsx:104`)
does not re-run the fetch, and `yarn lint` is clean under exhaustive-deps. The
recorded symptom is gone: a search or a page change now withdraws the message
instead of leaving it pinned and scrolled into view above a different list, which
the regression test at `tests/browser/favorites.spec.js:367` observes. The repair
introduced no new defect: `Offer.jsx` does not call `clearError` and does not need
to, since its offer does not change under the message, and clearing on a
successful offers fetch cannot hide a failure the user has not caused yet.

## Independent review

**Status:** passed
**Target commit:** c6ec52335d24cf7df646f380956dbe68ae72847e
**Base commit:** 36dfb31988e7a4afc7d219a3faf643c8eb021b09
**Base ref:** master
**Spec hash:** 4cb5dbc0ade05b93830704562f907b3d9595c3d72475b0cf0fe1e5aed1170b99
**Spec snapshot:** blueprint/.state/review-specs/c6ec52335d24cf7df646f380956dbe68ae72847e-4cb5dbc0ade05b93830704562f907b3d9595c3d72475b0cf0fe1e5aed1170b99.md
**Prepared by:** claude
**Builder model:** claude-opus-5[1m]
**Requested reviewer:** claude
**Requested model:** runtime default (exact model not known until reviewer starts)
**Requested execution:** automatic
**Requested at:** 2026-09-19T19:00:26.994Z
**Workflow:** regular
**Check required:** no
**Reviewer adapter:** claude
**Reviewer model:** claude-opus-5[1m]
**Reviewer context:** fresh subagent
**Actual execution:** automatic
**Reviewed at:** 2026-09-19T19:34:00Z
**Scope:** current
**Lenses:** quality, security, performance, tests
**Verdict:** passed
**Check result:** not-required


### Commands

- `yarn lint`: pass (eslint, clean)
- `yarn verify`: pass (vite build, 141 modules, no warnings)
- `yarn test:browser`: pass (72 of 72 chromium cases, 48.2s)
- `/check`: not run, Check required is no

### Evidence

- Preconditions verified: HEAD equals c6ec523, master's merge base with it equals
  36dfb31, and the raw bytes of `blueprint/context/current-feature.md` hash to the
  recorded `Spec hash`.
- `Spec snapshot` verified: the snapshot file's raw bytes hash to the same digest,
  both paths are ignored (`.gitignore:36`), untracked, absent from the index
  (`git ls-files --stage` empty) and absent from the target tree
  (`git ls-tree -r` empty), and every directory from the project root down to both
  files is an ordinary directory with both files ordinary regular files.
- The roughly 22 paths `git status` reports as modified are a stale stat cache
  under `core.autocrlf=true` with no `.gitattributes`, not a real difference:
  `git diff --numstat` and `git diff --cached --numstat` return no rows, and
  `git hash-object --no-filters` on sampled paths equals the index blob. No
  tracked, staged, unstaged or untracked path differs from the target.
- Reviewed the complete 36dfb31..c6ec523 delta across all four commits: 9 files,
  788 insertions, 47 deletions. Files reviewed: `src/api/client.js`,
  `src/utils/useFavorites.js`, `src/components/FavoriteButton/FavoriteButton.jsx`
  and `.css`, `src/pages/Home/Home.jsx` and `.css`, `src/pages/Offer/Offer.jsx`
  and `.css`, `tests/browser/favorites.spec.js`, plus the unchanged callers needed
  to reach them (`src/App.jsx`, `src/components/ErrorMessage/ErrorMessage.jsx`,
  `src/utils/useBrokenUrls.js`).
- Quality: the hook keeps one abstraction as the spec allows, no state library,
  no new dependency; every write to the favorites Set inside `toggle` is a
  functional single-id flip (`useFavorites.js:77`, `:89`, `:93`); no dead code
  left (`requestIdRef` is gone from the hook, the remaining matches are Home's own
  offers-fetch counter); comments are why-comments and no em dashes were found in
  the delta; UI copy is French.
- Security: `getUserId` (`client.js:24-36`) decodes the JWT payload without
  verifying the signature, but the value only addresses the client's own requests
  and the backend still authorizes (403 on a mismatched id), the decode is wrapped
  in try/catch and degrades to signed-out, and a browser case drives that branch.
  No secret or API host is hard-coded; all authenticated calls go through
  `src/api/client.js`. `skipAuthRedirect: true` is scoped to the background
  favorites read only, so a user-initiated toggle still follows the normal 401
  path.
- Performance: one favorites read per page, shared by every card
  (`Home.jsx:25`), now asserted at `favorites.spec.js:348`; `isFavorite` and
  `isPending` are Set lookups; no per-card fetch, no unbounded collection.
- Tests: 16 cases in `tests/browser/favorites.spec.js` cover signed-out absence on
  both surfaces, initial state from the server, optimistic flip, rollback with a
  visible French message, an unreadable favorites list, an undecodable token, the
  in-flight second click, both two-card interleavings including the hostile
  ordering, a sold offer, the off-screen message, the stale message after a new
  list, the read count, the click not navigating, and the card click still
  navigating. No skipped, focused or placeholder tests. Routes are host-qualified
  to `http://localhost:3000`, so the app's own navigation is not intercepted.
- Local backend at `http://localhost:3000` was not called; no data was mutated.

### Findings

- None

### Remaining risk

- No unit-test runner is configured (no `test` command in `AGENTS.md`), so the
  pure logic in `getUserId` and the `flip` helper has no unit coverage. The
  reachable branches are exercised through the browser suite instead.
- `yarn test:browser` is not part of `yarn verify` or CI, so CI proves the build
  only. This reviewer ran it locally and it passed.
- No dependency or vulnerability scanner is declared in this project, so no
  current advisory scan backs the security lens; only source-level review did.
- No `/check` was run: `Check required` is `no`. The live API contract for the
  toggle responses (id strings, not documents) rests on the spec's recorded
  2026-09-19 verification rather than on this pass, because re-checking it would
  mutate backend data.
- The favorites Set is not reset when `userId` changes while a page stays mounted.
  No reachable path produces that today, because switching accounts goes through
  the `/login` route and unmounts both `Home` and `Offer`, so this is a note for
  whoever adds an in-place account switch, not a finding.
