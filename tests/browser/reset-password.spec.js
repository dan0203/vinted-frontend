import { test, expect } from '@playwright/test';

test('renders the reset-password request form', async ({ page }) => {
    await page.goto('/reset-password');

    await expect(page.getByRole('heading', { name: 'Mot de passe oublié' })).toBeVisible();
    const form = page.locator('.main-reset-password form');
    await expect(form.locator('input[name="email"]')).toBeVisible();
    await expect(form.getByRole('button', { name: 'Recevoir le code' })).toBeVisible();
});

test('advances to the token/password step on a successful request', async ({ page }) => {
    await page.route('**/users/reset/request', route =>
        route.fulfill({ status: 200, contentType: 'application/json', body: '{}' }),
    );

    await page.goto('/reset-password');
    await page.locator('input[name="email"]').fill('test@example.com');
    await page.getByRole('button', { name: 'Recevoir le code' }).click();

    const form = page.locator('.main-reset-password form');
    await expect(form.locator('input[name="token"]')).toBeVisible();
    await expect(form.locator('input[name="password"]')).toBeVisible();
    await expect(form.locator('input[name="confirmPassword"]')).toBeVisible();
});

test('shows an error message when the request fails', async ({ page }) => {
    await page.route('**/users/reset/request', route =>
        route.fulfill({
            status: 400,
            contentType: 'application/json',
            body: JSON.stringify({ message: 'Email invalide.' }),
        }),
    );

    await page.goto('/reset-password');
    await page.locator('input[name="email"]').fill('test@example.com');
    await page.getByRole('button', { name: 'Recevoir le code' }).click();

    await expect(page.getByText('Email invalide.')).toBeVisible();
});

test('blocks submit client-side when passwords do not match', async ({ page }) => {
    await page.route('**/users/reset/request', route =>
        route.fulfill({ status: 200, contentType: 'application/json', body: '{}' }),
    );
    await page.route('**/users/reset/confirm', () => {
        throw new Error('should not be called when passwords mismatch');
    });

    await page.goto('/reset-password');
    await page.locator('input[name="email"]').fill('test@example.com');
    await page.getByRole('button', { name: 'Recevoir le code' }).click();

    const form = page.locator('.main-reset-password form');
    await form.locator('input[name="token"]').fill('123456');
    await form.locator('input[name="password"]').fill('NewPass123!');
    await form.locator('input[name="confirmPassword"]').fill('Different123!');
    await form.getByRole('button', { name: 'Réinitialiser le mot de passe' }).click();

    await expect(page.getByText('Les mots de passe ne correspondent pas.')).toBeVisible();

    await form.locator('input[name="confirmPassword"]').fill('NewPass123!');
    await expect(page.getByText('Les mots de passe ne correspondent pas.')).toHaveCount(0);
});

test('disables the submit button while the request is in flight', async ({ page }) => {
    // The request is held open until the assertion has run, rather than for a
    // fixed delay: under load the response landed first, the form advanced and
    // the button was gone, so the test failed with "element(s) not found".
    let release;
    const held = new Promise(resolve => {
        release = resolve;
    });
    await page.route('**/users/reset/request', async route => {
        await held;
        await route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
    });

    await page.goto('/reset-password');
    await page.locator('input[name="email"]').fill('test@example.com');
    const button = page.getByRole('button', { name: 'Recevoir le code' });
    await button.click();

    await expect(button).toBeDisabled();
    release();
});

test('shows an error message when the confirm request fails', async ({ page }) => {
    await page.route('**/users/reset/request', route =>
        route.fulfill({ status: 200, contentType: 'application/json', body: '{}' }),
    );
    await page.route('**/users/reset/confirm', route =>
        route.fulfill({
            status: 400,
            contentType: 'application/json',
            body: JSON.stringify({ message: 'Invalid or expired reset link' }),
        }),
    );

    await page.goto('/reset-password');
    await page.locator('input[name="email"]').fill('test@example.com');
    await page.getByRole('button', { name: 'Recevoir le code' }).click();

    const form = page.locator('.main-reset-password form');
    await form.locator('input[name="token"]').fill('123456');
    await form.locator('input[name="password"]').fill('NewPass123!');
    await form.locator('input[name="confirmPassword"]').fill('NewPass123!');
    await form.getByRole('button', { name: 'Réinitialiser le mot de passe' }).click();

    await expect(page.getByText('Invalid or expired reset link')).toBeVisible();
});

test('clears the stale backend error when a later submit mismatches', async ({ page }) => {
    await page.route('**/users/reset/request', route =>
        route.fulfill({ status: 200, contentType: 'application/json', body: '{}' }),
    );
    await page.route('**/users/reset/confirm', route =>
        route.fulfill({
            status: 400,
            contentType: 'application/json',
            body: JSON.stringify({ message: 'Invalid or expired reset link' }),
        }),
    );

    await page.goto('/reset-password');
    await page.locator('input[name="email"]').fill('test@example.com');
    await page.getByRole('button', { name: 'Recevoir le code' }).click();

    const form = page.locator('.main-reset-password form');
    await form.locator('input[name="token"]').fill('123456');
    await form.locator('input[name="password"]').fill('NewPass123!');
    await form.locator('input[name="confirmPassword"]').fill('NewPass123!');
    await form.getByRole('button', { name: 'Réinitialiser le mot de passe' }).click();
    await expect(page.getByText('Invalid or expired reset link')).toBeVisible();

    await form.locator('input[name="confirmPassword"]').fill('Different123!');
    await form.getByRole('button', { name: 'Réinitialiser le mot de passe' }).click();

    await expect(page.getByText('Les mots de passe ne correspondent pas.')).toBeVisible();
    await expect(page.getByText('Invalid or expired reset link')).toHaveCount(0);
});

test('shows the success screen on a successful confirm', async ({ page }) => {
    await page.route('**/users/reset/request', route =>
        route.fulfill({ status: 200, contentType: 'application/json', body: '{}' }),
    );
    await page.route('**/users/reset/confirm', route =>
        route.fulfill({ status: 200, contentType: 'application/json', body: '{}' }),
    );

    await page.goto('/reset-password');
    await page.locator('input[name="email"]').fill('test@example.com');
    await page.getByRole('button', { name: 'Recevoir le code' }).click();

    const form = page.locator('.main-reset-password form');
    await form.locator('input[name="token"]').fill('123456');
    await form.locator('input[name="password"]').fill('NewPass123!');
    await form.locator('input[name="confirmPassword"]').fill('NewPass123!');
    await form.getByRole('button', { name: 'Réinitialiser le mot de passe' }).click();

    await expect(
        page.getByText('Votre mot de passe a été réinitialisé. Vous pouvez maintenant vous connecter.'),
    ).toBeVisible();
    await expect(
        page.locator('.main-reset-password').getByRole('link', { name: 'Se connecter' }),
    ).toHaveAttribute('href', '/login');
});

test('Login page links to reset-password', async ({ page }) => {
    await page.goto('/login');

    await expect(page.getByRole('link', { name: 'Mot de passe oublié ?' })).toHaveAttribute(
        'href',
        '/reset-password',
    );
});
