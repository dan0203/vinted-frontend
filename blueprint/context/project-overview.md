# Vinted-Style Marketplace Frontend - Project Overview

<!-- blueprint:source-hash 06465952fbfc4c2e0633428b5c3c421f67bce0a0857ad92f901ac8de0a913f43 -->

> A secondhand-clothing marketplace frontend (browse, publish, favorite, buy),
> built as a learning/portfolio project against a separate backend repo.

## Problem

Give people a simple way to browse, publish, and buy secondhand clothing
online, Vinted-style. This is a learning/portfolio project, not a production
business.

## Users

- **Anonymous visitors** - browse offers and view offer details.
- **Signed-up users** (simulated buyers/sellers) - everything anonymous users
  can do, plus publish, favorite, and buy offers.

## Usage model

Small scale, single-tenant, non-adversarial, learning/demo context. No
compliance, availability, or audit requirements. Anonymous browsing is public;
publishing, buying, and favoriting require an authenticated account owned by
that user.

Sessions are sliding with no absolute cap: one stays alive as long as the user
returns within the refresh cookie's window, and every visit extends it. A
deliberate choice for a consumer marketplace with no payment data in the
session, where signing an active user out would buy no security.

## Features

In build-plan order. Items 1-5 and 7-21 have shipped; the contract migration
(item 8) was the gating item they were built on. **The headline item now open
is item 28 (restore the session on page load)** - the access token lives only
in memory, so every reload or shared link starts signed out, and item 22 is
authenticated-only and depends on it.

