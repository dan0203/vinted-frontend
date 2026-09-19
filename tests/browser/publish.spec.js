import { test, expect } from '@playwright/test';
import { PNG } from './fixtures';

// Host-qualified for the same reason as offer.spec.js: `/offers/publish` is
// only an API endpoint, but `/offers/*` also matches frontend navigations.
const API_URL = 'http://localhost:3000';

const OFFER_ID = '64a000000000000000000000';

const photo = name => ({ name, mimeType: 'image/png', buffer: PNG });

// The access token lives in memory, so a page.goto('/publish') would reload the
// app and bounce back to `/`. Log in through the form, then reach the page the
// way a seller does, by clicking through the header.
const openPublish = async page => {
    await page.route(`${API_URL}/users/login`, route =>
        route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ accessToken: 'access-token' }),
        }),
    );

    await page.goto('/login');
    const form = page.locator('.main-login form');
    await form.locator('input[name="email"]').fill('seller@example.com');
    await form.locator('input[name="password"]').fill('password');
    await form.getByRole('button', { name: 'Se connecter' }).click();

    await page.getByRole('button', { name: 'Vends tes articles' }).click();
    await expect(page.getByRole('heading', { name: 'Vends ton article' })).toBeVisible();
};

test('refuses to publish without a main picture and sends no request', async ({ page }) => {
    let published = false;
    await page.route(`${API_URL}/offers/publish`, route => {
        published = true;
        return route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
    });

    await openPublish(page);
    await page.locator('#title').fill('Chemise Sézane verte');
    await page.getByRole('button', { name: 'Ajouter' }).click();

    await expect(page.getByRole('alert')).toHaveText(
        'Ajoute une photo principale pour publier ton article.',
    );
    expect(published).toBe(false);
});

test('sends the main picture plus every secondary picture under `pictures`', async ({ page }) => {
    let body = null;
    await page.route(`${API_URL}/offers/publish`, route => {
        body = route.request().postDataBuffer().toString('latin1');
        return route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ _id: OFFER_ID }),
        });
    });
    await page.route(`${API_URL}/offers/${OFFER_ID}`, route =>
        route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
                _id: OFFER_ID,
                name: 'Chemise Sézane verte',
                price: 40,
                details: {},
                image: { url: 'https://example.com/img.jpg' },
                owner: { account: { username: 'seller', avatar: null } },
            }),
        }),
    );

    await openPublish(page);
    await page.locator('#title').fill('Chemise Sézane verte');
    await page.locator('#picture').setInputFiles(photo('main.png'));
    await page
        .locator('#pictures')
        .setInputFiles([photo('one.png'), photo('two.png'), photo('three.png')]);

    await expect(page.locator('.publish-picture-names li')).toHaveCount(3);

    await page.getByRole('button', { name: 'Ajouter' }).click();

    await expect(page).toHaveURL(new RegExp(`/offers/${OFFER_ID}$`));
    expect(body.match(/name="picture"/g)).toHaveLength(1);
    expect(body.match(/name="pictures"/g)).toHaveLength(3);
    expect(body).toContain('filename="two.png"');
});

test('shows the limit message and publishes nothing when more than 5 pictures are picked', async ({
    page,
}) => {
    let published = false;
    await page.route(`${API_URL}/offers/publish`, route => {
        published = true;
        return route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
    });

    await openPublish(page);
    await page.locator('#picture').setInputFiles(photo('main.png'));
    await page
        .locator('#pictures')
        .setInputFiles([1, 2, 3, 4, 5, 6].map(index => photo(`picture-${index}.png`)));

    await expect(page.getByRole('alert')).toHaveText(
        'Tu peux ajouter au maximum 5 photos supplémentaires.',
    );

    await page.getByRole('button', { name: 'Ajouter' }).click();
    await expect(page.getByRole('alert')).toBeVisible();
    expect(published).toBe(false);
});

test('shows the backend message when the publish request fails', async ({ page }) => {
    await page.route(`${API_URL}/offers/publish`, route =>
        route.fulfill({
            status: 400,
            contentType: 'application/json',
            body: JSON.stringify({ message: 'Le prix est obligatoire' }),
        }),
    );

    await openPublish(page);
    await page.locator('#picture').setInputFiles(photo('main.png'));
    await page.getByRole('button', { name: 'Ajouter' }).click();

    await expect(page.getByRole('alert')).toHaveText('Le prix est obligatoire');
    await expect(page.getByRole('button', { name: 'Ajouter' })).toBeEnabled();
});

