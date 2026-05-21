import type { ShiftType } from "@/types";

const SHIFT_TYPE_LABELS: Record<ShiftType, string> = {
  DAY: "День",
  NIGHT: "Ночь",
  EXTRA: "Доп",
};

export function formatShiftType(type: ShiftType): string {
  return SHIFT_TYPE_LABELS[type];
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("ru-RU", {
    style: "currency",
    currency: "RUB",
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

export function toDateInputValue(date: Date): string {
  return date.toISOString().slice(0, 10);
}
