import { test, expect } from '@playwright/test';

const login = async page => {
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

    await expect(page.getByRole('button', { name: 'Se déconnecter' })).toBeVisible();
};

test('logging out calls POST /users/logout and returns to the signed-out state', async ({
    page,
}) => {
    let logoutRequested = false;
    await page.route('**/users/logout', route => {
        logoutRequested = true;
        return route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
    });

    await login(page);
    await page.getByRole('button', { name: 'Se déconnecter' }).click();

    await expect(page.getByRole('link', { name: "S'inscrire" })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Se connecter' })).toBeVisible();
    expect(logoutRequested).toBe(true);
    await expect(page).toHaveURL(/\/$/);
});

test('logging out still clears the session and stays on / when the request fails', async ({
    page,
}) => {
    await page.route('**/users/logout', route =>
        route.fulfill({ status: 401, contentType: 'application/json', body: '{}' }),
    );
    await page.route('**/users/refresh', route =>
        route.fulfill({ status: 401, contentType: 'application/json', body: '{}' }),
    );

    await login(page);
    await page.getByRole('button', { name: 'Se déconnecter' }).click();

    await expect(page.getByRole('link', { name: "S'inscrire" })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Se connecter' })).toBeVisible();
    await expect(page).toHaveURL(/\/$/);
});
