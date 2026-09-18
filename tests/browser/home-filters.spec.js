import { test, expect } from '@playwright/test';

const OWNER = { account: { username: 'seller', avatar: null } };
const IMAGE = { url: 'https://example.com/img.jpg' };

// Deliberately not price-sorted, so the "no sort param" and "sort=" cases are
// each only provable by checking the actual rendered order.
const FIXTURE_OFFERS = [
    { _id: 'baskets', name: 'Baskets running homme', price: 40, details: { size: '43', brand: 'Nike' }, image: IMAGE, owner: OWNER },
    { _id: 'sac', name: 'Sac a main cuir', price: 120, details: { brand: 'Longchamp' }, image: IMAGE, owner: OWNER },
    { _id: 'robe', name: 'Robe fleurie vintage', price: 25, details: { size: 'S', brand: 'Zara' }, image: IMAGE, owner: OWNER },
];

// Mocks GET /offers against a fixed, known fixture (title/priceMin/priceMax/sort
// applied the same way the real backend does), so these tests assert against
// data the test controls instead of whatever happens to be seeded locally.
const installOffersMock = async (page, fixture = FIXTURE_OFFERS) => {
    let lastUrl = '';

    await page.route('**/offers*', async route => {
        const url = new URL(route.request().url());
        lastUrl = url.toString();

        let matched = fixture;

        const title = url.searchParams.get('title');
        if (title) {
            const needle = title.toLowerCase();
            matched = matched.filter(offer => offer.name.toLowerCase().includes(needle));
        }

        const priceMin = url.searchParams.get('priceMin');
        if (priceMin !== null) {
            matched = matched.filter(offer => offer.price >= Number(priceMin));
        }

        const priceMax = url.searchParams.get('priceMax');
        if (priceMax !== null) {
            matched = matched.filter(offer => offer.price <= Number(priceMax));
        }

        const sort = url.searchParams.get('sort');
        if (sort === 'price-asc') {
            matched = [...matched].sort((a, b) => a.price - b.price);
        } else if (sort === 'price-desc') {
            matched = [...matched].sort((a, b) => b.price - a.price);
        }

        await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
                count: matched.length,
                page: Number(url.searchParams.get('page')) || 1,
                totalPages: 1,
                offers: matched,
            }),
        });
    });

    return { getLastUrl: () => lastUrl };
};

const waitForInitialLoad = async page => {
    await expect(page.getByText('Chargement en cours...')).toHaveCount(0);
};

const priceTexts = async page =>
    (await page.locator('.main-home .price').allTextContents()).map(text =>
        Number(text.replace(' €', '')),
    );

test('search filters the list via ?title=, clearing restores it', async ({ page }) => {
    const { getLastUrl } = await installOffersMock(page);

    await page.goto('/');
    await waitForInitialLoad(page);
    await expect(page.locator('.main-home article')).toHaveCount(3);

    await page.getByPlaceholder('Recherche des articles').fill('Robe');
    await page.waitForTimeout(600);

    expect(getLastUrl()).toContain('title=Robe');
    await expect(page.locator('.main-home article')).toHaveCount(1);
    await expect(page.locator('.main-home .price')).toHaveText('25 €');

    await page.getByPlaceholder('Recherche des articles').fill('');
    await page.waitForTimeout(600);
    await expect(page.locator('.main-home article')).toHaveCount(3);
});

test('price range filter narrows results via ?priceMin=&priceMax=', async ({ page }) => {
    await installOffersMock(page);

    await page.goto('/');
    await waitForInitialLoad(page);
    await expect(page.locator('.main-home article')).toHaveCount(3);

    await page.getByPlaceholder('Prix min').fill('100');
    await page.getByPlaceholder('Prix max').fill('130');
    await page.waitForTimeout(600);

    await expect(page.locator('.main-home article')).toHaveCount(1);
    await expect(page.locator('.main-home .price')).toHaveText('120 €');

    await page.getByPlaceholder('Prix min').fill('');
    await page.getByPlaceholder('Prix max').fill('');
    await page.waitForTimeout(600);
    await expect(page.locator('.main-home article')).toHaveCount(3);
});

test('sort select reorders via server, default sends no sort param', async ({ page }) => {
    const { getLastUrl } = await installOffersMock(page);

    await page.goto('/');
    await waitForInitialLoad(page);
    expect(getLastUrl()).not.toContain('sort=');
    expect(await priceTexts(page)).toEqual([40, 120, 25]);

    await page.locator('.main-home select').selectOption('price-asc');
    await page.waitForTimeout(600);
    expect(getLastUrl()).toContain('sort=price-asc');
    expect(await priceTexts(page)).toEqual([25, 40, 120]);

    await page.locator('.main-home select').selectOption('price-desc');
    await page.waitForTimeout(600);
    expect(getLastUrl()).toContain('sort=price-desc');
    expect(await priceTexts(page)).toEqual([120, 40, 25]);
});

test('empty-results state shows when no offers match, and clears', async ({ page }) => {
    await installOffersMock(page);

    await page.goto('/');
    await waitForInitialLoad(page);
    await expect(page.locator('.main-home article')).toHaveCount(3);

    await page.getByPlaceholder('Recherche des articles').fill('zzz-no-such-offer-zzz');
    await page.waitForTimeout(600);

    await expect(page.getByText('Aucun article ne correspond à votre recherche.')).toBeVisible();
    await expect(page.locator('.main-home article')).toHaveCount(0);

    await page.getByPlaceholder('Recherche des articles').fill('');
    await page.waitForTimeout(600);
    await expect(page.locator('.main-home article')).toHaveCount(3);
});

test('pagination pages through mocked multi-page results and disables at both ends', async ({
    page,
}) => {
    const makeOffer = n => ({
        _id: `id-${n}`,
        name: `Offer ${n}`,
        price: n,
        details: { size: 'M', brand: 'Brand' },
        image: IMAGE,
        owner: OWNER,
        createdAt: new Date().toISOString(),
    });

    let requestedPage = null;
    await page.route('**/offers*', async route => {
        const url = new URL(route.request().url());
        requestedPage = url.searchParams.get('page') || '1';
        await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
                count: 3,
                page: Number(requestedPage),
                totalPages: 3,
                offers: [makeOffer(Number(requestedPage))],
            }),
        });
    });

    await page.goto('/');
    await expect(page.getByText('Page 1 / 3')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Précédent' })).toBeDisabled();
    await expect(page.getByRole('button', { name: 'Suivant' })).toBeEnabled();

    await page.getByRole('button', { name: 'Suivant' }).click();
    await page.waitForTimeout(600);
    expect(requestedPage).toBe('2');
    await expect(page.getByText('Page 2 / 3')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Précédent' })).toBeEnabled();
    await expect(page.getByRole('button', { name: 'Suivant' })).toBeEnabled();

    await page.getByRole('button', { name: 'Suivant' }).click();
    await page.waitForTimeout(600);
    expect(requestedPage).toBe('3');
    await expect(page.getByText('Page 3 / 3')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Suivant' })).toBeDisabled();

    await page.getByRole('button', { name: 'Précédent' }).click();
    await page.waitForTimeout(600);
    expect(requestedPage).toBe('2');
});
