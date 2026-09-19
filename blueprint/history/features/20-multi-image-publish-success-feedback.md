# Feature: Multi-image publish + success feedback

**From build-plan:** feature 20
**Build attempt:** 1
**Status:** verified
**Branch:** `feature/multi-image-publish-success-feedback`

## Goal

`/publish` sends one main `picture` and, on success, only writes the response to
the console: the seller sees nothing happen, and the up-to-5 secondary
`pictures` the backend stores (and feature 19 already displays) can never be
uploaded. Add the secondary pictures to the form, and turn submission into real
feedback: a French error when it fails, a blocked double-submit while it runs,
and a confirmation plus a jump to the new offer when it succeeds.

## In scope

- The existing single file input becomes the explicit main `picture`: required
  before submit, with a working `label`/`id` association.
- A second file input accepts up to 5 secondary `pictures`, lists what is
  selected, and refuses more than 5 with a French message before any request.
- Failed publishes render through the shared `ErrorMessage` component instead
  of `console.log`, and that component announces itself to assistive tech.
- The submit button is disabled while the request is in flight, so one article
  cannot be published twice by double-clicking.
- On success, navigate to `/offers/:id` for the created offer, which shows a
  one-time French confirmation banner. If the create response carries no usable
  id, fall back to a confirmation on the publish page (see Data / contracts).
- Styles in the currently empty `src/pages/Publish/Publish.css`, scoped to the
  controls this feature adds or changes.
- Playwright coverage in a new `tests/browser/publish.spec.js`.
- Record the verified `POST /offers/publish` request and response contract under
  `blueprint/reference/`, since feature 23's edit form will need it.

## Out of scope

- Image previews, thumbnails, drag-and-drop, reordering, or removing one
  selected file. Re-picking replaces the selection, which is the native control
  behavior and enough here.
- Client-side file type, size, or dimension validation. The backend and
  Cloudinary own those limits and this project has no evidence of what they are.
- The `newsletter` checkbox on this form. Its state is never sent and its label
  reads "Je suis intéressé(e) par les échanges", so the name and the copy
  disagree. That is a pre-existing defect: raise it as a `/fix`, do not
  repurpose it here.
- Any restyling of the form beyond the controls this feature touches. The page
  has shipped with an empty `Publish.css` since before this feature.
- Editing or deleting an offer after publishing it (feature 23), and the
  "My offers" listing (features 26 and 27).
- The `/publish` route guard. `Publish` already redirects to `/` without a
  token; leave that branch as it is.
- Feature 19's gallery behavior on the detail page. Only the new confirmation
  banner is added there.

## Build loop

Build one small step at a time. `workflow.stepReview` is `feature`, so build
every step and produce one review packet at the end, not one per step.
`workflow.checkpointCommits` is `disabled`, so do not offer checkpoint commits;
`/complete` makes the single feature commit. Never accept a review packet you
have not read.

## Build steps

- [x] **Step 1 - Real submit feedback for the main picture** - in
      `Publish.jsx`, initialise the file state to `null` instead of `{}` (today
      an empty object is appended as the `picture` field on every submit), give
      the input `id="picture"` and `name="picture"` so the existing
      `htmlFor="picture"` label actually associates, and block submit with a
      French message when no main picture is chosen. Replace both `console.log`
      branches with a local `error` state rendered through `ErrorMessage` above
      the form, and clear it at the start of each submit. Add a `submitting`
      state that disables the button while the request runs. Add `role="alert"`
      to `ErrorMessage.jsx` so validation and request errors are announced; it
      is a shared component, so confirm its other consumers still behave.
      *Done when:* `yarn lint` and `yarn verify` pass; submitting with no photo
      shows a French error and fires no network request (checked in the browser
      network panel); a failing publish shows the backend message instead of a
      silent console line; the button is disabled from click until the response
      arrives; and the full `yarn test:browser` suite stays green across the
      `ErrorMessage` change.

