import { test, expect } from '@playwright/test';
import { buildToken, OFFER, OFFER_ID, OTHER_OFFER, OTHER_USER_ID, USER_ID } from './fixtures';

// Host-qualified for the same reason favorites.spec.js is: a bare `**/offers/*`
// glob also matches the app's own navigation to /offers/:id and would replace
// the document with raw JSON.
const API_URL = 'http://localhost:3000';

const json = (route, body, status = 200) =>
    route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });

const stubOffer = async page => {
    await page.route(`${API_URL}/offers/*`, route => json(route, OFFER));
    await page.route(`${API_URL}/users/*/favorites`, route => json(route, { favorites: [] }));
};

test('restores the session on a directly opened offer page', async ({ page }) => {
    await stubOffer(page);
    await page.route(`${API_URL}/users/refresh`, route =>
        json(route, { accessToken: buildToken(USER_ID) }),
    );

    // No login form anywhere in this test: the point is that a bookmark or a
    // shared link alone brings the session back.
    await page.goto(`/offers/${OFFER_ID}`);

    await expect(page.getByRole('button', { name: 'Se déconnecter' })).toBeVisible();
    await expect(
        page.locator('main.main-offer aside').getByRole('button', { name: 'Ajouter aux favoris' }),
    ).toBeEnabled();
});

test('renders the anonymous app when the refresh cookie is gone', async ({ page }) => {
    await stubOffer(page);
    await page.route(`${API_URL}/users/refresh`, route => json(route, {}, 401));

    await page.goto(`/offers/${OFFER_ID}`);

    await expect(page.locator('main.main-offer')).toBeVisible();
    await expect(page.getByRole('link', { name: 'Se connecter' })).toBeVisible();
    // The 401 is an anonymous visit, not a rejection: the url the visitor asked
    // for has to survive it.
    await expect(page).toHaveURL(new RegExp(`/offers/${OFFER_ID}$`));
    await expect(page.getByRole('button', { name: /favoris/ })).toHaveCount(0);
});

// Step 1's other done-when, and the reason the first render is held rather than
// flashed: `Publish` sends a tokenless visitor to `/`, and that navigation is
// not undone once the token arrives.
test('keeps a restored session on a directly opened /publish', async ({ page }) => {
    await page.route(`${API_URL}/users/refresh`, route =>
        json(route, { accessToken: buildToken(USER_ID) }),
    );

    await page.goto('/publish');

    await expect(page.getByRole('heading', { name: 'Vends ton article' })).toBeVisible();
    await expect(page).toHaveURL(/\/publish$/);
});

// Finding F-01: the first render waits on the bootstrap, so an API that hangs
// rather than refuses must not hold the app there. The route is never fulfilled;
// only the client's own timeout ends it.
test('falls through to the anonymous app when the refresh never answers', async ({ page }) => {
    await page.route(`${API_URL}/offers/*`, route => json(route, OFFER));
    await page.route(`${API_URL}/users/refresh`, () => {});

    await page.goto(`/offers/${OFFER_ID}`, { waitUntil: 'commit' });

    // Generous, because this waits out the client timeout on purpose.
    await expect(page.locator('main.main-offer')).toBeVisible({ timeout: 15000 });
    await expect(page.getByRole('link', { name: 'Se connecter' })).toBeVisible();
});

// Finding F-02: the session can now change under a mounted page, and the
// favorites the previous account loaded must not be what the next one sees.
// The toggle 401s once, which makes the interceptor refresh into a different
// account without any navigation. The assertion is on the card that was never
// clicked: the clicked one clears its own state optimistically, so it would
// pass even with the previous account's set still on screen.
test('shows no hearts from the previous account after the session changes', async ({ page }) => {
    await page.route(
        url => url.origin === API_URL && url.pathname === '/offers',
        route => json(route, { count: 2, page: 1, totalPages: 1, offers: [OFFER, OTHER_OFFER] }),
    );

    let refreshes = 0;
    await page.route(`${API_URL}/users/refresh`, route => {
        refreshes += 1;
        return json(route, { accessToken: buildToken(refreshes === 1 ? USER_ID : OTHER_USER_ID) });
    });

    let releaseSecondList;
    const secondList = new Promise(resolve => {
        releaseSecondList = resolve;
    });
    await page.route(
        url => url.origin === API_URL && /^\/users\/[^/]+\/favorites$/.test(url.pathname),
        async route => {
            const id = new URL(route.request().url()).pathname.split('/')[2];
            // The first account has favorited both offers.
            if (id === USER_ID) return json(route, { favorites: [OFFER, OTHER_OFFER] });
            // Held open, so the in-between state is observable rather than raced.
            await secondList;
            return json(route, { favorites: [] });
        },
    );

    let toggles = 0;
    await page.route(`${API_URL}/users/*/favorites/*`, route => {
        toggles += 1;
        return toggles === 1 ? json(route, {}, 401) : json(route, { favorites: [] });
    });

    await page.goto('/');
    const cards = page.locator('.main-home article');
    await expect(cards).toHaveCount(2);
    const untouched = cards.first().locator('button.favorite-button');
    await expect(untouched).toHaveAttribute('aria-label', 'Retirer des favoris');

    await cards.nth(1).getByRole('button', { name: 'Retirer des favoris' }).click();

    // The account has changed underneath. The first card was never clicked, so
    // only the per-account reset can have taken the previous user's heart off it.
    await expect(untouched).toHaveAttribute('aria-pressed', 'false');
    await expect(untouched).toHaveAttribute('aria-label', 'Ajouter aux favoris');
    await expect(untouched).toBeDisabled();

    releaseSecondList();
    await expect(untouched).toBeEnabled();
    await expect(untouched).toHaveAttribute('aria-label', 'Ajouter aux favoris');
    expect(refreshes).toBe(2);
});