test('lands on the new offer with a confirmation that does not survive a reload', async ({
    page,
}) => {
    await page.route(`${API_URL}/offers/publish`, route =>
        route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ _id: OFFER_ID }),
        }),
    );
    await page.route(`${API_URL}/offers/${OFFER_ID}`, route =>
        route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
                _id: OFFER_ID,
                name: 'Chemise Sézane verte',
                price: 40,
                details: {},
                image: { url: 'https://example.com/img.jpg' },
                owner: { account: { username: 'seller', avatar: null } },
            }),
        }),
    );

    await openPublish(page);
    await page.locator('#picture').setInputFiles(photo('main.png'));
    await page.getByRole('button', { name: 'Ajouter' }).click();

    await expect(page).toHaveURL(new RegExp(`/offers/${OFFER_ID}$`));
    await expect(page.getByText('Ton article est en ligne !')).toBeVisible();

    await page.reload();

    await expect(page.locator('main.main-offer')).toBeVisible();
    await expect(page.getByText('Ton article est en ligne !')).toHaveCount(0);
});

test('disables the submit button while the publish request is in flight', async ({ page }) => {
    // The request is held open until the assertion has run rather than for a
    // fixed delay, the same reason reset-password.spec.js does it this way.
    let release;
    const held = new Promise(resolve => {
        release = resolve;
    });
    await page.route(`${API_URL}/offers/publish`, async route => {
        await held;
        await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ _id: OFFER_ID }),
        });
    });

    await openPublish(page);
    await page.locator('#picture').setInputFiles(photo('main.png'));
    const button = page.getByRole('button', { name: 'Ajouter' });
    await button.click();

    await expect(page.getByRole('button', { name: 'Publication...' })).toBeDisabled();
    release();
});

test('confirms on the page when the created offer comes back without an id', async ({ page }) => {
    await page.route(`${API_URL}/offers/publish`, route =>
        route.fulfill({ status: 200, contentType: 'application/json', body: '{}' }),
    );

    await openPublish(page);
    await page.locator('#picture').setInputFiles(photo('main.png'));
    await page.getByRole('button', { name: 'Ajouter' }).click();

    await expect(page.getByText('Ton article est en ligne !')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Ajouter' })).toHaveCount(0);
    await expect(page).toHaveURL(/\/publish$/);
});

test('each file input clears only the message it resolves', async ({ page }) => {
    await page.route(`${API_URL}/offers/publish`, route =>
        route.fulfill({
            status: 400,
            contentType: 'application/json',
            body: JSON.stringify({ message: 'Le prix est obligatoire' }),
        }),
    );

    await openPublish(page);

    // Choosing a main picture clears the message about the missing main picture.
    await page.getByRole('button', { name: 'Ajouter' }).click();
    await expect(page.getByRole('alert')).toHaveText(
        'Ajoute une photo principale pour publier ton article.',
    );
    await page.locator('#picture').setInputFiles(photo('main.png'));
    await expect(page.getByRole('alert')).toHaveCount(0);

    // Dropping back to 5 or fewer clears the limit message.
    await page
        .locator('#pictures')
        .setInputFiles([1, 2, 3, 4, 5, 6].map(index => photo(`over-${index}.png`)));
    await expect(page.getByRole('alert')).toHaveText(
        'Tu peux ajouter au maximum 5 photos supplémentaires.',
    );
    await page.locator('#pictures').setInputFiles([photo('one.png'), photo('two.png')]);
    await expect(page.getByRole('alert')).toHaveCount(0);

    // A backend error is not wiped by picking photos: only a retry clears it.
    await page.getByRole('button', { name: 'Ajouter' }).click();
    await expect(page.getByRole('alert')).toHaveText('Le prix est obligatoire');
    await page.locator('#pictures').setInputFiles([photo('three.png')]);
    await expect(page.getByRole('alert')).toHaveText('Le prix est obligatoire');
});