- [x] **Step 2 - Secondary pictures, with the multipart contract verified** -
      add a second `<input type="file" multiple>` with its own label and id,
      hold the selection as an array in state, show the selected file names, and
      refuse a selection larger than 5 with a French message before submitting.
      Append each selected file to the `FormData` under the `pictures` field.
      **The exact multipart encoding is not established anywhere in this
      repository**, so verify it with one real publish against the running API
      before building on it: send repeated `pictures` entries first, and only if
      the created offer comes back with an empty `pictures` array, try
      `pictures[]`. Write down what worked in
      `blueprint/reference/api-offer-publish.md` along with the full request
      fields and the create response body.
      *Done when:* a real publish with 3 secondary photos against the running
      API returns an offer whose `pictures` array holds 3 entries, and
      `/offers/:id` for that offer renders 4 thumbnails through feature 19's
      gallery; selecting 6 files shows the French limit message and fires no
      request; publishing with no secondary files still succeeds exactly as in
      step 1; `yarn lint` and `yarn verify` pass; and the reference file records
      the encoding that was proven, not the one that was assumed.

- [x] **Step 3 - Confirmation on the new offer** - on a successful publish,
      `useNavigate` to `/offers/<created id>` passing router state
      (`{ published: true }`), and in `Offer.jsx` render a one-time French
      confirmation banner when `useLocation().state?.published` is set, then
      replace the history entry so a reload does not show it again. If step 2
      proved the create response has no usable id, skip the navigation and
      instead replace the form with the same confirmation text on `/publish`;
      record which branch shipped and why.
      *Done when:* a real successful publish lands on the new offer's page with
      the banner visible above the offer; reloading that page shows the offer
      without the banner; navigating to the same offer from Home never shows it;
      `yarn verify` passes and the existing `offer.spec.js` suite stays green.
      *Shipped branch:* the redirect. `POST /offers/publish` returns the full
      created offer with a top-level `_id`, so the on-page fallback is dead code
      in practice but stays as the guard for a response without one.

- [x] **Step 4 - Styles for the new controls** - fill
      `src/pages/Publish/Publish.css` for the pieces this feature touches: the
      two file inputs and their labels, the selected-file-name list, the error
      position above the form, and the disabled submit button. Style the
      confirmation banner in `Offer.css` next to the existing gallery rules.
      Reuse the shared `container` class and the colors already used elsewhere;
      no inline `style` props, no new wrapper convention.
      *Done when:* `yarn verify` passes, a screenshot of `/publish` with a main
      photo and 3 secondary files selected shows both inputs labelled and the
      file names legible, a second screenshot shows the disabled button during
      submit, and a third shows the confirmation banner on the offer page.

- [x] **Step 5 - Browser coverage** - add `tests/browser/publish.spec.js`,
      reusing the UI login helper from `logout.spec.js` (the access token lives
      in memory, so the tests must log in through the form) and `setInputFiles`
      with in-memory buffers like `fixtures.js`'s `PNG`. Cover: submitting with
      no main picture shows the French error and sends no request; a mocked
      `POST /offers/publish` receives the main `picture` plus 3 `pictures`
      entries in the encoding step 2 proved; selecting 6 secondary files blocks
      the submit; a 400 response renders the backend message; and a success
      navigates to the new offer's URL with the banner visible.
      *Done when:* `yarn test:browser` passes with the new file and every
      existing spec green, and `yarn verify` still passes.

- [x] **Step 6 - Audit repairs (F-24 to F-29)** - clear each file input's own
      message instead of all or nothing, so choosing a main photo drops the
      "add a main photo" error while a backend message survives until the next
      submit (F-24). Lock the in-flight disabled button with a held-open mocked
      request, the pattern `reset-password.spec.js:67` already uses (F-25), and
      lock the no-id confirmation branch with a mocked `{}` response (F-26). Add
      `accept="image/*"` to both file inputs (F-27). Bind the publication banner
      to the offer id it arrived with, so it cannot follow the seller onto a
      second offer if one is ever linked from an offer page (F-28). Delete the
      `newsletter` state and checkbox from the publish form: it is a stray copy
      of the signup form's field, it is never sent, and its label is about
      swaps (F-29).
      *Done when:* the two new regression tests fail against the unrepaired code
      and pass against the repair; `yarn lint`, `yarn verify` and the full
      `yarn test:browser` stay green; and a screenshot shows the publish form
      without the checkbox.

## Files / areas

- `src/pages/Publish/Publish.jsx` - file state, validation, submit feedback,
  `FormData` assembly, navigation on success.
- `src/pages/Publish/Publish.css` - currently empty; styles for the controls
  this feature adds or changes.
- `src/components/ErrorMessage/ErrorMessage.jsx` - add `role="alert"`.
- `src/pages/Offer/Offer.jsx` and `src/pages/Offer/Offer.css` - the one-time
  confirmation banner only.
