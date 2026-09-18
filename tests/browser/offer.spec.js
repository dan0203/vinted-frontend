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
