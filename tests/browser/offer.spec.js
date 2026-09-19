import { test, expect } from '@playwright/test';

const OWNER = { account: { username: 'seller', avatar: null } };
const IMAGE = { url: 'https://example.com/img.jpg' };

const buildOffer = status => ({
    _id: '64a000000000000000000000',
    name: 'Chemise Sézane verte',
    description: 'Portée quelques fois',
    price: 40,
    details: { brand: 'Sézane', size: 'M' },
    image: IMAGE,
    owner: OWNER,
    ...(status && { status }),
});

// The plain glob `**/offers/*` also matches the browser's own top-level
// navigation to `/offers/:id`, not just the API call, since that path is both
// a frontend route and a backend endpoint. Intercepting it there replaces the
// whole document with the raw mocked JSON instead of loading the app, so
// these routes are host-qualified to the API origin (see finding F-14).
const API_URL = 'http://localhost:3000';

test('shows a "Vendu" badge and disables the Buy button for a sold offer', async ({ page }) => {
    await page.route(`${API_URL}/offers/*`, route =>
        route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify(buildOffer('sold')),
        }),
    );

    await page.goto('/offers/64a000000000000000000000');

    await expect(page.locator('main.main-offer')).toBeVisible();
    await expect(page.getByText('Vendu')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Acheter' })).toBeDisabled();
});

test('keeps the Buy link enabled for an available offer', async ({ page }) => {
    await page.route(`${API_URL}/offers/*`, route =>
        route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify(buildOffer('available')),
        }),
    );

    await page.goto('/offers/64a000000000000000000000');

    await expect(page.locator('main.main-offer')).toBeVisible();
    const buyButton = page.getByRole('button', { name: 'Acheter' });
    await expect(buyButton).toBeEnabled();
    await expect(page.getByRole('link', { name: 'Acheter' })).toHaveAttribute(
        'href',
        '/payment',
    );
});

test('shows an error message instead of a stuck spinner when the offer fetch fails', async ({
    page,
}) => {
    await page.route(`${API_URL}/offers/*`, route =>
        route.fulfill({
            status: 404,
            contentType: 'application/json',
            body: JSON.stringify({ message: "Cette offre n'existe pas." }),
        }),
    );

    await page.goto('/offers/64a000000000000000000000');

    await expect(page.locator('main.main-offer')).toBeVisible();
    await expect(page.getByText("Cette offre n'existe pas.")).toBeVisible();
    await expect(page.getByText('Chargement en cours...')).not.toBeVisible();
});

// Shaped like the real Cloudinary subdocuments: both url (http) and secure_url
// (https), a public_id, no _id. public_id is not unique within an offer, so it
// is not a key on its own (see the repeated-image test below).
const buildPicture = name => ({
    public_id: `vinted/offers/64a000000000000000000000/${name}`,
    url: `http://res.cloudinary.com/demo/image/upload/${name}.jpg`,
    secure_url: `https://res.cloudinary.com/demo/image/upload/${name}.jpg`,
    format: 'jpg',
    width: 1200,
    height: 1600,
});

const buildGalleryOffer = pictures => ({
    ...buildOffer('available'),
    image: buildPicture('main'),
    pictures,
});

const mockOffer = (page, offer) =>
    page.route(`${API_URL}/offers/*`, route =>
        route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify(offer),
        }),
    );

test('shows a thumbnail per picture and swaps the main image when one is clicked', async ({
    page,
}) => {
    const pictures = [buildPicture('pictures/1'), buildPicture('pictures/2')];
    await mockOffer(page, buildGalleryOffer(pictures));

    await page.goto('/offers/64a000000000000000000000');

    const mainImage = page.locator('img.offer-gallery-main');
    await expect(mainImage).toHaveAttribute('src', buildPicture('main').secure_url);
    await expect(page.locator('.offer-gallery-thumbs button')).toHaveCount(3);

    const thirdThumb = page.getByRole('button', { name: 'Photo 3 sur 3' });
    await expect(thirdThumb).toHaveAttribute('aria-pressed', 'false');

    await thirdThumb.click();

    await expect(mainImage).toHaveAttribute('src', pictures[1].secure_url);
    await expect(thirdThumb).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByRole('button', { name: 'Photo 1 sur 3' })).toHaveAttribute(
        'aria-pressed',
        'false',
    );
});