- `tests/browser/publish.spec.js` - new.
- `blueprint/reference/api-offer-publish.md` - new, the verified publish
  contract.

## Data / contracts

Authenticated write against the live backend through `src/api/client.js`, which
already attaches the bearer token, sets `withCredentials: true`, and retries
once through `/users/refresh` on a 401. Keep using it; do not add a second axios
instance or hand-build the `Authorization` header.

Established by the build plan and `project-overview.md`:

- `POST /offers/publish` takes multipart `title`, `description`, `price`,
  `brand`, `size`, `color`, `condition`, `city`, and a required main `picture`.
  Those fields already match the live backend and must not change shape.
- An `Offer` carries `image` (one required Cloudinary subdocument) and
  `pictures` (at most 5 of the same shape). The 5 cap is the backend's, so the
  form enforces it client-side as feedback, not as the real boundary.
- Image subdocuments and the `GET /offers/:id` response are documented in
  `blueprint/reference/api-offer-response.md`.

**Not established, and resolved by step 2's live check, not by assumption:**

- How several files are encoded under `pictures` in the multipart body
  (repeated `pictures` entries, the likely shape for an Express file middleware,
  versus `pictures[]`).
- Whether the create response returns the full created offer, a bare `_id`, or
  neither. Step 3's redirect depends on reading an id from it; the documented
  fallback is an on-page confirmation, which still satisfies "show a
  confirmation", so neither answer blocks the feature.

Both answers go into `blueprint/reference/api-offer-publish.md` in step 2, so
feature 23's edit form does not have to rediscover them.

`title`, `description`, and the detail fields are user-controlled text. They are
only ever sent as `FormData` values and read back as JSX text, which React
escapes; never build markup from them.

## Testing

- No unit test runner is configured (`AGENTS.md` declares no `test` command), so
  logic-bearing steps ride on browser evidence plus `yarn verify`. Do not
  install a runner as part of this feature.
- A `Browser tests` command exists (`yarn test:browser`), and this is a
  click-and-type form flow with a navigation at the end, exactly the case the
  standards call for, so step 5's Playwright file is the proportionate gate. Run
  the full suite before review, not just the new file.
- `yarn test:browser` runs against mocks. The multipart encoding and the create
  response shape are contracts a mock cannot prove: steps 2 and 3 need one real
  publish against the running API with a logged-in account. Do not claim that
  evidence from a Playwright run.
- Manual click-through on the dev server for the screenshots named in step 4.

## Notes for the AI

- French UI copy only, matching the existing form (`Vends ton article`,
  `Ajoute une photo`, `Ajouter`).
- One component per file, plain `useState` - do not extract a new uploader
  component or add an upload dependency for two file inputs.
- Reuse `ErrorMessage` for every error path on this page, including the
  client-side validation messages: it already accepts a plain string.
- Keep the existing `token ? form : <Navigate to="/" />` guard, the field names
  in the `FormData`, and the rest of the form's markup as they are. The diff
  should be the file inputs, the submit handler, and the new CSS.
- `Publish.css` is empty today, so the page is unstyled. Style only what this
  feature touches; a full restyle is a separate piece of work.
- Do not widen the `ErrorMessage` change beyond `role="alert"`. Other pages
  render it and their specs must stay green.
- No em dashes in code, comments, or commit messages.

## Notes on selection

Build-plan item 6 (real Stripe checkout) is the first unchecked line, but the
plan itself defers it: `vinted-backend` has no payment route, and the Stripe
products and webhook do not exist yet, so the line says to scope the frontend
wiring once that backend work starts. Item 20 is the first actionable unchecked
item and is what this spec covers.


<!-- blueprint:completion {"schemaVersion":1,"specBytes":14318,"specSha256":"a615eaf72bbcc0b15a1c9f79ad5ca5e1d6d9064d0f7e2035c6075fe34408039b","branch":"refs/heads/feature/multi-image-publish-success-feedback","head":"2dc6e1c432a9e5235ced0a0743fa41d42b71e6af","baseRef":"refs/heads/master","baseCommit":"2dc6e1c432a9e5235ced0a0743fa41d42b71e6af","sourceTree":"38897a9f209955f81be546e57d4f948eeb757c15","absentOptional":[]} -->

## Findings

### 20/F-24 [P2] closed - Stale "add a main photo" error survives adding one, and the two file inputs clear errors inconsistently

