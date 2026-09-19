# Fix: Broken and missing images, card overflow, and Login link spacing

**Type:** Fix
**Status:** verified
**Branch:** `fix/broken-images-card-overflow-and-login-link-spacing`
**Fixes:** F-13

## The problem

Five defects, none introduced by feature 19. Defects 1 to 4 were confirmed
against the running API and recorded in
`blueprint/reference/api-offer-response.md`; defect 5 is the open ledger entry
F-13.

| # | Where | What happens |
|---|---|---|
| 1 | `Offer.jsx:80-86`, `Home.jsx:136-142` | An account with no avatar sends `avatar: {"tags": []}`, which is truthy, so the guard passes and an `<img>` renders with no `src`. The browser shows a broken-image icon with the truncated alt text next to the username. Verified live on `nina_depot`: `src` is `null` and the element never loads. |
| 2 | `Home.jsx:145` | Same root cause for the offer photo: a photoless offer sends `image: {"tags": []}`, so the card renders `src={undefined}` in a 360px slot. 27 of the 96 listed offers are in this state. |
| 3 | `Home.jsx:145` | The card reads `image.url`, which is plain http. An https deployment would block it as mixed content. Feature 19 fixed this on the detail page only. |
| 4 | `Offer.css`, `.main-offer aside` | The card has a fixed `height: 600px`, so long content spills outside the white box: on `Robe longue en soie...` the description, seller, title and Buy button all render below the card's edge. Measured `scrollHeight` 1109 in a 600px box, `h1` bottom at 1155 against a card ending at 688. Confirmed identical on `master` before feature 19. |
| 5 | `Login.css:65-69` (F-13) | `.main-login a` sets no `margin-top`, and `.main-login .container` is a `flex` column with no `gap`, so the `/signup` and `/reset-password` links at `Login.jsx:89-90` stack flush against each other. Cosmetic only: both links render and navigate. |

Defects 1 to 3 share one root cause: **an empty Cloudinary subdocument is an
object, not a falsy value**, so `image &&` and `avatar &&` are the wrong test.
Every site must test for a usable url instead, which is what the gallery already
does.

**Defects 4 and 5 are riders**, and a third joined them during the work: the
flaky `reset-password` test that the repeated full-suite runs finally pinned
down (step 9), and a fourth after it, the same defect in home-filters (step 11).
None shares a cause, file or page with the image defects, and
each is kept in its own build step so it can be reviewed and reverted alone. The
commit message must name them explicitly, so the history does not read as if one
root cause explained everything.

## The fix

- Extract the url reading the gallery already uses into `src/utils/images.js`,
  exporting one function that returns `secure_url`, then `url`, then `null`.
  Four call sites across two pages need identical logic, and each one inventing
  its own guard is precisely how these three defects happened. Nothing else
  moves: `thumbnailUrl` stays in `Offer.jsx` because only the gallery crops.
- Render an image only when that function returns a url, on both pages, for both
  offer photos and avatars.
- Replace the `aside` fixed `height` with `min-height`, so 600px becomes a floor
  instead of a ceiling and the card grows to its content rather than spilling.
  Measured afterwards: every offer in the seed grows past 600 (645 to 767), so
  this changes the rendered height of **every** detail page, not just the long
  one. The old 600px was never respected by the content, it merely hid the
  overflow.
- Give `.main-login a` the `margin-top: 20px` that `Confirm.css:13-18` and
  `ResetPassword.css:47-52` already use for the same stacked-link pattern.

Must not break: the gallery behaviour shipped in feature 19, the browser tests it
came with, the card grid on offers that do have a photo, the detail page's
loading, error, status-badge and Buy branches, or the Login 403 hint.

**Anywhere an offer photo would render, a missing or dead one renders a
placeholder of the same size instead**, on the card and on the detail page
alike. The user asked for that alignment after seeing the ragged grid the
alternative produced. Two causes, two wordings: `Pas de photo` when there is no
image url at all, and `Image indisponible` when a url exists but its asset fails
to load. **An avatar falls back to a circle carrying the seller initial**: the
same rule in the shape the slot already had, since a grey rectangle beside a
username would read as a bug, while the circle keeps the row aligned whether the
image is fine, missing or dead. One rule covers all three cases, so there is no
third state to reason about.

## Build steps

