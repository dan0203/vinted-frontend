import { test, expect } from '@playwright/test';
import { PNG } from './fixtures';

const loginThenGoToPublish = async page => {
    await page.route('**/users/login', route =>
        route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ accessToken: 'initial-access-token' }),
        }),
    );

    await page.goto('/login');
    const form = page.locator('.main-login form');
    await form.locator('input[name="email"]').fill('test@example.com');
    await form.locator('input[name="password"]').fill('password');
    await form.getByRole('button', { name: 'Se connecter' }).click();

    await page.getByRole('link', { name: 'Vends tes articles' }).click();
    await expect(page.getByRole('heading', { name: 'Vends ton article' })).toBeVisible();
};

const submitPublish = async page => {
    await page.locator('input[name="title"]').fill('Chemise');
    await page.locator('input[name="price"]').fill('10');
    // The form refuses to send anything without a main picture, so these tests
    // need a real one to reach the authenticated request they are about.
    await page
        .locator('#picture')
        .setInputFiles({ name: 'main.png', mimeType: 'image/png', buffer: PNG });
    await page.getByRole('button', { name: 'Ajouter' }).click();
};

test('refreshes an expired token and silently retries the failed request', async ({ page }) => {
    await loginThenGoToPublish(page);

    let publishAttempt = 0;
    await page.route('**/offers/publish', route => {
        publishAttempt += 1;
        if (publishAttempt === 1) {
            return route.fulfill({ status: 401, contentType: 'application/json', body: '{}' });
        }

        expect(route.request().headers()['authorization']).toBe('Bearer refreshed-access-token');
        return route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
    });

    await page.route('**/users/refresh', route =>
        route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ accessToken: 'refreshed-access-token' }),
        }),
    );

    const retriedResponse = page.waitForResponse(
        response => response.url().includes('/offers/publish') && response.status() === 200,
    );

    await submitPublish(page);
    await retriedResponse;

    await expect(page).toHaveURL(/\/publish$/);
    expect(publishAttempt).toBe(2);
});

test('redirects to /login when the refresh itself fails', async ({ page }) => {
    await loginThenGoToPublish(page);

    await page.route('**/offers/publish', route =>
        route.fulfill({ status: 401, contentType: 'application/json', body: '{}' }),
    );
    await page.route('**/users/refresh', route =>
        route.fulfill({ status: 401, contentType: 'application/json', body: '{}' }),
    );

    await submitPublish(page);

    await expect(page).toHaveURL(/\/login$/);
});

// The refresh is bounded (`timeout: 5000` in `requestRefresh`), and the bound is
// shared with the page-load bootstrap. This case pins what that costs on this
// path: a refresh that never answers ends the session and sends the visitor to
// /login, where it used to leave the request pending for good. If the two calls
// are ever split again so only the bootstrap stays bounded, this test fails.
test('sends the visitor to /login when the refresh never answers', async ({ page }) => {
    await loginThenGoToPublish(page);

    await page.route('**/offers/publish', route =>
        route.fulfill({ status: 401, contentType: 'application/json', body: '{}' }),
    );
    // Never fulfilled: only the client's own timeout ends it.
    await page.route('**/users/refresh', () => {});

    await submitPublish(page);

    // Generous, because this waits out the client timeout on purpose.
    await expect(page).toHaveURL(/\/login$/, { timeout: 15000 });
});
