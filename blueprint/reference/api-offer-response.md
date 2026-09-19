# Reference: `GET /offers/:id` response

A real response captured from `vinted-backend` on 2026-09-19, with `owner`
populated. The backend lives in a separate repo
([vinted-backend](https://github.com/dan0203/vinted-backend)), so this file is
the frontend's copy of the contract: use it for fixtures and for checking field
names instead of guessing.

## Sample

```json
{
  "_id": "6718c3f0a1b2c3d4e5f60789",
  "name": "Veste en jean Levi's 501",
  "description": "Veste en jean oversize, portée deux fois, aucun défaut. Coupe droite, boutons métal d'origine.",
  "price": 45.9,
  "details": {
    "brand": "Levi's",
    "size": "M",
    "color": "Bleu délavé",
    "condition": "Très bon état",
    "city": "Lyon"
  },
  "image": {
    "asset_id": "a1b2c3d4e5f60718293a4b5c6d7e8f90",
    "public_id": "vinted/offers/6718c3f0a1b2c3d4e5f60789/main",
    "version": 1729512345,
    "version_id": "f0e9d8c7b6a5948372615043f2e1d0c9",
    "signature": "3a7f9c2e1b8d4056a9f3c7e2b1d8409f6c5e3a2b",
    "width": 1200,
    "height": 1600,
    "format": "jpg",
    "resource_type": "image",
    "created_at": "2026-09-14T09:25:45.000Z",
    "tags": [],
    "bytes": 284517,
    "type": "upload",
    "etag": "9c7e2b1d8409f6c5e3a2b7f1",
    "placeholder": false,
    "url": "http://res.cloudinary.com/demo/image/upload/v1729512345/vinted/offers/6718c3f0a1b2c3d4e5f60789/main.jpg",
    "secure_url": "https://res.cloudinary.com/demo/image/upload/v1729512345/vinted/offers/6718c3f0a1b2c3d4e5f60789/main.jpg",
    "folder": "vinted/offers/6718c3f0a1b2c3d4e5f60789",
    "access_mode": "public",
    "original_filename": "veste-jean-face"
  },
  "pictures": [
    {
      "asset_id": "b2c3d4e5f60718293a4b5c6d7e8f9012",
      "public_id": "vinted/offers/6718c3f0a1b2c3d4e5f60789/pictures/1",
      "version": 1729512350,
      "width": 1200,
      "height": 1600,
      "format": "jpg",
      "resource_type": "image",
      "created_at": "2026-09-14T09:25:50.000Z",
      "tags": [],
      "bytes": 301244,
      "type": "upload",
      "etag": "1d8409f6c5e3a2b7f19c7e2b",
      "placeholder": false,
      "url": "http://res.cloudinary.com/demo/image/upload/v1729512350/vinted/offers/6718c3f0a1b2c3d4e5f60789/pictures/1.jpg",
      "secure_url": "https://res.cloudinary.com/demo/image/upload/v1729512350/vinted/offers/6718c3f0a1b2c3d4e5f60789/pictures/1.jpg",
      "folder": "vinted/offers/6718c3f0a1b2c3d4e5f60789/pictures",
      "access_mode": "public",
      "original_filename": "veste-jean-dos"
    }
  ],
  "owner": {
    "_id": "6718b2e1a1b2c3d4e5f60123",
    "account": {
      "username": "marie_l",
      "avatar": {
        "public_id": "vinted/users/6718b2e1a1b2c3d4e5f60123/avatar",
        "secure_url": "https://res.cloudinary.com/demo/image/upload/v1729510000/vinted/users/6718b2e1a1b2c3d4e5f60123/avatar.jpg",
        "format": "jpg",
        "width": 400,
        "height": 400
      }
    }
  },
  "status": "available",
  "createdAt": "2026-09-14T09:25:45.612Z",
  "__v": 0
}
```

## What the frontend must not get wrong

From `models/Offer.js` and `models/imageSchema.js` on the backend:

- **`_id` is generated before insertion** by `services/offer.service.js`, because
  it is used as the Cloudinary folder path (visible in every `public_id` and
  `folder` above). It is declared explicitly in the schema for that reason.
- **`status` is an enum**: `available | reserved | sold`, default `available`.
  Sold offers are excluded from `GET /offers` by default.
- **An offer with no photo is a valid document**, and what it sends is
  `image: {"tags": []}`, **not** `{}`. The schema default is `{}`, but Mongoose
  materialises `imageSchema`'s `tags: [String]` into an empty array, so the
  object is neither falsy nor empty. Same for an avatarless account:
  `avatar: {"tags": []}`. Both `offer.image && ...` and
  `Object.keys(image).length === 0` are therefore wrong tests. **Test for a
  usable url** (`secure_url` or `url`), which is what the gallery does.
- **`pictures` holds at most 5** secondary images, same subdocument shape as
  `image`.
- **Image subdocuments have no `_id`.** Use `public_id` as the stable identifier
  (React keys, comparisons).
- **`api_key` is deliberately excluded** from the schema. Do not expect it and do
  not reintroduce it.
- **Cloudinary does not always return every field.** `signature`, `version_id`
  and `etag` can be missing, and the `avatar` above has no `url`. Read
  defensively; never assume a full object.
- **Prefer `secure_url` over `url`.** `url` is plain http and would be blocked as
  mixed content on an https deployment. Fall back to `url` only when `secure_url`
  is absent.
- **`owner` is a plain `ObjectId` in the database**; it is only ever populated,
  and only with `_id` and `account` (`offer.service.js:84-87`). So the shape above
  is what a populated read returns, nothing more: no `email`, no `newsletter`, no
  token fields, whatever the User model holds. Read `owner._id` and
  `owner.account.*` only, and do not assume `owner` is an object on a response
  that does not go through that populate.

## Observed against the running API (2026-09-19)

Probed directly on `http://localhost:3000`, against the seed described below:

- **`image.public_id` and `pictures[i].public_id` are not unique per offer.**
  Anything keying a list on `public_id` alone produces duplicate React keys.
  Combine it with the index, or key on the index. This is what broke feature 19's
  first implementation: the mocked fixtures gave every photo a distinct
  `public_id`, so only a live run could show it.
- `GET /offers` returns `{ count, page, totalPages, offers }` and serves only
  `available` and `reserved`; `sold` is excluded from the list but readable at
  `GET /offers/:id`.
- The avatar subdocument **does** carry `url` and `secure_url` in live data (it
  renders fine on the detail page). The abridged sample above omits `url`; do not
  read that omission as the contract.

### Test data (seed of 2026-09-19)

109 offers, 9 users, 96 offers visible in `GET /offers` over 5 pages. **Every
seeded account uses the password `Seed1234!`** (overridable with `SEED_PASSWORD`;
dev-only credential, this directory is git-ignored).

| Account | Useful for |
|---|---|
| `alice.martin@`, `bob.durand@`, `chloe.lefevre@`, `karim.benali@`, `emma.rousseau@` | own offers, any pair covers a 403 "not my offer" (features 23, 26, 27) |
| `nina.caron@` | 1 offer, no avatar - seller profile without avatar (feature 25) |
| `jo.pires@` | 6 favorites including reserved and sold (features 21, 22) |
| `karim.benali@` | exactly 1 favorite, on a sold offer |
| `theo.girard@` | never logs in: 403, unconfirmed account |
| `valentine.simon@` | never logs in: 423, locked 15 min after the seed |

Verified live counts: 40 offers with no secondary picture, 14 with 1, 16 with 2,
9 with 3, **17 with 5** (the cap); 27 with no usable main image, of which **8
still carry secondary pictures**; exactly **2 offers with a duplicate
`public_id` inside the offer**.

Named edge cases, findable by title:

| Offer | What it covers |
|---|---|
| `Sac à main vintage cuir matelassé` | image + 5 pictures, all distinct - 6 thumbnails, 4-digit price 1250.50 |
| `Baskets montantes en toile (doublon photos)` | `pictures[1] === pictures[0]` |
| `Pull col roulé en maille (doublon image principale)` | `pictures[0] === image`, the exact case that broke feature 19 |
| `Robe longue en soie imprimée...` | 104-char title, 900-char description - UI overflow |
| `Robe d'été 100% coton (taille S) [neuve] -50% ✨` | accents, punctuation, emoji, no photo at all, price 1 |
| `Lot de 3 paires de chaussettes de sport` | only offer of `nina_depot`, seller without avatar |
| `Manteau en laine ceinturé`, `Ceinture en cuir tressé` | `sold`, so absent from `GET /offers`, readable by id only |
| `Jupe en jean taille haute` | `reserved` without any photo |

**Cloudinary assets are shared between offers.** The seed uploads a pool of 10
images and references them round-robin, so several offers point at the same
`public_id`. `DELETE /offers/:id` destroys the asset for every offer that
references it (`cleanupOfferImages` destroys by `public_id`). When testing
feature 23, broken images on *other* offers after a delete are a seed artifact,
not a frontend bug. Re-seeding costs 17 uploads.

A url can therefore outlive its asset. The Home card handles it: the image falls
back to a same-size placeholder through `onError`, reading `Image indisponible`
(a photoless offer reads `Pas de photo` instead). **The offer detail page does
not**, and that was a deliberate call, since in production each offer owns its
upload and deleting one cannot break another's photos. If it is ever added, the
failing picture must be replaced in place rather than removed from the list:
removal renumbers every `Photo N sur T` label, can move the selection and can
make the whole strip disappear. The archived fix
`broken-images-card-overflow-and-login-link-spacing` records the full reasoning.

One offer (`Sac à main cuir`, index 60) deliberately has no `details.size`,
an out-of-contract state the API itself cannot produce (`size` is required).

Route inventory probed the same day, for features still being planned:

| Route | Result |
|---|---|
| `GET /users/:id` | 200, public, returns `{ _id, account }` - feature 25 is unblocked |
| `GET /users/:id/favorites` | 401 unauthenticated, so auth required - features 21-22 |
| `GET /users/:id/offers` | 404, does not exist, and is not planned - use the owner filter below |
| `POST /payment` | 404, no payment route - feature 6 still blocked |

### `GET /offers?owner=:id` (added 2026-09-19, verified live)

Public, and composable with `title`, `priceMin`/`priceMax`, `sort` and `page`, so
a seller's list reuses the same plumbing as the main offers list (features 25 to
27). Verified: `?owner=<valid id>` returns the usual
`{ count, page, totalPages, offers }`, `?owner=<id>&priceMin=5` narrows it, and a
malformed id returns 400 `"owner" contains an invalid value`. An unknown but
well-formed id returns an empty page rather than 404.

**The `sold` exclusion still applies to this filter.** `GET /offers` always adds
`status: { $ne: 'sold' }`, so an owner-filtered list cannot show the seller their
own sold items. Features 23, 26 and 27 need that history, so the frontend has
asked for an explicit `status` param restricted to the authenticated owner:
see `backend-request-owner-status.md`. Until it ships, treat an owner-filtered
list as "everything except sold".

## Known drift in this repo

`src/pages/Home/Home.jsx:145` reads `image.url`, which is plain http and would be
blocked as mixed content on an https deployment. Feature 19 fixed the offer
detail page; Home's card image is still on `url` and wants a `/fix`.

**The avatarless seller renders a broken image, on both pages.**
`Offer.jsx:80-86` and `Home.jsx:136-142` guard with
`{offer.owner.account.avatar && <img src={...avatar.url} />}`. An account with no
avatar sends `avatar: {"tags": []}`, which is truthy, so the `<img>` renders with
no `src` and shows the browser's broken-image icon next to the username.
Confirmed live on `Lot de 3 paires de chaussettes de sport` (`nina_depot`):
`src` is `null` and the element never loads. `Home.jsx:145` has the same problem
for the 27 photoless offers, plus its `url` is plain http. One `/fix` should
switch all of these to a usable-url test.

**The detail page's `aside` overflows on long content.** `.main-offer aside` has
a fixed `height: 600px` (`Offer.css`), so on `Robe longue en soie...` the
description, seller, title and Buy button spill outside the white card:
measured `scrollHeight` 1109 for a 600px box, with the `h1` bottom at 1155 while
the card ends at 688. Verified identical on `master`, so it predates the gallery
and is a separate `/fix`, not feature 19 work.

Both pages also reach straight through `offer.owner.account.*`
(`Offer.jsx:80-86`, `Home.jsx:136-142`) with no guard. Every offer read in use
populates `owner`, including `GET /offers?owner=:id` (verified), so nothing is
broken today. It would throw on a read that returns a raw `ObjectId`: keep the
populate in mind before pointing these components at a new endpoint.
