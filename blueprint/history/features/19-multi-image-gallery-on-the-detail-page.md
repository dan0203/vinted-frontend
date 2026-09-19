# Feature: Multi-image gallery on the detail page

**From build-plan:** feature 19
**Build attempt:** 1
**Status:** verified
**Branch:** `feature/multi-image-gallery-on-the-detail-page`

## Goal

The offer detail page shows only `offer.image` today, so the secondary
`pictures` the backend already returns are invisible. Display them as a
thumbnail strip next to the main image and let the visitor switch which picture
is shown large, so a buyer can see every photo the seller uploaded.

## In scope

- Render the offer's main `image` plus up to 5 entries from `offer.pictures` as
  a thumbnail strip on `/offers/:id`.
- Click (and keyboard activation) on a thumbnail swaps the large image.
- The main image stays selected by default, and the selection resets when the
  page loads a different offer.
- Offers with no `pictures` (default `[]`) render as they do today, with no
  empty strip; an offer with neither `image` nor `pictures` (both defaults, a
  valid document) renders no image element instead of a broken one.
- Playwright coverage for the gallery in `tests/browser/offer.spec.js`.

## Out of scope

- Uploading secondary pictures on the publish form (feature 20).
- The offers list / cards on Home - the gallery is detail-page only. Home's
  `offer.image.url` (plain http) stays as it is, and wants a later `/fix`.
- The seller avatar on this page. It reads `avatar.url`, which the live API does
  return, so it renders correctly; only its http scheme is imperfect.
- Lightbox, zoom, swipe gestures, carousel autoplay, or arrow navigation.
- Image lazy-loading, responsive `srcset`, or Cloudinary transformations.
- Any change to the loading, error, status-badge, or Buy behavior already on
  the page.

## Build loop

Build one small step at a time. `workflow.stepReview` is `feature`, so build
every step and produce one review packet at the end, not one per step.
`workflow.checkpointCommits` is `disabled`, so do not offer checkpoint commits;
`/complete` makes the single feature commit. Never accept a review packet you
have not read.

## Build steps

- [x] **Step 1 - Gallery state and markup in `Offer.jsx`** - derive the ordered
      picture list from `offer.image` followed by up to 5 entries of
      `offer.pictures`. For each entry take `secure_url` and fall back to `url`,
      dropping entries that have neither (this also drops the default empty
      `image` object `{}`). Hold the selected index in `useState`, render the
      selected picture where the current `<img>` is, and render a thumbnail
      strip below it when the list has more than one entry. Key each thumbnail
      on `public_id` plus its index: image subdocuments carry no `_id`, and
      `public_id` alone is not unique within an offer (corrected in step 4).
      Each thumbnail is a real `<button type="button">` with
      `aria-pressed` reflecting selection and a French accessible label (for
      example `Photo 2 sur 4`); the thumbnail image uses `offer.name` as its
      `alt`. Reset the selected index whenever a newly fetched offer is stored,
      so navigating from one offer to another never keeps a stale index.
      *Done when:* `yarn lint` and `yarn verify` pass; an offer with secondary
      pictures shows one large image plus a thumbnail per picture, clicking or
      pressing Enter/Space on a thumbnail changes the large image and moves
      `aria-pressed="true"` to it; an offer with `pictures: []` renders no strip
      and looks unchanged from master; and an offer with `image: {}` and
      `pictures: []` renders no `<img>` in the gallery area, no strip, and no
      console error, instead of today's broken-image icon.
- [x] **Step 2 - Gallery styles in `Offer.css`** - lay the strip out under the
      main image inside the existing flex `.main-offer .container`, sized so the
      page keeps its current two-column shape at desktop width; give the
      selected thumbnail a visible, non-color-only selected state (border plus
      full opacity against dimmed unselected ones) and a visible focus outline.
      *Done when:* `yarn verify` passes, a screenshot of an offer with 3+
      pictures shows the strip below the main image without pushing the
      `aside` out of place, and the selected and focused thumbnails are
      distinguishable in that screenshot.
- [x] **Step 3 - Browser coverage** - extend `tests/browser/offer.spec.js`
      using its existing host-qualified `${API_URL}/offers/*` mock, with
      fixtures shaped like the real Cloudinary subdocuments (`public_id`,
      `url`, `secure_url`): one test where an offer with two secondary pictures
      renders three thumbnails and clicking the third swaps the large image's
      `src` to that picture's `secure_url`, and one where an offer with
      `pictures: []` renders no thumbnail buttons.
      *Done when:* `yarn test:browser` passes with both new tests and the three
      existing ones green, and `yarn verify` still passes.
