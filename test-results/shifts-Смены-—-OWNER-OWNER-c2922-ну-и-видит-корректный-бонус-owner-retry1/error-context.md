# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: shifts.spec.ts >> Смены — OWNER >> OWNER создаёт дневную смену и видит корректный бонус
- Location: e2e/shifts.spec.ts:18:7

# Error details

```
Test timeout of 30000ms exceeded.
```

```
Error: locator.click: Test timeout of 30000ms exceeded.
Call log:
  - waiting for getByRole('button', { name: 'Новая смена' })

```

# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - region "Notifications alt+T"
  - generic [ref=e2]:
    - complementary [ref=e4]:
      - generic [ref=e5]:
        - img [ref=e6]
        - generic [ref=e8]: StaffEfficiency
      - navigation [ref=e9]:
        - link "Дашборд" [ref=e10] [cursor=pointer]:
          - /url: /
          - img [ref=e11]
          - text: Дашборд
        - link "Смены" [ref=e16] [cursor=pointer]:
          - /url: /shifts
          - img [ref=e17]
          - text: Смены
        - link "Инвентаризация" [ref=e19] [cursor=pointer]:
          - /url: /inventory
          - img [ref=e20]
          - text: Инвентаризация
        - link "Сотрудники" [ref=e24] [cursor=pointer]:
          - /url: /employees
          - img [ref=e25]
          - text: Сотрудники
        - link "Филиалы" [ref=e30] [cursor=pointer]:
          - /url: /branches
          - img [ref=e31]
          - text: Филиалы
      - paragraph [ref=e35]: Кибер-клуб · 3 филиала
    - main [ref=e37]:
      - generic [ref=e39]:
        - img [ref=e41]
        - heading "Ошибка загрузки смен" [level=2] [ref=e43]
        - paragraph [ref=e44]: Не удалось получить данные по сменам. Проверьте подключение к базе данных.
        - button "Повторить загрузку" [ref=e45]:
          - img
          - text: Повторить загрузку
  - generic [ref=e50] [cursor=pointer]:
    - button "Open Next.js Dev Tools" [ref=e51]:
      - img [ref=e52]
    - generic [ref=e55]:
      - button "Open issues overlay" [ref=e56]:
        - generic [ref=e57]:
          - generic [ref=e58]: "0"
          - generic [ref=e59]: "1"
        - generic [ref=e60]: Issue
      - button "Collapse issues badge" [ref=e61]:
        - img [ref=e62]
  - alert [ref=e64]
```

# Test source

```ts
  1  | import { test, expect } from '@playwright/test';
  2  | 
  3  | /**
  4  |  * E2E-тесты для работы со сменами.
  5  |  * 
  6  |  * Тесты разделены по ролям и используют предварительно сохранённые сессии
  7  |  * (storageState) из auth.setup.ts.
  8  |  * 
  9  |  * Запуск:
  10 |  *   npx playwright test --project=owner
  11 |  *   npx playwright test --project=admin
  12 |  */
  13 | 
  14 | test.describe('Смены — OWNER', () => {
  15 |   // Используем сессию владельца (доступ ко всем филиалам)
  16 |   test.use({ storageState: 'e2e/.auth/owner.json' });
  17 | 
  18 |   test('OWNER создаёт дневную смену и видит корректный бонус', async ({ page }) => {
  19 |     await page.goto('/shifts');
  20 | 
  21 |     // Открываем форму создания новой смены
> 22 |     await page.getByRole('button', { name: 'Новая смена' }).click();
     |                                                             ^ Error: locator.click: Test timeout of 30000ms exceeded.
  23 | 
  24 |     // Заполняем дату
  25 |     await page.getByLabel('Дата').fill('2026-06-01');
  26 | 
  27 |     // Выбираем тип смены — День
  28 |     await page.getByLabel('Тип смены').click();
  29 |     await page.getByRole('option', { name: /День \(план 15 000 ₽\)/ }).click();
  30 | 
  31 |     // Заполняем выручку так, чтобы бонус был 200 ₽
  32 |     // 15000 (тарифы) + 3000 (товары) = 18000 → O=20% → P=200 для дневной смены
  33 |     await page.getByLabel('Выручка (тарифы)').fill('15000');
  34 |     await page.getByLabel('Выручка (товары)').fill('3000');
  35 | 
  36 |     // Сохраняем смену
  37 |     await page.getByRole('button', { name: 'Сохранить' }).click();
  38 | 
  39 |     // Ждём появления новой смены в таблице
  40 |     const newShiftRow = page.locator('tr', { hasText: '01.06.2026' });
  41 |     await expect(newShiftRow).toBeVisible({ timeout: 15000 });
  42 | 
  43 |     // Проверяем, что бонус отображается как 200 ₽ (или 200,00 ₽)
  44 |     await expect(newShiftRow).toContainText('200');
  45 | 
  46 |     // Дополнительно: проверяем, что нет бейджа "обнулён" и "Q < 0"
  47 |     await expect(newShiftRow.getByText('обнулён')).not.toBeVisible();
  48 |     await expect(newShiftRow.getByText('Q < 0')).not.toBeVisible();
  49 |   });
  50 | });
  51 | 
  52 | test.describe('Смены — ADMIN', () => {
  53 |   // Используем сессию администратора (только свой филиал)
  54 |   test.use({ storageState: 'e2e/.auth/admin.json' });
  55 | 
  56 |   test('ADMIN создаёт смену и видит рассчитанный бонус', async ({ page }) => {
  57 |     await page.goto('/shifts');
  58 | 
  59 |     // Проверяем, что ADMIN не видит фильтр "Все филиалы"
  60 |     // (это опциональная, но полезная проверка ролевых ограничений)
  61 |     const allBranchesFilter = page.getByText('Все филиалы');
  62 |     await expect(allBranchesFilter).not.toBeVisible();
  63 | 
  64 |     // Создаём смену
  65 |     await page.getByRole('button', { name: 'Новая смена' }).click();
  66 | 
  67 |     await page.getByLabel('Дата').fill('2026-06-02');
  68 | 
  69 |     await page.getByLabel('Тип смены').click();
  70 |     await page.getByRole('option', { name: /День \(план 15 000 ₽\)/ }).click();
  71 | 
  72 |     // Данные для бонуса 100 ₽ (O=10%)
  73 |     await page.getByLabel('Выручка (тарифы)').fill('16500');
  74 |     await page.getByLabel('Выручка (товары)').fill('0');
  75 | 
  76 |     await page.getByRole('button', { name: 'Сохранить' }).click();
  77 | 
  78 |     // Проверяем появление смены
  79 |     const newShiftRow = page.locator('tr', { hasText: '02.06.2026' });
  80 |     await expect(newShiftRow).toBeVisible({ timeout: 15000 });
  81 | 
  82 |     // Проверяем бонус
  83 |     await expect(newShiftRow).toContainText('100');
  84 |   });
  85 | });
  86 | 
```