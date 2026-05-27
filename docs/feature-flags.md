# Feature Flags

Система Feature Flags позволяет управлять поведением приложения без нового деплоя. Флаги могут быть глобальными или переопределёнными для конкретного филиала.

## Как это работает

Флаг может иметь два состояния:
- **Глобальный** (`branchId = null`) — применяется ко всем филиалам.
- **Per-branch** — переопределяет глобальное значение для конкретного филиала.

**Приоритет разрешения:**
1. Специфичный флаг для филиала (если существует).
2. Глобальный флаг.
3. `false` (по умолчанию, если флаг не создан).

## Использование

### Проверка флага

```ts
import { isFeatureEnabled } from "@/lib/feature-flags/feature-flags.service";

// Глобальная проверка
const vkEnabled = await isFeatureEnabled("VK_NOTIFICATIONS_ENABLED");

// Проверка с учётом филиала (рекомендуется)
const confirmationEnabled = await isFeatureEnabled(
  "BONUS_RESET_CONFIRMATION", 
  branchId
);

if (confirmationEnabled) {
  // логика с подтверждением
}
```

### Получение всех флагов

```ts
import { getAllFeatureFlags } from "@/lib/feature-flags/feature-flags.service";

const flags = await getAllFeatureFlags();
```

## Добавление нового флага

1. **Создайте флаг в базе данных** (рекомендуется через seed или Prisma Studio):
   ```ts
   await prisma.featureFlag.create({
     data: {
       key: "MY_NEW_FEATURE",
       enabled: false,
       description: "Описание нового функционала",
       branchId: null, // глобальный
     },
   });
   ```

2. **Используйте флаг в коде** через `isFeatureEnabled()`.

3. **(Опционально)** Добавьте флаг в seed (`prisma/seed.ts`), чтобы он создавался автоматически при `prisma db seed`.

## Текущие флаги

| Флаг                          | Назначение                                           | Значение по умолчанию | Применение |
|-------------------------------|------------------------------------------------------|-----------------------|----------|
| `VK_NOTIFICATIONS_ENABLED`    | Глобальное включение/отключение VK Bot уведомлений   | `true`                | `lib/vk/notifications.ts` (все три notify*) |
| `BONUS_RESET_CONFIRMATION`    | Требовать дополнительное подтверждение при сбросе бонуса | `false`            | `lib/shifts/shift.service.ts` (возврат requiresConfirmation) |
| `AUDIT_LOG_ENABLED`           | Включение/отключение записи Audit Log (kill-switch)  | `true`                | `lib/audit/audit.service.ts` (внутри logAction) |
| `ENHANCED_INVENTORY_UI`       | Прогрессивный rollout улучшенного UI инвентаризации  | `false`               | Зарезервирован (см. lib/inventory/inventory.service.ts) |

## Примеры использования

### 1. Отключение уведомлений

```ts
const notificationsEnabled = await isFeatureEnabled("VK_NOTIFICATIONS_ENABLED");

if (notificationsEnabled) {
  notifyNewShiftCreated(shiftId).catch(...);
}
```

### 2. Постепенный rollout функциональности

```ts
const enhancedUI = await isFeatureEnabled("ENHANCED_INVENTORY_UI", branchId);

if (enhancedUI) {
  // новая версия интерфейса
} else {
  // старая версия
}
```

## Рекомендации

- По умолчанию новые флаги лучше создавать выключенными (`enabled: false`).
- Для критичных флагов (типа отключения уведомлений) делайте их глобальными.
- Используйте осмысленные имена флагов в UPPER_SNAKE_CASE.
- При удалении флага из кода не забудьте удалить его из базы (или оставить как документацию).

---

**Сервис:** `lib/feature-flags/feature-flags.service.ts`
