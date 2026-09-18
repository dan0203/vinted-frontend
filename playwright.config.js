import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
    testDir: './tests/browser',
    fullyParallel: true,
    reporter: 'list',
    use: {
        baseURL: 'http://localhost:5173',
        trace: 'on-first-retry',
    },
    projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
    webServer: {
        command: 'yarn dev',
        url: 'http://localhost:5173',
        reuseExistingServer: !process.env.CI,
    },
});
