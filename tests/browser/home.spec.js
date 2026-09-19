import { test, expect } from '@playwright/test';
import { PNG } from './fixtures';

test('shows an error message instead of a stuck spinner when the offers fetch fails', async ({
    page,
}) => {
    await page.route('**/offers*', route =>
        route.fulfill({
            status: 500,
            contentType: 'application/json',
            body: JSON.stringify({ message: 'Erreur serveur.' }),
        }),
    );

    await page.goto('/');

    await expect(page.getByText('Erreur serveur.')).toBeVisible();
    await expect(page.getByText('Chargement en cours...')).not.toBeVisible();
});

// Cloudinary sends `{tags: []}` for a photoless offer and an avatarless account,
// which is truthy: guarding on the subdocument renders a broken image.
const EMPTY_IMAGE = { tags: [] };
const PICTURE = {
    public_id: 'pool/1',
    url: 'http://res.cloudinary.com/demo/image/upload/pool/1.jpg',
    secure_url: 'https://res.cloudinary.com/demo/image/upload/pool/1.jpg',
};

const buildListOffer = (id, { image, avatar }) => ({
    _id: id,
    name: 'Chemise en lin',
    price: 20,
    details: { brand: 'Uniqlo', size: 'M' },
    image,
    owner: { _id: 'u1', account: { username: 'seller', avatar } },
    status: 'available',
});

const mockOffers = (page, offers) =>
    page.route('**/offers*', route =>
        route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ count: offers.length, page: 1, totalPages: 1, offers }),
        }),
    );

test('shows the placeholder and the seller initial when both images are missing', async ({ page }) => {
    await mockOffers(page, [
        buildListOffer('64a000000000000000000001', { image: EMPTY_IMAGE, avatar: EMPTY_IMAGE }),
    ]);

    await page.goto('/');

    await expect(page.locator('article')).toHaveCount(1);
    await expect(page.locator('article img')).toHaveCount(0);
    await expect(page.locator('article .avatar-initial')).toHaveText('S');
    await expect(page.getByText('seller')).toBeVisible();
    // The placeholder keeps the card the same height as one with a photo.
    await expect(page.locator('article .no-photo')).toHaveText('Pas de photo');
});

test('falls back to the placeholder when a card image fails to load', async ({ page }) => {
    // A url can survive its Cloudinary asset, which renders a broken icon.
    await mockOffers(page, [
        buildListOffer('64a000000000000000000003', { image: PICTURE, avatar: EMPTY_IMAGE }),
    ]);
    await page.route(PICTURE.secure_url, route => route.abort());

    await page.goto('/');

    await expect(page.locator('article .no-photo')).toHaveText('Image indisponible');
    await expect(page.locator('article img')).toHaveCount(0);
});

test('falls back to the initial on every card sharing a failing avatar', async ({ page }) => {
    // Several cards reference one seller, and each avatar tracks its own url,
    // so every card carrying that dead asset falls back on its own.
    await mockOffers(page, [
        buildListOffer('64a000000000000000000004', { image: EMPTY_IMAGE, avatar: PICTURE }),
        buildListOffer('64a000000000000000000005', { image: EMPTY_IMAGE, avatar: PICTURE }),
    ]);
    await page.route(PICTURE.secure_url, route => route.abort());

    await page.goto('/');

    await expect(page.locator('article')).toHaveCount(2);
    await expect(page.locator('.user-info img')).toHaveCount(0);
    await expect(page.locator('.avatar-initial')).toHaveCount(2);
    await expect(page.getByText('seller').first()).toBeVisible();
});

test('renders the card image over https when the offer has a photo', async ({ page }) => {
    await mockOffers(page, [
        buildListOffer('64a000000000000000000002', { image: PICTURE, avatar: PICTURE }),
    ]);
    await page.route(PICTURE.secure_url, route =>
        route.fulfill({ status: 200, contentType: 'image/png', body: PNG }),
    );

    await page.goto('/');

    const srcs = await page.evaluate(() =>
        [...document.querySelectorAll('article img')].map(img => img.getAttribute('src')),
    );
    expect(srcs).toHaveLength(2);
    expect(srcs.every(src => src.startsWith('https://'))).toBe(true);
});