- [x] **Step 4 - Repair: unique thumbnail keys** - `/check` against the running
      API found that every live offer repeats its main image as `pictures[0]`,
      same `public_id` and same `secure_url`, so keying on `public_id` alone
      produced React's duplicate-key error on every offer page. Key on
      `` `${public_id}-${index}` `` instead, and add a mocked test for an offer
      whose main image is repeated.
      *Done when:* the new test fails with the old key and passes with the new
      one; a live page load against the running API logs no duplicate-key error;
      `yarn verify` and the full `yarn test:browser` stay green.

- [x] **Step 5 - Audit repairs (F-14 to F-17)** - lock the keyboard contract
      with a committed test (F-14), correct the comment that misstated the
      empty-image shape (F-15), request a `w_144,h_192,c_fill` Cloudinary crop
      for thumbnails only (F-16), and clamp the selected index on render (F-17).
      *Done when:* the committed suite covers Tab plus Enter and Space;
      thumbnail `src` contains the transform while the main image keeps its
      original; live image payload on the 5-picture offer drops measurably with
      every response still 200 and no broken image; `yarn verify` and the full
      `yarn test:browser` stay green.

- [x] **Step 6 - Audit repair (F-18)** - cross-reference the thumbnail crop
      size and the CSS thumbnail size, which the F-16 repair left coupled with
      nothing linking them.
      *Done when:* `Offer.css` points at `thumbnailUrl` and `Offer.jsx` points
      back at `Offer.css`; `yarn lint`, `yarn verify` and the offer suite stay
      green.

## Files / areas

- `src/pages/Offer/Offer.jsx` - picture list derivation, selection state,
  thumbnail markup.
- `src/pages/Offer/Offer.css` - strip layout, selected and focus states.
- `tests/browser/offer.spec.js` - new gallery tests alongside the existing
  status-badge and error tests.

## Data / contracts

Read-only consumption of the existing public `GET /offers/:id` response; no
request, route, auth, or persisted-data change. The page keeps its plain
`axios.get` (public endpoint, no token), not `src/api/client.js`.

A real captured response and the full field list live in
`blueprint/reference/api-offer-response.md`; use it for the step 3 fixtures.
Confirmed against it and the backend's `models/Offer.js` and
`models/imageSchema.js`:

- `image` is one Cloudinary subdocument and `pictures` an array of the same
  subdocument, max 5. Defaults are `{}` and `[]`, so an offer with no photo at
  all is a valid document the page must render without breaking.
- Image subdocuments have no `_id`, and `public_id` is **not** unique within an
  offer: the running API serves offers whose main image is repeated as
  `pictures[0]`, with the same `public_id` and `secure_url`. React keys combine
  it with the position.
- Both `url` (http) and `secure_url` (https) are present in practice, but
  Cloudinary does not always return every field (`signature`, `version_id`,
  `etag` can be missing), so read defensively rather than assuming a full
  object. `api_key` is deliberately excluded by the schema.
- Prefer `secure_url`, fall back to `url`. The current page renders the main
  image from `image.url`, which is plain http; routing the main image through
  the same derivation upgrades it to https as a side effect. That is intended
  here (an https deployment would otherwise block it as mixed content), and it
  is the one behavior change outside the strip itself.
- `status` is the enum `available | reserved | sold`, default `available`,
  already handled by the existing badge and Buy branches. Unchanged.
- `owner` is populated as `{ _id, account }`. Unchanged by this feature.

## Testing

- No unit test runner is configured (`AGENTS.md` declares no `test` command),
  so logic-bearing steps ride on browser evidence plus `yarn verify`. Do not
  install a runner as part of this feature.
- A `Browser tests` command exists (`yarn test:browser`), and the gallery is a
  click-driven UI behavior, so step 3's Playwright coverage is the proportionate
  gate. Run it before review.
- Manual click-through on the dev server: an offer with several pictures (main
  image selected first, each thumbnail switches the large image, Tab reaches
  each thumbnail with a visible focus ring), and an offer with none (no strip,
  page identical to master). Capture a screenshot of the first case for the
  review packet.

## Notes for the AI

- French UI copy only, matching the existing page (`Acheter`, `Réservé`,
  `Vendu`).
- Plain CSS in `Offer.css`, nested in the existing `.main-offer .container`
  block; no inline `style` props, no new wrapper convention, reuse `container`.
- One component per file and plain `useState`/`useEffect` - do not extract a
  new `Gallery` component or add a dependency (no carousel library); this is a
  small strip inside a page that already owns its state.
