import { test, expect } from '@playwright/test';

/**
 * E2E тесты аутентификации и ролевого доступа (multi-tenant).
 * 
 * Эти тесты используют предварительно сохранённые сессии (storageState)
 * из e2e/auth.setup.ts. Благодаря этому логины выполняются только один раз.
 * 
 * Запуск:
 *   npx playwright test --project=owner
 *   npx playwright test --project=admin
 */

test.describe('Аутентификация и ролевой доступ (OWNER)', () => {
  // Этот блок будет запускаться с сессией OWNER благодаря проекту в playwright.config.ts
  test.use({ storageState: 'e2e/.auth/owner.json' });

  test('OWNER видит все филиалы на странице смен', async ({ page }) => {
    await page.goto('/shifts');

    // OWNER должен иметь доступ к фильтру по филиалам
    const branchFilter = page.getByText(/филиал|branch/i);
    await expect(branchFilter.first()).toBeVisible({ timeout: 10000 });
  });
});

test.describe('Аутентификация и ролевой доступ (ADMIN)', () => {
  test.use({ storageState: 'e2e/.auth/admin.json' });

  test('ADMIN видит только свой филиал', async ({ page }) => {
    await page.goto('/shifts');

    // ADMIN не должен видеть опцию "Все филиалы"
    const allBranchesOption = page.getByText(/все филиалы|all branches/i);
    await expect(allBranchesOption).not.toBeVisible({ timeout: 5000 });
  });
});

// Старые тесты создания смены перенесены в shifts.spec.ts (более актуальные селекторы и assertions).
// Оставлено для обратной совместимости — новые сценарии лучше добавлять в shifts.spec.ts и inventory.spec.ts.