test('thumbnails are reachable by Tab and activate with Enter and Space', async ({ page }) => {
    const pictures = [buildPicture('pictures/1'), buildPicture('pictures/2')];
    await mockOffer(page, buildGalleryOffer(pictures));

    await page.goto('/offers/64a000000000000000000000');

    const mainImage = page.locator('img.offer-gallery-main');
    const firstThumb = page.getByRole('button', { name: 'Photo 1 sur 3' });
    for (let i = 0; i < 25 && !(await firstThumb.evaluate(el => el === document.activeElement)); i++) {
        await page.keyboard.press('Tab');
    }
    await expect(firstThumb).toBeFocused();

    await page.keyboard.press('Tab');
    await expect(page.getByRole('button', { name: 'Photo 2 sur 3' })).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(mainImage).toHaveAttribute('src', pictures[0].secure_url);
    await expect(page.getByRole('button', { name: 'Photo 2 sur 3' })).toHaveAttribute(
        'aria-pressed',
        'true',
    );

    await page.keyboard.press('Tab');
    await expect(page.getByRole('button', { name: 'Photo 3 sur 3' })).toBeFocused();
    await page.keyboard.press('Space');
    await expect(mainImage).toHaveAttribute('src', pictures[1].secure_url);
});

test('thumbnails request a small Cloudinary crop, the main image the original', async ({ page }) => {
    await mockOffer(page, buildGalleryOffer([buildPicture('pictures/1')]));

    await page.goto('/offers/64a000000000000000000000');

    await expect(page.locator('img.offer-gallery-main')).toHaveAttribute(
        'src',
        buildPicture('main').secure_url,
    );
    const thumbSrcs = await page.evaluate(() =>
        [...document.querySelectorAll('.offer-gallery-thumbs img')].map(img => img.getAttribute('src')),
    );
    expect(thumbSrcs).toHaveLength(2);
    for (const src of thumbSrcs) {
        expect(src).toContain('/image/upload/w_144,h_192,c_fill/');
    }
});

test('handles an offer whose main image is repeated in pictures', async ({ page }) => {
    // The live API serves offers where pictures[0] is the main image, same
    // public_id and same secure_url. Keys must still be unique (see /check).
    // The fixture image URLs 404, which is console noise here; only React's
    // duplicate-key error matters.
    const keyErrors = [];
    page.on(
        'console',
        msg => msg.type() === 'error' && msg.text().includes('same key') && keyErrors.push(msg.text()),
    );

    const duplicated = buildPicture('main');
    await mockOffer(page, buildGalleryOffer([duplicated]));

    await page.goto('/offers/64a000000000000000000000');

    await expect(page.locator('.offer-gallery-thumbs button')).toHaveCount(2);
    await page.getByRole('button', { name: 'Photo 2 sur 2' }).click();
    await expect(page.getByRole('button', { name: 'Photo 2 sur 2' })).toHaveAttribute(
        'aria-pressed',
        'true',
    );
    expect(keyErrors).toEqual([]);
});

test('renders no thumbnail strip for an offer without secondary pictures', async ({ page }) => {
    await mockOffer(page, buildGalleryOffer([]));

    await page.goto('/offers/64a000000000000000000000');

    await expect(page.locator('img.offer-gallery-main')).toBeVisible();
    await expect(page.locator('.offer-gallery-thumbs button')).toHaveCount(0);
});

test('renders no image at all for an offer with no photo', async ({ page }) => {
    // A photoless offer is a valid document. Mongoose materialises imageSchema's
    // `tags: [String]`, so the API sends `image: {tags: []}`, not `{}`: the
    // emptiness test has to be a usable url, not the key count.
    await mockOffer(page, { ...buildOffer('available'), image: { tags: [] }, pictures: [] });

    await page.goto('/offers/64a000000000000000000000');

    await expect(page.locator('main.main-offer')).toBeVisible();
    await expect(page.locator('.offer-gallery')).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Acheter' })).toBeEnabled();
});
