// A 1x1 PNG served in place of the fixture image urls, which do not exist.
// Both pages fall back to a placeholder when an image fails to load, so letting
// a fixture url 404 would silently defeat any assertion about a rendered image.
// A test that wants a failure aborts its own url, which takes precedence over
// the stub registered before it.
export const PNG = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
    'base64',
);

// The app reads the user id out of the token's `sub` claim, so a stubbed session
// has to hand back something shaped like a real JWT rather than a bare string.
export const buildToken = sub =>
    [
        Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url'),
        Buffer.from(JSON.stringify({ sub })).toString('base64url'),
        'signature-not-checked-client-side',
    ].join('.');

// Two accounts: the signed-in user, and a second one for the session that can
// change under a mounted page.
export const USER_ID = '6aae67d160da136b79ae2d1b';
export const OTHER_USER_ID = '6bbe67d160da136b79ae2d99';

// The live offer contract, in one place: every spec that stubs an offer asserts
// against these field names, so a contract change has one file to update.
export const OFFER_ID = '64a000000000000000000000';
export const OTHER_OFFER_ID = '64c000000000000000000000';

export const OFFER = {
    _id: OFFER_ID,
    name: 'Chemise Sézane verte',
    description: 'Portée quelques fois',
    price: 40,
    details: { brand: 'Sézane', size: 'M' },
    image: { secure_url: 'https://example.com/img.jpg' },
    owner: { _id: '64b000000000000000000000', account: { username: 'seller' } },
    status: 'available',
};

// A second offer, so a list can prove each control tracks its own card rather
// than one shared flag.
export const OTHER_OFFER = { ...OFFER, _id: OTHER_OFFER_ID, name: 'Jupe en jean', price: 25 };