- Keep the existing loading, error, status-badge, and Buy branches untouched;
  the only `<img>` that changes is the main one at `Offer.jsx:57`.
- `offer.name` flows into `alt` and label text - it is user-controlled, so keep
  it as JSX text/attributes (React escapes it) and never build markup from it.
- Do not touch `Home.jsx:138`/`Home.jsx:145` or `Offer.jsx:82`. Both read
  `avatar.url` and `image.url` directly and would benefit from the same
  `secure_url` preference, but that is a separate cleanup: raise it as a `/fix`
  after this feature rather than widening this diff.
- No em dashes in code, comments, or commit messages.


<!-- blueprint:completion {"schemaVersion":1,"specBytes":10551,"specSha256":"674bd29c5422ef27861f096edd15d4fea4bf93451c7900b4fcac30b78da031ea","branch":"refs/heads/feature/multi-image-gallery-on-the-detail-page","head":"f2eafc20907157532cc7d0249768e469493550f3","baseRef":"refs/heads/master","baseCommit":"f2eafc20907157532cc7d0249768e469493550f3","sourceTree":"fc0fb0f98d166f4c9fb30a2e580f3cb64a1334f3","absentOptional":[]} -->

## Findings

### 19/F-14 [P2] closed - Keyboard activation of the gallery has no durable test

**File:** tests/browser/offer.spec.js:105
**Found:** 2026-09-19 by /audit (scope: current; lens: tests)
**Why it matters:** The feature 19 spec makes Enter/Space activation and Tab
reachability a done-when, and `/check` proved both against the live API, but
those runs used throwaway specs that were deleted. The seven committed tests in
`offer.spec.js` only ever call `.click()`. Replacing the thumbnail
`<button type="button">` (`Offer.jsx:97`) with a clickable `<div>` or `<a>`,
or dropping `type="button"`, would keep all seven green while making the strip
unusable by keyboard and, for a bare `div`, invisible to `getByRole('button')`
only after the fact. The accessibility contract is currently protected by
nothing in the repository.
**Suggested fix:** Add one test to `offer.spec.js` next to the existing swap
test: focus the first thumbnail, press `Tab` to the second, press `Enter`, and
assert the main image `src` changed and `aria-pressed` moved. A `Space` press on
a third thumbnail covers the other activation key. No new dependency; the same
mocked fixtures work.
**Resolution:** Repaired 2026-09-19 by /implement: tests/browser/offer.spec.js now focuses the first thumbnail by Tab, tabs to the second, activates with Enter, then activates a third with Space, asserting both the main src and aria-pressed each time. 9 tests green.

### 19/F-15 [P3] closed - Comment states the wrong empty-image shape

**File:** src/pages/Offer/Offer.jsx:24
**Found:** 2026-09-19 by /audit (scope: current; lens: quality)
**Why it matters:** The comment says "`image` defaults to `{}`". The schema
default is `{}`, but the API actually sends `image: {"tags": []}`, because
Mongoose materialises `imageSchema`'s `tags: [String]` (verified live on
`Robe d'été 100% coton...`, and recorded in
`blueprint/reference/api-offer-response.md`). The code is correct, since it
tests for a usable url, but the comment points the next reader at the exact
wrong test (`Object.keys(image).length === 0` is false here). A comment that
misstates the contract it exists to explain is worse than no comment.
**Suggested fix:** Replace "`image` defaults to `{}`" with "an offer with no
photo sends `image: {tags: []}`, never a falsy value". One line, no code change.
**Resolution:** Repaired 2026-09-19 by /implement: the comment now states that a photoless offer sends image: {tags: []} and is never falsy.

### 19/F-16 [P3] closed - Thumbnails download full-size images

