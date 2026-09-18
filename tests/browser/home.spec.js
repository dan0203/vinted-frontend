import { test, expect } from '@playwright/test';

test('shows an error message instead of a stuck spinner when the offers fetch fails', async ({
    page,
}) => {
    await page.route('**/offers*', route =>
        route.fulfill({
            status: 500,
            contentType: 'application/json',
            body: JSON.stringify({ message: 'Erreur serveur.' }),
        }),
    );

    await page.goto('/');

    await expect(page.getByText('Erreur serveur.')).toBeVisible();
    await expect(page.getByText('Chargement en cours...')).not.toBeVisible();
});
