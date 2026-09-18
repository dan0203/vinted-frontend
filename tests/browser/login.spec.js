import { test, expect } from '@playwright/test';

test('login page renders the sign-in form', async ({ page }) => {
    await page.goto('/login');

    await expect(page.getByRole('heading', { name: 'Se connecter' })).toBeVisible();
    const form = page.locator('.main-login form');
    await expect(form.locator('input[name="email"]')).toBeVisible();
    await expect(form.locator('input[name="password"]')).toBeVisible();
    await expect(form.getByRole('button', { name: 'Se connecter' })).toBeVisible();
});