**File:** src/pages/Offer/Offer.jsx:107
**Found:** 2026-09-19 by /audit (scope: current; lens: performance)
**Why it matters:** Measured on `Sac à main vintage cuir matelassé` (image + 5
pictures): the page transfers 437 KB of offer images, and every thumbnail loads
its 800x1000 original to render at 72x96, roughly 115 times the displayed pixel
area. The main image shares its URL with the matching thumbnail, so switching
pictures costs nothing extra, which is the saving grace. The 17 seeded offers
with 5 pictures all pay this. The feature 19 spec deliberately put Cloudinary
transformations out of scope, so this is a follow-up candidate, not a defect or
a missed requirement.
**Suggested fix:** Insert a Cloudinary transformation segment into the
thumbnail url only (`/upload/w_144,h_192,c_fill/`), leaving the main image
untouched. It is a string transform on `secure_url` with no new dependency, but
it changes a shipped url-building rule, so it belongs in its own `/fix` with the
user's agreement rather than inside this feature.
**Resolution:** Kept `fixed` after the 2026-09-19 /audit re-review: the original over-fetching is gone (verified live, 437 KB down to 121 KB, all image responses 200, no broken image), but the repair introduced F-18, a new coupling between the transform and the CSS thumbnail size. Closes once F-18 is resolved. Repaired 2026-09-19 by /implement: thumbnails request /image/upload/w_144,h_192,c_fill/ while the main image keeps its original url. Measured live on the 5-picture offer: 437 KB down to 121 KB, thumbnails now 144x192 natural, all 9 image responses 200, no broken image. Tradeoff accepted: main and thumbnail no longer share a url, so the first swap to each picture fetches it, measured at 114 ms locally. Closed 2026-09-19 by /audit: its only blocker, F-18, is resolved. Re-read Offer.jsx:28-32, the transform applies to thumbnails only and the main image keeps selectedPicture.url; offer.spec.js:158 locks both halves of that rule. The live measurement stands: the source has not changed since it was taken except for comments, and the built bundle was proven byte-identical across that comment change.

### 19/F-17 [P3] closed - Out-of-range selected index would leave no thumbnail pressed

**File:** src/pages/Offer/Offer.jsx:71
**Found:** 2026-09-19 by /audit (scope: current; lens: quality)
**Why it matters:** `pictures[selectedPictureIndex] ?? pictures[0]` falls back to
the first picture when the index exceeds the list, but `selectedPictureIndex`
itself is not reset, so no thumbnail would match `index === selectedPictureIndex`
and the strip would announce `aria-pressed="false"` everywhere while showing
picture 1. No reachable path produces it today: the list only changes on a fetch,
and the fetch resets the index (`Offer.jsx:58`). Recorded as a lead, not a
defect; it would become reachable if the gallery ever gained in-place list
updates.
**Suggested fix:** None needed now. If it ever becomes reachable, clamp on
render rather than adding an effect: derive the index as
`Math.min(selectedPictureIndex, pictures.length - 1)`.
**Resolution:** Repaired 2026-09-19 by /implement: the render clamps with Math.min(selectedPictureIndex, pictures.length - 1) and the thumbnails compare against that clamped index, so the pressed thumbnail always matches the displayed picture. Closed 2026-09-19 by /audit: re-read offer.spec.js:130. The test tabs to the first thumbnail, tabs on, activates with Enter, then Space on a third, asserting the main src and aria-pressed each time. The Tab loop is bounded and ends in an explicit focus assertion, so a miss fails loudly instead of passing silently. 40 tests green. Closed 2026-09-19 by /audit: re-read Offer.jsx:22-25. The comment matches the live contract and no longer points at an Object.keys test. Closed 2026-09-19 by /audit: re-read Offer.jsx:79-83. selectedIndex is clamped on render and the thumbnails compare against it, so the pressed thumbnail cannot drift from the displayed picture. An empty list yields -1 and renders no gallery, which is the existing no-photo path.

### 19/F-18 [P3] closed - Thumbnail crop size is coupled to the CSS size with nothing linking them

**File:** src/pages/Offer/Offer.jsx:30
**Found:** 2026-09-19 by /audit (scope: current; lens: quality)
**Why it matters:** The transform hardcodes `w_144,h_192` for the 2x of the
`72px` by `96px` thumbnail declared in `Offer.css:57-58`. The two live in
different files and different languages, and only the JS side carries a comment
explaining the relationship. Changing the CSS size is the natural way to resize
thumbnails, and doing so silently leaves the requested crop wrong: too small
gives blurry thumbnails, too large gives back the payload this transform was
added to save. Nothing fails, so the drift would ship. Introduced by the F-16
repair, which is why F-16 stays `fixed` rather than closing.
**Suggested fix:** Add a one-line comment above `Offer.css:57` pointing at
`thumbnailUrl` in `Offer.jsx`, so whoever changes the size sees the other half.
A shared constant would mean generating the CSS or injecting a custom property
for two numbers used once, which costs more than the drift it prevents.
**Resolution:** Repaired 2026-09-19 by /implement: Offer.css:57-58 now carries a comment pointing at thumbnailUrl, and the Offer.jsx comment points back at Offer.css. Whoever changes either side sees the other. yarn lint, yarn verify and the offer suite stay green. Closed 2026-09-19 by /audit: re-read Offer.css:55-62 and Offer.jsx:28-30. The cross-reference exists in both directions, so a change started from either file surfaces the other. Comment-only diff, with the bundle proven byte-identical, so nothing shipped changed.
