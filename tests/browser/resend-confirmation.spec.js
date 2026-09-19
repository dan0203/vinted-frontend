import { test, expect } from '@playwright/test';

test('renders the resend-confirmation form', async ({ page }) => {
    await page.goto('/resend-confirmation');

    await expect(
        page.getByRole('heading', { name: "Renvoyer l'email de confirmation" }),
    ).toBeVisible();
    const form = page.locator('.main-resend-confirmation form');
    await expect(form.locator('input[name="email"]')).toBeVisible();
    await expect(form.getByRole('button', { name: "Renvoyer l'email" })).toBeVisible();
});

test('shows the generic sent message on a successful response', async ({ page }) => {
    await page.route('**/users/confirm/resend', route =>
        route.fulfill({ status: 200, contentType: 'application/json', body: '{}' }),
    );

    await page.goto('/resend-confirmation');
    await page.locator('input[name="email"]').fill('test@example.com');
    await page.getByRole('button', { name: "Renvoyer l'email" }).click();

    await expect(
        page.getByText(
            'Si un compte existe pour cette adresse, un email de confirmation vient de lui être envoyé.',
        ),
    ).toBeVisible();
});

test('shows an error message on a failed response', async ({ page }) => {
    await page.route('**/users/confirm/resend', route =>
        route.fulfill({
            status: 400,
            contentType: 'application/json',
            body: JSON.stringify({ message: 'Email invalide.' }),
        }),
    );

    await page.goto('/resend-confirmation');
    await page.locator('input[name="email"]').fill('test@example.com');
    await page.getByRole('button', { name: "Renvoyer l'email" }).click();

    await expect(page.getByText('Email invalide.')).toBeVisible();
});

test('Login 403 hint links to resend-confirmation', async ({ page }) => {
    await page.route('**/users/login', route =>
        route.fulfill({ status: 403, contentType: 'application/json', body: '{}' }),
    );

    await page.goto('/login');
    const form = page.locator('.main-login form');
    await form.locator('input[name="email"]').fill('test@example.com');
    await form.locator('input[name="password"]').fill('password');
    await form.getByRole('button', { name: 'Se connecter' }).click();

    await expect(
        page.getByRole('link', { name: "renvoyer l'email de confirmation" }),
    ).toHaveAttribute('href', '/resend-confirmation');
});

test('Confirm error screen links to resend-confirmation', async ({ page }) => {
    await page.route('**/users/confirm/*', route =>
        route.fulfill({
            status: 400,
            contentType: 'application/json',
            body: JSON.stringify({ message: 'Lien de confirmation invalide ou expiré.' }),
        }),
    );

    await page.goto('/confirm/sometoken');

    await expect(
        page.getByRole('link', { name: "Renvoyer l'email de confirmation" }),
    ).toHaveAttribute('href', '/resend-confirmation');
});
