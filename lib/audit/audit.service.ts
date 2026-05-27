import { prisma } from "@/lib/prisma";
import type { SessionUser } from "@/types";
import { isFeatureEnabled } from "@/lib/feature-flags/feature-flags.service";

/**
 * Типы действий, которые мы логируем в системе.
 */
export const AuditAction = {
  SHIFT_CREATED: "SHIFT_CREATED",
  SHIFT_UPDATED: "SHIFT_UPDATED",
  SHIFT_BONUS_RESET: "SHIFT_BONUS_RESET",
  EMPLOYEE_CREATED: "EMPLOYEE_CREATED",
  EMPLOYEE_UPDATED: "EMPLOYEE_UPDATED",
  ROLE_CHANGED: "ROLE_CHANGED",
  INVENTORY_SAVED: "INVENTORY_SAVED",
} as const;

export type AuditActionType = (typeof AuditAction)[keyof typeof AuditAction];

export interface LogActionParams {
  user: SessionUser;
  action: AuditActionType;
  entityType: string;
  entityId: string;
  branchId?: string | null;
  details?: Record<string, unknown>;
}

export interface AuditLogQueryOptions {
  page?: number;
  pageSize?: number;
  fromDate?: Date;
  toDate?: Date;
  branchId?: string;
}

export interface PaginatedAuditLogs {
  logs: any[]; // Можно позже типизировать через Prisma
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

/**
 * Базовая функция логирования действий.
 */
export async function logAction({
  user,
  action,
  entityType,
  entityId,
  branchId,
  details,
}: LogActionParams): Promise<void> {
  // Проверка флага AUDIT_LOG_ENABLED (глобально или per-branch).
  // Если флаг выключен — полностью пропускаем запись (kill-switch).
  // По умолчанию (флаг отсутствует) — аудит включён (true).
  const effectiveBranchId = branchId ?? user?.branchId ?? null;
  const auditEnabled = await isFeatureEnabled("AUDIT_LOG_ENABLED", effectiveBranchId);
  if (!auditEnabled) {
    return;
  }

  try {
    await prisma.auditLog.create({
      data: {
        actorId: user.id,
        actorRole: user.role,
        actorName: user.displayName,
        action,
        entityType,
        entityId,
        branchId: branchId ?? user.branchId,
        details: details ? JSON.parse(JSON.stringify(details)) : undefined,
      },
    });
  } catch (error) {
    console.error("[AuditLog] Failed to write audit log", {
      action,
      entityType,
      entityId,
      error: String(error),
    });
  }
}

/**
 * Получить логи по филиалу с пагинацией и фильтрами.
 */
export async function getLogsByBranch(
  branchId: string,
  options: AuditLogQueryOptions = {}
): Promise<PaginatedAuditLogs> {
  const { page = 1, pageSize = 20, fromDate, toDate } = options;
  const skip = (page - 1) * pageSize;

  const where: any = { branchId };

  if (fromDate || toDate) {
    where.createdAt = {};
    if (fromDate) where.createdAt.gte = fromDate;
    if (toDate) where.createdAt.lte = toDate;
  }

  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: pageSize,
    }),
    prisma.auditLog.count({ where }),
  ]);

  return {
    logs,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  };
}

/**
 * Получить логи по пользователю (кто совершал действия).
 */
export async function getLogsByUser(
  actorId: string,
  options: AuditLogQueryOptions = {}
): Promise<PaginatedAuditLogs> {
  const { page = 1, pageSize = 20, fromDate, toDate, branchId } = options;
  const skip = (page - 1) * pageSize;

  const where: any = { actorId };

  if (branchId) where.branchId = branchId;
  if (fromDate || toDate) {
    where.createdAt = where.createdAt || {};
    if (fromDate) where.createdAt.gte = fromDate;
    if (toDate) where.createdAt.lte = toDate;
  }

  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: pageSize,
    }),
    prisma.auditLog.count({ where }),
  ]);

  return {
    logs,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  };
}

/**
 * Получить логи по типу действия.
 */
export async function getLogsByAction(
  action: AuditActionType,
  options: AuditLogQueryOptions = {}
): Promise<PaginatedAuditLogs> {
  const { page = 1, pageSize = 20, fromDate, toDate, branchId } = options;
  const skip = (page - 1) * pageSize;

  const where: any = { action };

  if (branchId) where.branchId = branchId;
  if (fromDate || toDate) {
    where.createdAt = where.createdAt || {};
    if (fromDate) where.createdAt.gte = fromDate;
    if (toDate) where.createdAt.lte = toDate;
  }

  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: pageSize,
    }),
    prisma.auditLog.count({ where }),
  ]);

  return {
    logs,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  };
}

/**
 * Универсальный метод для получения логов с гибкими фильтрами.
 * Используется в UI аудита.
 */
export async function getAuditLogs(
  filters: {
    branchId?: string;
    actorId?: string;
    action?: AuditActionType;
    fromDate?: Date;
    toDate?: Date;
  } = {},
  options: { page?: number; pageSize?: number } = {}
): Promise<PaginatedAuditLogs> {
  const { page = 1, pageSize = 25 } = options;
  const skip = (page - 1) * pageSize;

  const where: any = {};

  if (filters.branchId) where.branchId = filters.branchId;
  if (filters.actorId) where.actorId = filters.actorId;
  if (filters.action) where.action = filters.action;

  if (filters.fromDate || filters.toDate) {
    where.createdAt = {};
    if (filters.fromDate) where.createdAt.gte = filters.fromDate;
    if (filters.toDate) where.createdAt.lte = filters.toDate;
  }

  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: pageSize,
    }),
    prisma.auditLog.count({ where }),
  ]);

  return {
    logs,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  };
}