1. **Browse offers (home)** - lists offers from the API on the live field/route contract.
2. **Offer detail page** - single offer view on the live contract.
3. **Signup** - create an account, with the confirmation-message UX from item 12.
4. **Login** - authenticate, with the 403/423 handling from item 9.
5. **Publish an offer** - publish form matching the live backend fields.
6. **Real Stripe checkout** - > TODO: the current flow calls an unrelated external test endpoint; needs Stripe products/prices and a webhook in the Stripe dashboard plus a payment route on `vinted-backend` before the frontend wiring can be scoped.
7. **Environment variables + generic error component** - `VITE_API_URL`, the Stripe key in env, one shared error display.
8. **Migrate to `/users/*` routes and new offer fields** - the contract rework: renamed routes, `name`/`description`/`price`/`details`/`image`/`pictures` on offers.
9. **Login: new token flow + account-state errors** - in-memory access token, httpOnly refresh cookie, 403 (unconfirmed/invalid) and 423 (locked) handling.
10. **Silent token refresh** - transparent 401 -> refresh -> retry, redirect to `/login` only if the refresh also fails.
11. **Logout: invalidate session server-side** - `POST /users/logout`, not just clearing the local cookie.
12. **Signup: handle inactive-account response** - "check your email" state instead of auto-redirecting to Home.
13. **Account confirmation screen** - `/confirm/:token` calls `GET /users/confirm/:token`.
14. **Resend confirmation email** - small email-only form (`POST /users/confirm/resend`).
15. **Forgot password flow** - request screen + confirm screen (code + new password).
16. **Consistent loading/error states** - every fetching page resolves to a real error state, not a stuck spinner.
17. **Search, filters, sort, pagination on the offers list** - `?title=`, `?priceMin=&priceMax=`, `?sort=`, `?page=`.
18. **Offer status on the detail page** - "Sold"/"Reserved" badge, disabled Buy button.
19. **Multi-image gallery on the detail page** - show the secondary `pictures`.
20. **Multi-image publish + success feedback** - up to 5 secondary pictures, confirm and redirect on success.
21. **Favorites toggle** - optimistic heart/star on card and detail page.
22. **My Favorites page** - `/favorites`, authenticated-only, reusing the offer card. Blocked on item 28.
23. **Edit, delete, and status changes for owned offers** - owner-only edit, status change, and confirmed delete.
24. **Account profile page** - view/edit profile, delete the account (cascades to the user's offers). The backend has no in-session password-change route; only the item 15 reset flow changes a password.
25. **Public seller profile page** - `/users/:id`, no auth required.
26. **"My offers" page** - > TODO: needs an `owner` filter on `GET /offers` or a `GET /users/:id/offers` route on `vinted-backend` first.
27. **Wire owner actions into "My offers"** - surface item 23's actions once item 26 exists.
28. **Restore the session on page load** - one `POST /users/refresh` on `App` mount, adopting the returned `accessToken` when the refresh cookie is still valid; a 401 means genuinely signed out and renders normally, never a redirect. Build before item 22, and clear the `useFavorites` Set when `userId` changes, since this is the first feature that lets the session change under a mounted page.

## Data model

Owned by the separate `vinted-backend` repo; the shapes below are the live
contract this frontend must match.

### User

- `_id` (ObjectId)
- `email` (string, unique)
- `account.username` (string)
- `account.avatar` (Cloudinary image, optional)
- `newsletter` (boolean)
- `active` (boolean) - false until the emailed confirmation link is followed; login is refused while inactive
- `favorites` (Offer[] references)
- Auth: short-lived (15 min) JWT access token returned in the response body; httpOnly `refreshToken` cookie (`path: /users`, ~30 days, rotated on `/users/refresh`); locked for 15 minutes after 5 failed logins (423)
- The cookie's window is sliding, not absolute: the server reissues it when it rotates, and it alone decides how often that happens. The cookie being httpOnly, this frontend cannot observe the difference and must not depend on it
- `POST /users/refresh` returns `{ accessToken }` alone, with no `_id` and no Authorization header, so the user id keeps coming from the token's `sub` claim

> Lock this shape: items 8-12, 21-24, and 28 all depend on it.

### Offer

- `_id` (ObjectId)
- `name` (string), `description` (string), `price` (number)
- `details` (object: `brand`, `size`, `color`, `condition`, `city`)
- `image` (single Cloudinary image, required)
- `pictures` (up to 5 secondary Cloudinary images)
- `status` (`available` | `reserved` | `sold`)
- `owner` (User reference, populated as `{ _id, account }`)
- `createdAt`
- List responses are paginated: `count`, `page`, `totalPages`, 20 per page

> Lock this shape: items 1, 2, 5, 8, 17-20, and 23 all depend on it.

### Payment (not implemented yet)

Stripe PaymentIntent + webhook, to be added as a route on `vinted-backend`
once the Stripe products/prices and the webhook exist (item 6). Nothing about
payments is persisted in this repo.

## Tech stack

- **Vite + React 19** - build tool and UI framework.
- **react-router 7** - client-side routing, declared in `App.jsx`.
- **axios** - HTTP calls to `vinted-backend`; authenticated calls need `withCredentials: true` so the refresh cookie round-trips (items 9-10, 28).
- **js-cookie** - local auth-state cookie handling.
- **react-icons** - icon set.
- **Stripe** (`@stripe/react-stripe-js`, `@stripe/stripe-js`) - checkout UI, pending a real backend payment route (item 6).
- **Backend**: separate repo, [vinted-backend](https://github.com/dan0203/vinted-backend). This Blueprint instance manages only the frontend; backend contract changes are tracked here as frontend work to adapt to, not implemented here.

## Monetization

Not applicable - learning/portfolio project, no monetization planned.

## UI/UX

French-language UI, minimalist marketplace look inspired by Vinted (hero
banner, card grid of offers, simple forms).

- `/` - home, offer list with search, filters, sort, and pagination
- `/offers/:id` - offer detail: gallery, status badge, favorite, buy
- `/signup`, `/login` - auth
- `/confirm/:token` - account confirmation, with the resend-confirmation form reachable from here and from login
- password reset - request screen and confirm screen (item 15)
- `/publish` - publish an offer
- `/payment` - Stripe checkout
- `/favorites` - the signed-in user's favorites (item 22)
- `/users/:id` - public seller profile (item 25)

## Deployment

> TODO: no deployment target chosen yet (Vercel and Netlify mentioned as
> candidates for this frontend; the backend deploys separately from its own
> repo). Run `/release` when ready to plan hosting.

Whichever host is chosen, `vinted-backend`'s `FRONTEND_URL` environment
variable (`cors({ origin: FRONTEND_URL, credentials: true })`) must be updated
to match this frontend's deployed origin, or the browser cannot send or receive
the httpOnly refresh cookie the auth flow depends on (item 9).

Frontend env vars by name: `VITE_API_URL`, plus the Stripe publishable key
moved into env by item 7.

## Open questions

> Item 6 (real Stripe checkout) and item 26 ("My offers") are both marked
> `> TODO (confirm)` in the build plan and blocked on backend work that does
> not exist yet: a payment route, and an `owner` filter or a
> `GET /users/:id/offers` route.
> Item 24 notes the backend has no in-session password-change route, only the
> item 15 reset flow.
> The deployment target is undecided (project plan section 8).