**File:** src/pages/Publish/Publish.jsx:97
**Found:** 2026-09-19 by /audit (scope: current; lens: quality)
**Why it matters:** Submitting with no photo sets `MISSING_PICTURE`. Choosing a
main photo right after calls only `setPicture`, so the alert keeps telling the
seller to add a main photo while one is attached. The secondary input does the
opposite at `Publish.jsx:110-116`: any selection of 5 or fewer clears `error`
unconditionally, including a backend message the seller has not acted on. So one
input never clears and the other always does. `ResetPassword.jsx:35,74` and its
committed test `reset-password.spec.js:114` show this project treats stale error
copy as a defect worth a test. It self-corrects on the next submit, which is why
this is P2 and not higher.
**Suggested fix:** Clear on the input that fixes the condition, not on the other
one: add `setError(null)` to the `#picture` `onChange`, and in the `#pictures`
`onChange` set the limit message when over 5 and otherwise clear only that
message rather than any error. Two lines, no new state.
**Resolution:** Repaired 2026-09-19 by /implement: the `#picture` onChange clears only MISSING_PICTURE and only when a file is present, and the `#pictures` onChange sets TOO_MANY_PICTURES over the cap and otherwise clears only that same message. A backend error now survives both. Locked by publish.spec.js "each file input clears only the message it resolves", which fails against the old code. Closed 2026-09-19 by /audit: re-read Publish.jsx:98-106 and 125-131. The two handlers are now symmetric, each touching only its own message, and neither can wipe a backend error. Locked by publish.spec.js:211, which I saw fail against the unrepaired handler.

### 20/F-25 [P2] closed - The in-flight disabled button has no test, so the double-submit guard can regress silently

**File:** tests/browser/publish.spec.js:120
**Found:** 2026-09-19 by /audit (scope: current; lens: tests)
**Why it matters:** The spec makes "cannot be published twice by
double-clicking" an In-scope contract, and `Publish.jsx:241` implements it with
`disabled={submitting}`. `publish.spec.js` asserts `toBeEnabled()` after a 400
but never asserts the disabled state during the request, so deleting
`disabled={submitting}` leaves all 53 browser tests green while a double click
publishes two offers against the live API. Only a screenshot proves it today,
and screenshots are not re-run. `reset-password.spec.js:67-87` already holds the
exact pattern for this, including the note on why it holds the request open
instead of using a fixed delay.
**Suggested fix:** Copy that test into `publish.spec.js`: hold the mocked
`POST /offers/publish` on an unresolved promise, click `Ajouter`, assert the
button is disabled, then release. No new dependency or fixture.
**Resolution:** Repaired 2026-09-19 by /implement: publish.spec.js "disables the submit button while the publish request is in flight" holds the mocked POST open and asserts the button is disabled. Verified it fails when `disabled={submitting}` is removed and passes when it is restored. Closed 2026-09-19 by /audit: re-read publish.spec.js:172-195. It holds the mocked POST on an unresolved promise, asserts the disabled button, then releases, matching the reset-password pattern including its reason. Observed failing with `disabled={submitting}` removed and passing with it restored.

### 20/F-26 [P3] closed - The no-id confirmation fallback is unreachable and untested

**File:** src/pages/Publish/Publish.jsx:69
**Found:** 2026-09-19 by /audit (scope: current; lens: tests)
**Why it matters:** `/check` proved `POST /offers/publish` always returns the
full created offer with a top-level `_id`, recorded in
`blueprint/reference/api-offer-publish.md`. The `setPublished(true)` branch, the
`published` state, the `publish-confirmation` paragraph and its CSS rule at
`Publish.css:49` therefore never run against the real backend, and no test
exercises them. It is a reasonable guard against a malformed response (without
it the seller would see nothing happen at all), so this is not dead code to
delete on sight, but it is shipped behavior nobody has ever observed.
**Suggested fix:** Either lock it with one mocked test that returns `{}` and
asserts the on-page confirmation replaces the form, or drop the branch and let
a response without an id fall through to the error path. The test is the smaller
change and keeps the guard. Losing the guard is a behavior change, so deleting
it needs the user's decision.
**Resolution:** Repaired 2026-09-19 by /implement: the guard stays and is now locked by publish.spec.js "confirms on the page when the created offer comes back without an id", which returns `{}` and asserts the confirmation replaces the form without leaving /publish. No shipped behavior removed. Closed 2026-09-19 by /audit: re-read publish.spec.js:197-208. A `{}` response now proves the confirmation replaces the form and the page stays on /publish, so the guard is observed behavior rather than untested code. The guard itself is unchanged.

