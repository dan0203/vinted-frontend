import { test, expect } from '@playwright/test';
import { buildToken, OFFER, OFFER_ID, OTHER_OFFER, USER_ID } from './fixtures';

// Host-qualified for the same reason offer.spec.js is: a bare `**/offers/*`
// glob also matches the app's own navigation to /offers/:id and would replace
// the document with raw JSON.
const API_URL = 'http://localhost:3000';

const json = (route, body, status = 200) =>
    route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });

const stubOffers = async page => {
    // A predicate rather than a glob: `/offers` and `/offers/:id` would
    // otherwise both answer to the same pattern.
    await page.route(
        url => url.origin === API_URL && url.pathname === '/offers',
        route => json(route, { count: 2, page: 1, totalPages: 1, offers: [OFFER, OTHER_OFFER] }),
    );
    await page.route(`${API_URL}/offers/*`, route => json(route, OFFER));
};

// Signing in through the real form, because the token only ever lives in
// memory: any page.goto afterwards would drop it and sign the user back out.
const signIn = async page => {
    await page.route(`${API_URL}/users/login`, route =>
        json(route, {
            _id: USER_ID,
            accessToken: buildToken(USER_ID),
            account: { username: 'jo' },
        }),
    );

    await page.goto('/login');
    const form = page.locator('.main-login form');
    await form.locator('input[name="email"]').fill('jo@example.com');
    await form.locator('input[name="password"]').fill('password');
    await form.getByRole('button', { name: 'Se connecter' }).click();
    await expect(page.locator('.main-home')).toBeVisible();
};

const openOfferFromHome = async page => {
    await page.getByText('40 €').first().click();
    await expect(page.locator('main.main-offer')).toBeVisible();
};

// Returns a live hit counter, so a case can assert how many times the list was
// read rather than only what it contained.
const stubFavorites = async (page, offers) => {
    const reads = { count: 0 };

    await page.route(`${API_URL}/users/*/favorites`, route => {
        reads.count += 1;
        return json(route, { favorites: offers });
    });

    return reads;
};

test('shows no favorite control to a signed-out visitor', async ({ page }) => {
    await stubOffers(page);

    await page.goto(`/offers/${OFFER_ID}`);
    await expect(page.locator('main.main-offer')).toBeVisible();

    await expect(page.getByRole('button', { name: /favoris/ })).toHaveCount(0);
});

test('starts from the real favorited state and removes on click', async ({ page }) => {
    await stubOffers(page);
    await stubFavorites(page, [OFFER]);
    await signIn(page);
    await openOfferFromHome(page);

    const aside = page.locator('main.main-offer aside');
    const button = aside.getByRole('button', { name: 'Retirer des favoris' });
    await expect(button).toBeEnabled();

    let method = null;
    await page.route(`${API_URL}/users/*/favorites/*`, route => {
        method = route.request().method();
        return json(route, { favorites: [] });
    });

    await button.click();

    await expect(aside.getByRole('button', { name: 'Ajouter aux favoris' })).toBeVisible();
    expect(method).toBe('DELETE');
});

test('adds a favorite optimistically and keeps it once the server agrees', async ({ page }) => {
    await stubOffers(page);
    await stubFavorites(page, []);
    await signIn(page);
    await openOfferFromHome(page);

    const aside = page.locator('main.main-offer aside');

    let method = null;
    // Held open so the assertion below lands while the call is still in flight:
    // that is the whole point of the optimistic flip.
    let release;
    const pending = new Promise(resolve => {
        release = resolve;
    });
    await page.route(`${API_URL}/users/*/favorites/*`, async route => {
        method = route.request().method();
        await pending;
        return json(route, { favorites: [OFFER_ID] });
    });

    await aside.getByRole('button', { name: 'Ajouter aux favoris' }).click();

    await expect(aside.getByRole('button', { name: 'Retirer des favoris' })).toBeVisible();
    expect(method).toBe('POST');

    release();
    await expect(aside.getByRole('button', { name: 'Retirer des favoris' })).toBeVisible();
});