- [x] **Step 1 - Shared url reader, wired into the detail page** - add
      `src/utils/images.js` with the `secure_url` then `url` then `null`
      function, import it in `Offer.jsx` in place of the local `pictureUrl`, and
      use it for the seller avatar guard at `Offer.jsx:80-86`.
      *Done when:* `yarn lint` and `yarn verify` pass; the 40 existing browser
      tests stay green; an offer whose seller has no avatar renders no avatar
      `<img>` and no broken icon, with the username still shown.
- [x] **Step 2 - Home card image and avatar** - use the same function for the
      card photo and the card avatar in `Home.jsx:136-146`, which also moves the
      card photo from http `url` to https `secure_url`.
      *Done when:* `yarn verify` passes; a photoless offer renders a card with
      no image element; an avatarless seller renders no avatar image; a normal
      card's `src` starts with `https://`.
- [x] **Step 3 - Rider: let the detail card grow** - change `.main-offer aside`
      from `height: 600px` to `min-height: 600px` in `Offer.css`.
      *Done when:* `yarn verify` passes; on `Robe longue en soie...` the
      description, seller, title and Buy button all render inside the white
      card, with `scrollHeight` no longer exceeding the rendered height; and
      across a sample of offers no card clips its content and none measures
      under 600px. Do not expect any offer to stay at exactly 600: measured on
      8 offers, every one lands between 645 and 767, which is the point.
- [x] **Step 4 - Rider: Login link spacing (F-13)** - add `margin-top: 20px` to
      `.main-login a` (`Login.css:65-69`). `Login.jsx:31` renders a third link
      inside the `.login-hint` paragraph, but it is inline, so a vertical margin
      does not affect its line box; confirm that on screen rather than assuming
      it, and scope the rule to the two container-level links only if the hint
      actually shifts.
      *Done when:* `yarn verify` passes; the `/signup` and `/reset-password`
      links are visibly separated on `/login`, matching Confirm and
      ResetPassword; a screenshot of the 403 hint shows its inline link
      unchanged; `tests/browser/reset-password.spec.js:162` still passes.
- [x] **Step 5 - Browser coverage** - add mocked tests: a Home card for an offer
      with `image: {tags: []}` renders no card image, an avatarless seller
      renders no avatar image on both Home and the offer page, and a normal card
      image uses `secure_url`.
      *Done when:* `yarn test:browser` is green with the new tests and all 40
      existing ones.

- [x] **Step 6 - Placeholder for cards without a usable image** - render a
      same-size block instead of nothing when the card has no image url, and
      swap to it through `onError` when a url exists but fails to load,
      resetting that state on each fetch. Key it by **url, not by offer**: the
      seed's image pool and a seller's avatar are referenced by several cards at
      once, so one dead asset has to fall back everywhere it appears. A failing
      avatar hides rather than showing a placeholder, matching how an
      avatarless account already renders.
      *Done when:* every card slot measures 360px whether it holds a photo or a
      placeholder; a photoless offer reads `Pas de photo` and a failing url
      reads `Image indisponible`; a failing avatar disappears from every card
      sharing it; all three cases are covered by mocked tests; the full suite
      and `yarn verify` stay green.
- [x] **Step 7 - Same avatar behaviour on the offer page** - hide the seller
      avatar on the detail page when its image fails to load, matching Home. One
      boolean is enough there, since a single offer is on screen, and it resets
      with each fetch.
      *Done when:* a dead avatar asset leaves no broken icon and no empty slot
      on the detail page, with the username still shown; covered by a mocked
      test; the full suite and `yarn verify` stay green.

- [x] **Step 8 - Align the gallery with the card** - on the detail page, show a
      `Pas de photo` block the size of the main image when the offer has no
      usable picture, and replace a failing picture **in place** with
      `Image indisponible`, never removing it from the list. A failing thumbnail
      becomes a same-size neutral tile. Track broken urls in a set, since the
      thumbnail and the main image of one picture have different urls.
      *Done when:* a photoless offer reads `Pas de photo` where the image would
      be; an offer whose main url fails reads `Image indisponible` while the
      thumbnail count and every `Photo N sur T` label stay unchanged, and the
      other pictures still select normally; both are covered by mocked tests and
      confirmed against the live API.
- [x] **Step 9 - Rider: the flaky reset-password test** - `reset-password.spec.js:67`
      mocked its response with a 300ms delay, then asserted the button was
      disabled. Under load the response landed first, the form advanced and the
      button no longer existed, so the run failed with `element(s) not found`.
      Hold the request open until the assertion has run instead.
      *Done when:* the test asserts against a request that is still in flight by
      construction, and five consecutive full-suite runs pass.