### 20/F-27 [P3] closed - The file inputs accept any file type

**File:** src/pages/Publish/Publish.jsx:92
**Found:** 2026-09-19 by /audit (scope: current; lens: performance)
**Why it matters:** Neither file input declares `accept`, so the picker offers
every file. Choosing a non-image means uploading it in full, over whatever
connection the seller has, before the backend rejects it. With up to 6 files per
publish that is the largest wasted transfer in the app. `accept` is a native
attribute that filters the picker, not validation, so it does not conflict with
the spec's decision to leave type and size checks to the backend.
**Suggested fix:** Add `accept="image/*"` to both inputs. One attribute each; it
does not prevent a determined user from choosing another file, so the backend
stays the real boundary.
**Resolution:** Repaired 2026-09-19 by /implement: both file inputs declare accept="image/*", asserted in a browser run before the temporary spec was removed. The backend stays the real boundary. Closed 2026-09-19 by /audit: re-read Publish.jsx:94 and 120. Both inputs declare accept="image/*" and the backend remains the real boundary. No committed test asserts the attribute, which is deliberate: asserting a static attribute would only mirror the implementation. Recorded under remaining risk instead.

### 20/F-28 [P3] closed - The publication banner would follow the user to a second offer if one were ever linked from an offer page

**File:** src/pages/Offer/Offer.jsx:55
**Found:** 2026-09-19 by /audit (scope: current; lens: quality)
**Why it matters:** `justPublished` is captured in a `useState` initialiser, so
it is read once per mount and never recomputed. React Router keeps the same
`Offer` instance when only `:id` changes, so an offer-to-offer client-side
navigation would carry the banner onto an offer the seller did not just publish.
No such path exists today: `Home.jsx:138` holds the only link to an offer, and
reaching it unmounts `Offer`. Recorded as a lead, not a defect, the same way
F-17 was in feature 19. Features 21, 22 and 25 add links between pages and could
make it reachable.
**Suggested fix:** None needed now. If an offer ever links to another offer,
reset it on `params.id` alongside the existing `setSelectedPictureIndex(0)` in
the fetch effect rather than adding another effect.
**Resolution:** Repaired 2026-09-19 by /implement without waiting for it to become reachable, because the fix was smaller than the lead: the banner now binds to the offer id it arrived with (`publishedId === params.id`) instead of a bare boolean, so a future offer-to-offer navigation cannot carry it over. No effect and no extra render added. Closed 2026-09-19 by /audit: re-read Offer.jsx:55-59. The banner binds to the id it arrived with, so a change of :id within one mount no longer shows it on another offer. One residue, equally unreachable today: navigating A to B and back to A inside a single mount would show it on A again, because publishedId still matches. It needs the same offer-to-offer link that does not exist, and it would show the banner on the offer it actually belonged to, so it is not worth further machinery.

### 20/F-29 [P3] closed - The publish form collects a `newsletter` value it never sends, under a label about something else

**File:** src/pages/Publish/Publish.jsx:22
**Found:** 2026-09-19 by /audit (scope: current; lens: quality)
**Why it matters:** `newsletter` has state and a checkbox but is never added to
the `FormData`, so ticking it does nothing. Its label reads "Je suis
intéressé(e) par les échanges", which is about swaps, not a newsletter, so the
name and the copy disagree and neither matches any field the backend stores on
an offer. Pre-existing, and feature 20's spec deliberately left it alone, but
the spec is archived on completion while this ledger survives.
**Suggested fix:** Decide what it is meant to be, then either remove the state
and the checkbox, or rename it to match the copy and send it once the backend
has a field for it. Removing visible UI is a behavior change and needs the
user's decision.
**Resolution:** Repaired 2026-09-19 by /implement: the `newsletter` state, checkbox and label are removed from the publish form on the user's explicit "fix all". It was a stray copy of the signup form's field (Signup.jsx keeps its own and still sends it), nothing consumed it, and no backend field stores it on an offer. Screenshot confirms the form renders without it. Closed 2026-09-19 by /audit: re-read Publish.jsx:12-26 and 228-241, and grepped the page for `newsletter` and `échanges` with no match. The state, checkbox and label are gone and Signup.jsx keeps its own working field. Nothing asserts the absence, by the same reasoning as F-27.