test('rolls the heart back and explains itself when the toggle fails', async ({ page }) => {
    await stubOffers(page);
    await stubFavorites(page, []);
    await signIn(page);
    await openOfferFromHome(page);

    const aside = page.locator('main.main-offer aside');

    await page.route(`${API_URL}/users/*/favorites/*`, route =>
        json(route, { message: 'Impossible de mettre à jour vos favoris.' }, 500),
    );

    await aside.getByRole('button', { name: 'Ajouter aux favoris' }).click();

    await expect(aside.getByRole('button', { name: 'Ajouter aux favoris' })).toBeVisible();
    await expect(aside.getByText('Impossible de mettre à jour vos favoris.')).toBeVisible();
});

test('shows no favorite control when the favorites list cannot be read', async ({ page }) => {
    await stubOffers(page);
    await page.route(`${API_URL}/users/*/favorites`, route => json(route, {}, 500));
    await signIn(page);
    await openOfferFromHome(page);

    await expect(page.getByRole('button', { name: /favoris/ })).toHaveCount(0);
});

// Finding F-26: getUserId reads the user id out of the token during render, and
// there is no error boundary in the app, so an exception there would take the
// whole page down rather than one control. This drives its catch for real: a
// token that is not a JWT at all must degrade to "signed out", not crash.
test('survives a token it cannot decode', async ({ page }) => {
    const crashes = [];
    page.on('pageerror', error => crashes.push(error.message));

    await stubOffers(page);
    await stubFavorites(page, []);
    await page.route(`${API_URL}/users/login`, route =>
        json(route, { _id: USER_ID, accessToken: 'pas-un-jwt', account: { username: 'jo' } }),
    );

    await page.goto('/login');
    const form = page.locator('.main-login form');
    await form.locator('input[name="email"]').fill('jo@example.com');
    await form.locator('input[name="password"]').fill('password');
    await form.getByRole('button', { name: 'Se connecter' }).click();

    await expect(page.locator('.main-home article').first()).toBeVisible();
    await expect(page.getByRole('button', { name: /favoris/ })).toHaveCount(0);
    expect(crashes).toEqual([]);
});

// Regression, finding F-24: the heart refuses a second click while its own
// request is in flight, so a double-click cannot send an add and a remove that
// race each other.
test('refuses a second click while its own toggle is in flight', async ({ page }) => {
    await stubOffers(page);
    await stubFavorites(page, []);
    await signIn(page);
    await openOfferFromHome(page);

    let release;
    const pending = new Promise(resolve => {
        release = resolve;
    });
    let calls = 0;
    await page.route(`${API_URL}/users/*/favorites/*`, async route => {
        calls += 1;
        await pending;
        return json(route, { favorites: [OFFER_ID] });
    });

    const aside = page.locator('main.main-offer aside');
    await aside.getByRole('button', { name: 'Ajouter aux favoris' }).click();

    const heart = aside.getByRole('button', { name: 'Retirer des favoris' });
    await expect(heart).toBeDisabled();

    release();
    await expect(heart).toBeEnabled();
    expect(calls).toBe(1);
});

// Regression, finding F-24: an older toggle's answer carries the list as it was
// before the newer toggle, and must not be allowed to undo it.
test('ignores a slow toggle answer that would undo a newer one', async ({ page }) => {
    await stubOffers(page);
    await stubFavorites(page, []);
    await signIn(page);

    const cards = page.locator('.main-home article');
    const first = cards.filter({ has: page.locator(`a[href="/offers/${OFFER_ID}"]`) });
    const second = cards.filter({ has: page.locator(`a[href="/offers/${OTHER_OFFER._id}"]`) });

    let releaseFirst;
    const firstPending = new Promise(resolve => {
        releaseFirst = resolve;
    });
    await page.route(`${API_URL}/users/*/favorites/*`, async route => {
        if (route.request().url().includes(OFFER_ID)) {
            // Answers last, with the list as it stood before the second click.
            await firstPending;
            return json(route, { favorites: [OFFER_ID] });
        }
        return json(route, { favorites: [OFFER_ID, OTHER_OFFER._id] });
    });

    await first.getByRole('button', { name: 'Ajouter aux favoris' }).click();
    await second.getByRole('button', { name: 'Ajouter aux favoris' }).click();
    await expect(second.getByRole('button', { name: 'Retirer des favoris' })).toBeVisible();

    releaseFirst();

    // Both must stay pressed: the stale answer is dropped, not applied.
    await expect(first.getByRole('button', { name: 'Retirer des favoris' })).toBeVisible();
    await expect(second.getByRole('button', { name: 'Retirer des favoris' })).toBeVisible();
});

