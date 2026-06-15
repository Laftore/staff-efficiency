import type { AuditActionType } from "@/lib/audit/audit.service";
import type { AppRole } from "@/types";

export const AUDIT_ACTION_LABELS: Record<AuditActionType, string> = {
  SHIFT_CREATED: "Смена создана",
  SHIFT_UPDATED: "Смена изменена",
  SHIFT_BONUS_RESET: "Бонус обнулён",
  EMPLOYEE_CREATED: "Сотрудник добавлен",
  EMPLOYEE_UPDATED: "Сотрудник изменён",
  ROLE_CHANGED: "Роль изменена",
  INVENTORY_SAVED: "Инвентаризация сохранена",
};

export const ENTITY_TYPE_LABELS: Record<string, string> = {
  SHIFT: "Смена",
  EMPLOYEE: "Сотрудник",
  PROFILE: "Профиль",
};

export const ROLE_LABELS: Record<AppRole, string> = {
  OWNER: "Владелец",
  SENIOR_ADMIN: "Старший администратор",
  ADMIN: "Администратор",
};

const DETAIL_KEY_LABELS: Record<string, string> = {
  previousBonus: "Предыдущий бонус",
  newBonus: "Новый бонус",
  previousRole: "Была роль",
  newRole: "Стала роль",
  from: "Было",
  to: "Стало",
  name: "Имя",
  reason: "Причина",
  itemsCount: "Позиций",
  discrepancy: "Расхождений",
  revenue: "Выручка",
  bonus: "Бонус",
  field: "Поле",
};

const FIELD_LABELS: Record<string, string> = {
  revenueGoods: "Выручка товаров",
  revenueTariff: "Выручка тарифов",
  bonusAdjustment: "Корректировка бонуса",
};

function formatMoney(value: unknown): string {
  const num = Number(value);
  if (Number.isNaN(num)) return String(value);
  return `${Math.round(num).toLocaleString("ru-RU")} ₽`;
}

function formatRole(value: unknown): string {
  if (typeof value !== "string") return String(value ?? "—");
  return ROLE_LABELS[value as AppRole] ?? value;
}

function formatDetailValue(key: string, value: unknown): string {
  if (value === null || value === undefined) return "—";

  if (key === "from" || key === "to" || key === "previousRole" || key === "newRole") {
    return formatRole(value);
  }

  if (key === "field" && typeof value === "string") {
    return FIELD_LABELS[value] ?? value;
  }

  if (
    key === "previousBonus" ||
    key === "newBonus" ||
    key === "revenue" ||
    key === "bonus"
  ) {
    return formatMoney(value);
  }

  if (typeof value === "object") {
    return JSON.stringify(value);
  }

  return String(value);
}

export function getAuditActionLabel(action: string): string {
  return AUDIT_ACTION_LABELS[action as AuditActionType] ?? action;
}

export function getEntityTypeLabel(entityType: string): string {
  return ENTITY_TYPE_LABELS[entityType] ?? entityType;
}

export function getRoleLabel(role: string): string {
  return ROLE_LABELS[role as AppRole] ?? role;
}

export function getBranchLabel(
  branchId: string | null | undefined,
  branchNames: Record<string, string>,
): string {
  if (!branchId) return "—";
  return branchNames[branchId] ?? "Неизвестный филиал";
}

export function formatAuditEntity(log: {
  entityType: string;
  details?: unknown;
}): string {
  const typeLabel = getEntityTypeLabel(log.entityType);
  const details = log.details;

  if (details && typeof details === "object" && "name" in details) {
    const name = (details as { name?: unknown }).name;
    if (typeof name === "string" && name.trim()) {
      return `${typeLabel}: ${name}`;
    }
  }

  return typeLabel;
}

export function formatDetailsPreview(details: unknown): string {
  if (!details || typeof details !== "object") {
    return "—";
  }

  const record = details as Record<string, unknown>;

  if ("previousBonus" in record && "newBonus" in record) {
    return `Бонус: ${formatMoney(record.previousBonus)} → ${formatMoney(record.newBonus)}`;
  }

  if ("from" in record && "to" in record && !("field" in record)) {
    return `Роль: ${formatRole(record.from)} → ${formatRole(record.to)}`;
  }

  if ("name" in record && typeof record.name === "string") {
    return record.name;
  }

  if ("itemsCount" in record) {
    const count = record.itemsCount;
    const discrepancy = record.discrepancy;
    if (discrepancy !== undefined) {
      return `${count} поз., расхождений: ${discrepancy}`;
    }
    return `${count} позиций`;
  }

  if ("revenue" in record && "bonus" in record) {
    return `Выручка ${formatMoney(record.revenue)}, бонус ${formatMoney(record.bonus)}`;
  }

  if ("field" in record && "from" in record && "to" in record) {
    const field = formatDetailValue("field", record.field);
    return `${field}: ${record.from} → ${record.to}`;
  }

  if ("reason" in record && typeof record.reason === "string") {
    return record.reason;
  }

  const entries = Object.entries(record).slice(0, 2);
  if (entries.length === 0) return "—";

  return entries
    .map(([key, value]) => {
      const label = DETAIL_KEY_LABELS[key] ?? key;
      return `${label}: ${formatDetailValue(key, value)}`;
    })
    .join(" · ");
}

export function formatDetailsEntries(
  details: unknown,
): Array<{ label: string; value: string }> {
  if (!details || typeof details !== "object") {
    return [];
  }

  return Object.entries(details as Record<string, unknown>).map(([key, value]) => ({
    label: DETAIL_KEY_LABELS[key] ?? key,
    value: formatDetailValue(key, value),
  }));
}