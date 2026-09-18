import { test, expect } from '@playwright/test';

test('login page renders the sign-in form', async ({ page }) => {
    await page.goto('/login');

    await expect(page.getByRole('heading', { name: 'Se connecter' })).toBeVisible();
    const form = page.locator('.main-login form');
    await expect(form.locator('input[name="email"]')).toBeVisible();
    await expect(form.locator('input[name="password"]')).toBeVisible();
    await expect(form.getByRole('button', { name: 'Se connecter' })).toBeVisible();
});

const submitLogin = async page => {
    await page.goto('/login');
    const form = page.locator('.main-login form');
    await form.locator('input[name="email"]').fill('test@example.com');
    await form.locator('input[name="password"]').fill('password');
    await form.getByRole('button', { name: 'Se connecter' }).click();
};

test('shows the lockout message on a 423 response', async ({ page }) => {
    await page.route('**/users/login', route =>
        route.fulfill({ status: 423, contentType: 'application/json', body: '{}' }),
    );

    await submitLogin(page);

    await expect(
        page.getByText(
            'Compte verrouillé pendant 15 minutes après plusieurs tentatives échouées. Réessayez plus tard.',
        ),
    ).toBeVisible();
});

test('shows the backend message and a confirmation hint on a 403 response', async ({ page }) => {
    await page.route('**/users/login', route =>
        route.fulfill({
            status: 403,
            contentType: 'application/json',
            body: JSON.stringify({ message: 'Identifiants invalides.' }),
        }),
    );

    await submitLogin(page);

    await expect(page.getByText('Identifiants invalides.')).toBeVisible();
    await expect(
        page.getByText(
            "Si vous n'avez pas encore confirmé votre compte, vérifiez vos emails pour retrouver le lien de confirmation.",
        ),
    ).toBeVisible();
});