// Regression, finding F-27. Deliberately hostile ordering: the second answer
// arrives first AND omits the first offer, because the server had not applied
// it yet. The earlier F-24 test drives the same interleaving but answers with a
// list that already contains both, which is the friendly case that hides this.
test('keeps a heart pressed when another answer omits its still-open request', async ({ page }) => {
    await stubOffers(page);
    await stubFavorites(page, []);
    await signIn(page);

    const cards = page.locator('.main-home article');
    const first = cards.filter({ has: page.locator(`a[href="/offers/${OFFER_ID}"]`) });
    const second = cards.filter({ has: page.locator(`a[href="/offers/${OTHER_OFFER._id}"]`) });

    let releaseFirst;
    const firstPending = new Promise(resolve => {
        releaseFirst = resolve;
    });
    await page.route(`${API_URL}/users/*/favorites/*`, async route => {
        if (route.request().url().includes(OFFER_ID)) {
            await firstPending;
            return json(route, { favorites: [OTHER_OFFER._id, OFFER_ID] });
        }
        // Answers first, and knows nothing of the first offer's open request.
        return json(route, { favorites: [OTHER_OFFER._id] });
    });

    await first.getByRole('button', { name: 'Ajouter aux favoris' }).click();
    await second.getByRole('button', { name: 'Ajouter aux favoris' }).click();

    // The second answer must settle its own card without touching the first.
    await expect(second.getByRole('button', { name: 'Retirer des favoris' })).toBeVisible();
    await expect(first.getByRole('button', { name: 'Retirer des favoris' })).toBeVisible();

    releaseFirst();

    await expect(first.getByRole('button', { name: 'Retirer des favoris' })).toBeVisible();
    await expect(second.getByRole('button', { name: 'Retirer des favoris' })).toBeVisible();
});

