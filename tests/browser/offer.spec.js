import { test, expect } from '@playwright/test';

test('shows an error message instead of a stuck spinner when the offer fetch fails', async ({
    page,
}) => {
    await page.route('**/offers/*', route =>
        route.fulfill({
            status: 404,
            contentType: 'application/json',
            body: JSON.stringify({ message: "Cette offre n'existe pas." }),
        }),
    );

    await page.goto('/offers/64a000000000000000000000');

    await expect(page.getByText("Cette offre n'existe pas.")).toBeVisible();
    await expect(page.getByText('Chargement en cours...')).not.toBeVisible();
});