- [x] **Step 10 - Avatar initial instead of a hole** - extract an `Avatar`
      component used by both pages: it renders the image when there is a usable
      url, and a circle with the uppercased first letter of the username
      otherwise, including after an `onError`. It stores the failing url rather
      than a boolean, so the fallback resets by itself when another account is
      rendered, and each page keeps only the sizing in its own CSS.
      *Done when:* an avatarless seller and a seller whose avatar asset is dead
      both show the initial, on Home and on the detail page; neither page keeps
      its own avatar state; the mocked tests assert the initial rather than
      merely the absence of an image; the full suite and `yarn verify` stay
      green.

- [x] **Step 11 - Rider: the flaky home-filters tests** - `/check` caught a
      second instance of step 9's defect class: `home-filters.spec.js` waited a
      fixed 600ms after each interaction, against Home's 400ms debounce. Under
      load the request had not left yet and the assertions read the previous
      state. Measured before the repair: 2 failures in 3 runs of that file
      alone. Replace all 11 fixed waits with `expect.poll` on the captured
      request url, or on the requested page for the pagination test.
      *Done when:* no `waitForTimeout` remains in that file; the assertions
      still cover the same params and rendered order; the file passes four
      consecutive runs and the full suite five.

- [x] **Step 12 - Audit repairs (F-19 to F-22)** - cover the thumbnail fallback
      with a mocked test (F-19), move the duplicated broken-url tracking into a
      useBrokenUrls hook used by both pages and by Avatar (F-20), give the main
      image the same explicit 480x600 contain box as its placeholder so the
      column never depends on the photo (F-21), and share the PNG fixture
      between spec files (F-22).
      *Done when:* aborting a thumbnail crop url leaves the strip and its
      numbering intact while the main image still loads; no page keeps its own
      broken-url state; an offer with a photo and one without both measure
      480x600 live; lint reports zero warnings; the full suite and yarn verify
      stay green.

## Why the gallery replaces in place rather than removing

Recorded because the alternative looks tidier and will be proposed again. On
Home the card image is a leaf: one slot, swapped for a block of the same size,
nothing else moves. On the detail page `buildPictureList` feeds three things at
once - the main image (`pictures[selectedIndex]`), the thumbnail labels
(`Photo N sur pictures.length`) and whether the strip renders at all
(`pictures.length > 1`). Removing an entry therefore renumbers every label under
the visitor, can move the selection through the clamp, and can make the strip
vanish, all at a moment dictated by when the network fails. In-place replacement
keeps the count stable; the cost is a dead tile that stays selectable.

Two details the implementation accounts for: since F-16 the thumbnail and the
main image have different urls (the `w_144,h_192,c_fill` crop versus the
original), so "broken" is tracked per url rather than per picture, and a live run
confirmed one can fail while the other still loads; and thumbnails load at once
while the main image loads on selection, so failures arrive in a scattered
order, which the set absorbs without reordering anything.

## Verify

- `yarn verify`, `yarn lint`, `yarn test:browser` all green.
- Against the running API: `/` shows no broken-image icons among the 27
  photoless offers or the avatarless sellers; `/offers/6aae67d160da136b79ae2d85`
  (`nina_depot`, no avatar) shows the username with no broken icon;
  `/offers/6aae67d160da136b79ae2d82` (104-character title) keeps all of its
  content inside the white card; `/login` shows two separated footer links, and
  a failed login still renders its 403 hint correctly.
- Screenshot the home grid, the long-title offer and `/login` for the review
  packet, and check the console for errors and failed requests on each.

## Commit message
The work commit must list the riders separately from the image root cause, for
example:

    fix: render images only when the API returns a usable url

    An empty Cloudinary subdocument is an object, not a falsy value, so
    image && and avatar && passed for photoless offers and avatarless
    accounts and rendered a broken image. Read secure_url, then url, then a
    placeholder, through one shared helper. A url can also outlive its asset,
    so both pages fall back on error too: the photo becomes a same-size block,
    the avatar simply disappears. This also moves Home card images off plain
    http.

    Three unrelated fixes ride along, each in its own step: the offer detail
    aside grows instead of spilling its content, Login's two footer links get
    the spacing the other pages already use (F-13), and a reset-password test
    that asserted against a request that had often already finished now holds
    it open.


