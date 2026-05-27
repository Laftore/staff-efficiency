# Contributing to StaffEfficiency

## Правила коммитов

Используем [Conventional Commits](https://www.conventionalcommits.org/):

- `feat:` — новая функциональность
- `fix:` — исправление бага
- `refactor:` — рефакторинг без изменения поведения
- `chore:` — технические изменения (зависимости, скрипты и т.д.)
- `test:` — добавление или изменение тестов

## Процесс Pull Request

1. Создайте ветку от `main`: `git checkout -b feat/your-feature`
2. Внесите изменения + добавьте тесты при необходимости
3. Запустите `npm run lint:fix` и `npm run build`
4. Создайте Pull Request с описанием изменений
5. После ревью и approval — мерж через Squash or Merge Commit

## Работа с Audit Log

При добавлении нового важного действия в систему:

1. Добавьте константу в `AuditAction` (`lib/audit/audit.service.ts`)
2. Вызовите `logAction(...)` в соответствующем сервисе после успешного выполнения операции
3. Передавайте осмысленный `details` (особенно `before/after` значения при обновлениях)

Пример:
```ts
await logAction({
  user,
  action: AuditAction.SHIFT_BONUS_RESET,
  entityType: "SHIFT",
  entityId: shiftId,
  branchId: shift.branchId,
  details: { previousBonus, newBonus: 0 },
});
```

## Работа с Feature Flags

Чтобы добавить новый feature flag:

1. Создайте запись в таблице `feature_flags` (через seed или вручную).
2. Используйте `isFeatureEnabled("YOUR_FLAG_KEY", branchId?)` в коде.
3. По возможности делайте флаг безопасным по умолчанию (`false`).

Пример:
```ts
if (await isFeatureEnabled("VK_NOTIFICATIONS_ENABLED", branchId)) {
  notifyNewShiftCreated(shiftId);
}
```

## Тестирование

```bash
# Тесты формулы бонуса
npm run test:bonus

# Все unit-тесты
npx vitest run

# E2E тесты
npm run test:e2e
```

При добавлении новой функциональности рекомендуется покрывать:
- Соответствующий сервис (`lib/*/ *.service.ts`)
- Server Action (если есть)
- Edge-кейсы с разными ролями (OWNER / SENIOR_ADMIN / ADMIN)

## Полезные команды

```bash
npm run lint:fix
npm run build
npm run test:bonus
npx vitest run
```

Благодарим за вклад! 🚀
