// Cloudinary subdocuments arrive as `{tags: []}` when the offer has no photo or
// the account no avatar, so they are objects, never falsy: testing the
// subdocument renders a broken image. Test this url instead.
// secure_url first, since `url` is plain http and https blocks it as mixed content.
export const imageUrl = image => image?.secure_url || image?.url || null;