<!-- blueprint:completion {"schemaVersion":1,"specBytes":15033,"specSha256":"a38c4e28f06c949f54449bbafdf06cfea2b958fa1bce1729f0689086c977a970","branch":"refs/heads/fix/broken-images-card-overflow-and-login-link-spacing","head":"1a01781cb5ffc916d2b24a74c00dd2e4616cbbe5","baseRef":"refs/heads/master","baseCommit":"1a01781cb5ffc916d2b24a74c00dd2e4616cbbe5","sourceTree":"56cf44bb5d7e4b83f72a6db6d102d60238de53dc","absentOptional":[]} -->

## Findings

### broken-images-card-overflow-and-login-link-spacing/F-13 [P3] closed - Login's two footer links render with no spacing between them

**File:** src/pages/Login/Login.jsx:89-90, src/pages/Login/Login.css:65-69
**Found:** 2026-09-18 by /audit independent (scope: current; lens: quality)
**Why it matters:** Build step 4 adds `<Link to="/reset-password">Mot de passe
oublié ?</Link>` directly after the existing `/signup` link inside
`.main-login .container`, which is a `flex`/`column` box with no `gap`
(`Login.css:1-5`). `.main-login a` (`:65-69`) sets only `font-size`,
`text-decoration`, and `color`, with no `margin-top`, so the two 12px links now
stack flush against each other with zero separation. Every sibling page that
stacks two links gives its anchors breathing room for exactly this reason:
`Confirm.css:13-18` and the new `ResetPassword.css:47-52` both add
`margin-top: 20px` to their `a` rule, and `Confirm.jsx:39-40` is the direct
precedent for two adjacent links. Login was the one container that never needed
the rule because it only ever had one link. Cosmetic only: both links render,
are reachable, and navigate correctly (`tests/browser/reset-password.spec.js:162`
passes), so this is layout drift from the local pattern rather than a defect.
**Suggested fix:** Add `margin-top: 20px` to `.main-login a`
(`src/pages/Login/Login.css:65-69`), matching `Confirm.css:13-18` and
`ResetPassword.css:47-52`. Note `Login.jsx:31` renders a third `Link` inside the
403 hint paragraph, so check that hint still reads correctly, or scope the rule
to the two container-level links if it does not. CSS-only change.
**Resolution:** Repaired 2026-09-19 by /implement: Login.css:71 adds margin-top: 20px to .main-login a, matching Confirm.css and ResetPassword.css. The third link inside the 403 hint is inline, so the vertical margin does not move it; confirmed on screen. Closed 2026-09-19 by /audit: re-read Login.css:68-72. The rule now carries margin-top: 20px like Confirm.css and ResetPassword.css, measured at a 20px gap between the two container-level links, and the inline link inside the 403 hint is unmoved because a vertical margin does not affect an inline box.

### broken-images-card-overflow-and-login-link-spacing/F-19 [P2] closed - The thumbnail fallback has no test

**File:** src/pages/Offer/Offer.jsx:128
**Found:** 2026-09-19 by /audit (scope: current; lens: tests)
**Why it matters:** Step 8 gives a failing thumbnail its own fallback, a
`.offer-gallery-thumb-empty` tile, so the strip keeps its size and numbering.
Nothing exercises it: the mocked tests only abort the **main** image url, and the
live checks did the same. The thumbnail uses a different url from the main image
(the `w_144,h_192,c_fill` crop), which is precisely why the set is keyed by url,
so the two paths cannot stand in for each other. Deleting the tile branch today
would keep all 47 tests green.
**Suggested fix:** One mocked test next to the in-place replacement test: abort
`thumbnailUrl(buildPicture('pictures/1').secure_url)`, then assert the strip still
has its buttons, that the aborted position renders `.offer-gallery-thumb-empty`,
and that its `aria-label` numbering is unchanged.
**Resolution:** Repaired 2026-09-19 by /implement: offer.spec.js now aborts the thumbnail crop url of one picture and asserts the strip keeps both buttons, that exactly one .offer-gallery-thumb-empty renders, that the Photo 2 sur 2 label is unchanged, and that the main image of that same picture still loads from its own url. 48 tests green. Closed 2026-09-19 by /audit: re-read offer.spec.js:251. The test aborts the crop url, not the main one, and asserts both buttons remain, exactly one empty tile renders, the Photo 2 sur 2 label is unchanged and the main image still loads. A live run of the same scenario confirmed it, and the symmetric case (aborting the main url) leaves zero empty tiles, so the two paths are genuinely distinguished.

### broken-images-card-overflow-and-login-link-spacing/F-20 [P3] closed - Broken-url tracking is written twice in two different shapes

