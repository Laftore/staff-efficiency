import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright configuration for StaffEfficiency E2E tests.
 * 
 * - Starts Next.js dev server automatically
 * - Uses http://localhost:3000 as baseURL
 * - Focuses on Chromium for now (can expand later)
 * - Good defaults for CI and local development
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: 1,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',

  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },

  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    stdout: 'ignore',
    stderr: 'pipe',
    // Pass E2E mock flag to the Next.js server so getSessionUser() + middleware use the fast mock path.
    // This is the recommended way to run E2E locally and in CI without SERVICE_ROLE_KEY.
    env: {
      E2E_AUTH_MOCK: process.env.E2E_AUTH_MOCK ?? '1',
      // You can override with real credentials + SERVICE_ROLE_KEY for the "real auth" path
    },
  },

  projects: [
    // Setup project — выполняет аутентификацию и сохраняет storageState
    {
      name: 'setup',
      testMatch: /auth\.setup\.ts/,
    },

    // Проект для OWNER (использует сохранённую сессию владельца)
    {
      name: 'owner',
      use: {
        ...devices['Desktop Chrome'],
        storageState: 'e2e/.auth/owner.json',
      },
      dependencies: ['setup'],
    },

    // Проект для ADMIN (использует сохранённую сессию администратора)
    {
      name: 'admin',
      use: {
        ...devices['Desktop Chrome'],
        storageState: 'e2e/.auth/admin.json',
      },
      dependencies: ['setup'],
    },

    // Основной проект для общих тестов (без предустановленной сессии)
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
      dependencies: ['setup'],
    },

    // Uncomment when ready for more browsers
    // {
    //   name: 'firefox',
    //   use: { ...devices['Desktop Firefox'] },
    // },
    // {
    //   name: 'webkit',
    //   use: { ...devices['Desktop Safari'] },
    // },
  ],
});
