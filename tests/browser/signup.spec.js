import { test, expect } from '@playwright/test';

test('signup page renders the registration form', async ({ page }) => {
    await page.goto('/signup');

    await expect(page.getByRole('heading', { name: "S'inscrire" })).toBeVisible();
    const form = page.locator('.main-signup form');
    await expect(form.locator('input[name="username"]')).toBeVisible();
    await expect(form.locator('input[name="email"]')).toBeVisible();
    await expect(form.locator('input[name="password"]')).toBeVisible();
    await expect(form.getByRole('button', { name: "S'inscrire" })).toBeVisible();
});

test('shows a confirmation message instead of the form on a successful signup', async ({
    page,
}) => {
    await page.route('**/users/signup', route =>
        route.fulfill({
            status: 201,
            contentType: 'application/json',
            body: JSON.stringify({ accessToken: 'token' }),
        }),
    );

    await page.goto('/signup');
    const form = page.locator('.main-signup form');
    await form.locator('input[name="username"]').fill('testuser');
    await form.locator('input[name="email"]').fill('test@example.com');
    await form.locator('input[name="password"]').fill('password');
    await form.getByRole('button', { name: "S'inscrire" }).click();

    await expect(
        page.getByText(
            "Merci de votre inscription ! Un email de confirmation vous a été envoyé, cliquez sur le lien qu'il contient pour activer votre compte.",
        ),
    ).toBeVisible();
    await expect(page.locator('.main-signup form')).toHaveCount(0);
    await expect(page).toHaveURL(/\/signup$/);
});