**File:** src/pages/Home/Home.jsx:23-31, src/pages/Offer/Offer.jsx:58-60
**Found:** 2026-09-19 by /audit (scope: current; lens: quality)
**Why it matters:** Both pages now keep a `Set` of failing urls, a
`markUrlBroken` setter and a reset on fetch, but expose it differently: Home
wraps it in a `usableUrl(image)` helper, the offer page tests
`brokenUrls.has(...)` inline at two call sites. Same concept, same lifecycle,
two shapes to keep in step. This is a milder version of the divergence that
produced the very defects this fix repairs, where each page invented its own
image guard. Not a defect today: both are covered by tests and verified live.
**Suggested fix:** Move the three lines into `src/utils/images.js` as a small
`useBrokenUrls()` hook returning `{ usableUrl, markUrlBroken, reset }`, and use it
in both pages, or at least give the offer page the same `usableUrl` shape as
Home. Nothing is lost: the reset stays at each page's fetch, where it belongs.
Worth doing before a third page needs images, not urgently.

**Resolution:** Repaired 2026-09-19 by /implement: the three lines moved to src/utils/useBrokenUrls.js as a useBrokenUrls() hook returning { usable, markBroken, reset }. Both pages and the Avatar component use it, so the concept now has one shape. markBroken and reset are wrapped in useCallback so the pages can list reset in their effect dependencies: the first version without it introduced two react-hooks/exhaustive-deps warnings, which the lint caught before the repair shipped. Closed 2026-09-19 by /audit: re-read useBrokenUrls.js, both pages and Avatar.jsx. No page keeps its own broken-url state (grep over src/pages is empty), markBroken and reset are stable through useCallback, and both effects now list reset. Lint reports zero warnings, which is what it did before the extraction.

### broken-images-card-overflow-and-login-link-spacing/F-21 [P3] closed - The gallery placeholder hardcodes the seed's aspect ratio

**File:** src/pages/Offer/Offer.css:26-35
**Found:** 2026-09-19 by /audit (scope: current; lens: quality)
**Why it matters:** `.offer-gallery-empty` uses `aspect-ratio: 4 / 5` with a
600px height, so it renders 480x600, matching the ten seeded pool images which
are all 800x1000. The main image itself has no width and no `object-fit`, so a
landscape photo would render much wider than 480. On such an offer the left
column would visibly jump when the photo dies and the placeholder takes over,
which is the opposite of what the placeholder is for. Not reachable with the
current seed, where every image is portrait 4:5.
**Suggested fix:** None right now: the planned offer-page redesign gives the
image a fixed box of its own (full column width, fixed height, `contain`), and
the placeholder should simply inherit that box. Record it so the redesign does
not reintroduce the mismatch.
**Resolution:** Repaired 2026-09-19 by /implement: the main image now has the same explicit box as the placeholder, 480x600 with object-fit: contain and a white background, instead of a bare height plus an aspect-ratio guess on the placeholder. Verified live: an offer with a photo and an offer without both measure 480x600, so the column cannot jump when a photo dies, whatever the photo orientation. Closed 2026-09-19 by /audit: re-read Offer.css:22-41. The image and its placeholder now declare the same 480x600 box, the image adds object-fit: contain with a white background so any orientation fits without cropping, and the aspect-ratio guess is gone. Measured live at 480x600 in both states.

### broken-images-card-overflow-and-login-link-spacing/F-22 [P3] closed - The 1x1 PNG fixture is duplicated in two spec files

**File:** tests/browser/home.spec.js:78, tests/browser/offer.spec.js:100
**Found:** 2026-09-19 by /audit (scope: current; lens: tests)
**Why it matters:** Both files embed the same base64 PNG for the same reason,
that a fixture url which 404s would now silently trigger the placeholder and
defeat assertions about a rendered image. The comment explaining that trap is
written twice too, so a third spec file needing an image is likely to rediscover
the problem rather than the solution.
**Suggested fix:** Move the constant and its one-line rationale to a shared
`tests/browser/fixtures.js` and import it in both. No behaviour changes and no
new dependency; Playwright specs import freely.
**Resolution:** Repaired 2026-09-19 by /implement: the constant and its rationale moved to tests/browser/fixtures.js, imported by both spec files. Closed 2026-09-19 by /audit: re-read tests/browser/fixtures.js and both spec imports. One copy of the constant and of the rationale. Playwright still collects 48 tests in 10 files, so the helper is not picked up as a spec.