// Finding F-29: the spec is most explicit about this rule (a sold or reserved
// offer can still be favorited), and it was the one rule no test executed.
test('lets a sold offer be favorited, with Acheter disabled beside it', async ({ page }) => {
    await stubOffers(page);
    await stubFavorites(page, []);
    // Registered after stubOffers, so it wins for the detail route.
    await page.route(`${API_URL}/offers/*`, route => json(route, { ...OFFER, status: 'sold' }));
    await signIn(page);
    await openOfferFromHome(page);

    const aside = page.locator('main.main-offer aside');
    await expect(page.getByText('Vendu')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Acheter' })).toBeDisabled();

    await page.route(`${API_URL}/users/*/favorites/*`, route =>
        json(route, { favorites: [OFFER_ID] }),
    );

    const heart = aside.getByRole('button', { name: 'Ajouter aux favoris' });
    await expect(heart).toBeEnabled();
    await heart.click();

    await expect(aside.getByRole('button', { name: 'Retirer des favoris' })).toBeVisible();
});

// Finding F-28: the list shows one shared message above the grid, so a heart
// several rows down could revert with its only explanation off-screen. Twenty
// cards put the last one well below the fold, which is the case that failed.
test('brings the failure message into view when a heart low on the list fails', async ({ page }) => {
    const many = Array.from({ length: 20 }, (_, index) => ({
        ...OFFER,
        _id: `64d00000000000000000${String(index).padStart(4, '0')}`,
        price: 100 + index,
    }));
    await page.route(
        url => url.origin === API_URL && url.pathname === '/offers',
        route => json(route, { count: many.length, page: 1, totalPages: 1, offers: many }),
    );
    const reads = await stubFavorites(page, []);
    await signIn(page);

    const cards = page.locator('.main-home article');
    await expect(cards).toHaveCount(20);
    // Finding F-31: build step 2 asks for one read for the whole list, not one
    // per card. Twenty cards make the difference between 1 and 20 obvious.
    expect(reads.count).toBe(1);
    const last = cards.last();
    await last.scrollIntoViewIfNeeded();

    await page.route(`${API_URL}/users/*/favorites/*`, route =>
        json(route, { message: 'Impossible de mettre à jour vos favoris.' }, 500),
    );

    await last.getByRole('button', { name: 'Ajouter aux favoris' }).click();

    await expect(last.getByRole('button', { name: 'Ajouter aux favoris' })).toBeVisible();
    const message = page.getByText('Impossible de mettre à jour vos favoris.');
    await expect(message).toBeVisible();
    await expect(message).toBeInViewport();
});

// Finding F-32: the message belongs to the list the failure happened on. A
// search replaces the offers, so leaving it pinned there, still scrolled into
// view, attaches it to cards that never failed.
test('drops the toggle failure message once a new list loads', async ({ page }) => {
    await stubOffers(page);
    await stubFavorites(page, []);
    await signIn(page);

    await page.route(`${API_URL}/users/*/favorites/*`, route =>
        json(route, { message: 'Impossible de mettre à jour vos favoris.' }, 500),
    );

    const cards = page.locator('.main-home article');
    await cards.first().getByRole('button', { name: 'Ajouter aux favoris' }).click();

    const message = page.getByText('Impossible de mettre à jour vos favoris.');
    await expect(message).toBeVisible();

    // The header search drives the offers request, which is what replaces the list.
    await page.locator('header input[name="search"]').fill('robe');

    await expect(message).toHaveCount(0);
});

test('shows no hearts on the offers list to a signed-out visitor', async ({ page }) => {
    await stubOffers(page);

    await page.goto('/');
    await expect(page.locator('.main-home article')).toHaveCount(2);

    await expect(page.getByRole('button', { name: /favoris/ })).toHaveCount(0);
});

test('gives each card its own heart and toggles without opening the offer', async ({ page }) => {
    await stubOffers(page);
    await stubFavorites(page, [OFFER]);
    await signIn(page);

    const cards = page.locator('.main-home article');
    await expect(cards.first().getByRole('button', { name: 'Retirer des favoris' })).toBeVisible();

    const otherHeart = cards.nth(1).getByRole('button', { name: 'Ajouter aux favoris' });
    await expect(otherHeart).toBeEnabled();

    let toggledUrl = null;
    await page.route(`${API_URL}/users/*/favorites/*`, route => {
        toggledUrl = route.request().url();
        return json(route, { favorites: [OFFER._id, OTHER_OFFER._id] });
    });

    await otherHeart.click();

    await expect(cards.nth(1).getByRole('button', { name: 'Retirer des favoris' })).toBeVisible();
    // The click must not have followed the card's link.
    await expect(page).toHaveURL(/\/$/);
    expect(toggledUrl).toContain(OTHER_OFFER._id);
});

// A full reload cannot be asserted here: the access token only lives in memory,
// so reloading signs the user out and the hearts are gone by design. Coming back
// to the list is the reachable proof that the flip reached the server and was
// not just local state.
test('shows the new state when the list is opened again', async ({ page }) => {
    await stubOffers(page);
    await stubFavorites(page, []);
    await signIn(page);
    await openOfferFromHome(page);

    await page.route(`${API_URL}/users/*/favorites/*`, route =>
        json(route, { favorites: [OFFER_ID] }),
    );

    const aside = page.locator('main.main-offer aside');
    await aside.getByRole('button', { name: 'Ajouter aux favoris' }).click();
    await expect(aside.getByRole('button', { name: 'Retirer des favoris' })).toBeVisible();

    // The server now agrees, so the fresh read the list makes must say so too.
    await stubFavorites(page, [OFFER]);
    await page.getByRole('link', { name: 'Logo Vinted' }).click();

    const cards = page.locator('.main-home article');
    await expect(cards.first().getByRole('button', { name: 'Retirer des favoris' })).toBeVisible();
});

test('still opens the offer when the card itself is clicked', async ({ page }) => {
    await stubOffers(page);
    await stubFavorites(page, []);
    await signIn(page);

    await page.getByText('40 €').first().click();

    await expect(page).toHaveURL(new RegExp(`/offers/${OFFER_ID}$`));
    await expect(page.locator('main.main-offer')).toBeVisible();
});
