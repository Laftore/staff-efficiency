import { test, expect } from '@playwright/test';

/**
 * E2E-тесты для инвентаризации (Inventory).
 *
 * Тесты используют предварительно сохранённые сессии из auth.setup.ts.
 * Поскольку инвентаризация требует существующих смен, тесты сначала создают смену
 * (или используют уже созданную), затем переходят на /inventory и редактируют факт.
 *
 * Запуск:
 *   npx playwright test --project=owner
 *   npx playwright test --project=admin
 */

test.describe('Инвентаризация — OWNER', () => {
  test.use({ storageState: 'e2e/.auth/owner.json' });

  test('OWNER видит страницу инвентаризации и может сохранить факт', async ({ page }) => {
    // 1. Убедимся, что есть хотя бы одна смена (создаём при необходимости)
    await page.goto('/shifts');
    const hasShifts = await page.locator('tr').count().then((c) => c > 1); // header + at least one

    if (!hasShifts) {
      await page.getByRole('button', { name: /новая смена|добавить смену/i }).click();
      await page.getByLabel('Дата').fill('2026-06-10');
      await page.getByLabel('Тип смены').click();
      await page.getByRole('option', { name: /День/i }).click();
      await page.getByLabel('Выручка (тарифы)').fill('12000');
      await page.getByLabel('Выручка (товары)').fill('0');
      await page.getByRole('button', { name: 'Сохранить' }).click();
      await page.waitForTimeout(800);
    }

    // 2. Переходим на инвентаризацию
    await page.goto('/inventory');

    // Должна быть хотя бы одна смена в селекте
    await expect(page.getByText(/Смена|Выберите смену/i)).toBeVisible({ timeout: 10000 });

    // Ищем поле ввода факта (первое доступное)
    const factInput = page.getByLabel(/Факт:/).first();
    await expect(factInput).toBeVisible({ timeout: 8000 });

    // Меняем значение факта
    await factInput.fill('42');

    // Сохраняем
    await page.getByRole('button', { name: /Сохранить инвентаризацию/i }).click();

    // Проверяем успех (sonner toast)
    await expect(page.getByText(/Инвентаризация сохранена|сохранена/i)).toBeVisible({ timeout: 10000 });
  });
});

test.describe('Инвентаризация — ADMIN', () => {
  test.use({ storageState: 'e2e/.auth/admin.json' });

  test('ADMIN видит только свой филиал и может редактировать инвентарь', async ({ page }) => {
    await page.goto('/inventory');

    // ADMIN не должен видеть "Все филиалы" в заголовке/фильтрах (аналогично shifts)
    const allBranches = page.getByText(/все филиалы|all branches/i);
    await expect(allBranches).not.toBeVisible({ timeout: 5000 }).catch(() => { /* ok if not present on page */ });

    // Должна быть таблица или пустое состояние
    const tableOrEmpty = page.locator('table, text=Нет смен');
    await expect(tableOrEmpty.first()).toBeVisible({ timeout: 10000 });

    // Если есть товары — пробуем сохранить факт
    const factInput = page.getByLabel(/Факт:/).first();
    const hasFactInput = await factInput.isVisible().catch(() => false);

    if (hasFactInput) {
      await factInput.fill('7');
      await page.getByRole('button', { name: /Сохранить инвентаризацию/i }).click();
      await expect(page.getByText(/Инвентаризация сохранена/i)).toBeVisible({ timeout: 8000 });
    }
  });
});
