# `POST /offers/publish` request and response contract

Probed directly on `http://localhost:3000` on 2026-09-19 during feature 20,
against the seed described in `api-offer-response.md`. Authenticated as
`alice.martin@example.com`. Everything below was observed, not inferred from the
backend source (which lives in a separate repo).

## Request

`multipart/form-data`, bearer access token in `Authorization`.

| Field | Type | Notes |
|---|---|---|
| `title` | text | becomes `name` on the stored offer |
| `description` | text | |
| `price` | text | stored as a number |
| `brand`, `size`, `color`, `condition`, `city` | text | collapsed into `details` |
| `picture` | file | the main image, required |
| `pictures` | file, **repeated** | secondary images, optional, at most 5 |

**Secondary images repeat the same field name.** Three parts each named
`pictures` produced an offer with `pictures.length === 3`, in the order sent.
This is what a browser `FormData` emits for
`pictures.forEach(file => formData.append('pictures', file))`, so no bracket
suffix and no index is needed. `pictures[]` was never required and was not
tested, because the plain repeated form already worked.

Omitting `pictures` entirely is valid: the created offer comes back with
`pictures: []` and is otherwise identical.

## Response

`200` with **the full created offer**, the same shape `GET /offers/:id` serves:

```
_id, name, description, price, details, image, pictures, status, owner, createdAt
```

- `_id` is at the top level, so a client can navigate straight to
  `/offers/<_id>` after publishing.
- `status` defaults to `available`.
- `image` and each `pictures[i]` are full Cloudinary subdocuments
  (`public_id`, `url`, `secure_url`, ...), same shape as `api-offer-response.md`
  documents for reads.

## Gotcha: freshly uploaded images have no derived transformation yet

The detail page requests a `w_144,h_192,c_fill` crop for gallery thumbnails
(feature 19). Cloudinary generates that derivative **on the first request for
it**, so for seconds after a publish the thumbnail urls can still be in flight
while the untransformed main image already renders. Every transformed url
returned `200` when checked directly right after the upload, so this is latency,
not a broken url. Anything asserting on a fresh upload's thumbnails has to wait
for `naturalWidth > 0` rather than screenshot immediately.
