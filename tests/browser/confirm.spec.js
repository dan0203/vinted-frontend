import { test, expect } from '@playwright/test';

test('shows the activated message and a login link on a successful confirmation', async ({
    page,
}) => {
    await page.route('**/users/confirm/*', route =>
        route.fulfill({ status: 200, contentType: 'application/json', body: '{}' }),
    );

    await page.goto('/confirm/sometoken');

    await expect(
        page.getByText('Votre compte est activé ! Vous pouvez maintenant vous connecter.'),
    ).toBeVisible();
    await expect(
        page.locator('.main-confirm').getByRole('link', { name: 'Se connecter' }),
    ).toBeVisible();
});

test('shows the error message and a login link on an invalid/expired token', async ({ page }) => {
    await page.route('**/users/confirm/*', route =>
        route.fulfill({
            status: 400,
            contentType: 'application/json',
            body: JSON.stringify({ message: 'Lien de confirmation invalide ou expiré.' }),
        }),
    );

    await page.goto('/confirm/sometoken');

    await expect(page.getByText('Lien de confirmation invalide ou expiré.')).toBeVisible();
    await expect(page.getByRole('link', { name: 'Retour à la connexion' })).toBeVisible();
});
