import { test, expect } from '@playwright/test';

/**
 * E2E-тесты для работы со сменами.
 * 
 * Тесты разделены по ролям и используют предварительно сохранённые сессии
 * (storageState) из auth.setup.ts.
 * 
 * Запуск:
 *   npx playwright test --project=owner
 *   npx playwright test --project=admin
 */

test.describe('Смены — OWNER', () => {
  // Используем сессию владельца (доступ ко всем филиалам)
  test.use({ storageState: 'e2e/.auth/owner.json' });

  test('OWNER создаёт дневную смену и видит корректный бонус', async ({ page }) => {
    await page.goto('/shifts');

    // Открываем форму создания новой смены
    await page.getByRole('button', { name: 'Новая смена' }).click();

    // Заполняем дату
    await page.getByLabel('Дата').fill('2026-06-01');

    // Выбираем тип смены — День
    await page.getByLabel('Тип смены').click();
    await page.getByRole('option', { name: /День \(план 15 000 ₽\)/ }).click();

    // Заполняем выручку так, чтобы бонус был 200 ₽
    // 15000 (тарифы) + 3000 (товары) = 18000 → O=20% → P=200 для дневной смены
    await page.getByLabel('Выручка (тарифы)').fill('15000');
    await page.getByLabel('Выручка (товары)').fill('3000');

    // Сохраняем смену
    await page.getByRole('button', { name: 'Сохранить' }).click();

    // Ждём появления новой смены в таблице
    const newShiftRow = page.locator('tr', { hasText: '01.06.2026' });
    await expect(newShiftRow).toBeVisible({ timeout: 15000 });

    // Проверяем, что бонус отображается как 200 ₽ (или 200,00 ₽)
    await expect(newShiftRow).toContainText('200');

    // Дополнительно: проверяем, что нет бейджа "обнулён" и "Q < 0"
    await expect(newShiftRow.getByText('обнулён')).not.toBeVisible();
    await expect(newShiftRow.getByText('Q < 0')).not.toBeVisible();
  });
});

test.describe('Смены — ADMIN', () => {
  // Используем сессию администратора (только свой филиал)
  test.use({ storageState: 'e2e/.auth/admin.json' });

  test('ADMIN создаёт смену и видит рассчитанный бонус', async ({ page }) => {
    await page.goto('/shifts');

    // Проверяем, что ADMIN не видит фильтр "Все филиалы"
    // (это опциональная, но полезная проверка ролевых ограничений)
    const allBranchesFilter = page.getByText('Все филиалы');
    await expect(allBranchesFilter).not.toBeVisible();

    // Создаём смену
    await page.getByRole('button', { name: 'Новая смена' }).click();

    await page.getByLabel('Дата').fill('2026-06-02');

    await page.getByLabel('Тип смены').click();
    await page.getByRole('option', { name: /День \(план 15 000 ₽\)/ }).click();

    // Данные для бонуса 100 ₽ (O=10%)
    await page.getByLabel('Выручка (тарифы)').fill('16500');
    await page.getByLabel('Выручка (товары)').fill('0');

    await page.getByRole('button', { name: 'Сохранить' }).click();

    // Проверяем появление смены
    const newShiftRow = page.locator('tr', { hasText: '02.06.2026' });
    await expect(newShiftRow).toBeVisible({ timeout: 15000 });

    // Проверяем бонус
    await expect(newShiftRow).toContainText('100');
  });
});
