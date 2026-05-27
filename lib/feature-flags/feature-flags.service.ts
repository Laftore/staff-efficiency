import { prisma } from "@/lib/prisma";

const cache = new Map<string, { value: boolean; expiresAt: number }>();
const CACHE_TTL_MS = 30 * 1000; // 30 seconds

export interface FeatureFlag {
  key: string;
  enabled: boolean;
  description?: string | null;
}

/**
 * Проверяет, включён ли feature flag.
 * Поддерживает глобальные флаги и переопределения по филиалу.
 *
 * Приоритет:
 * 1. Специфичный флаг для филиала (если есть)
 * 2. Глобальный флаг (branchId = null)
 * 3. false (по умолчанию)
 */
export async function isFeatureEnabled(
  key: string,
  branchId?: string | null
): Promise<boolean> {
  const cacheKey = branchId ? `${key}:${branchId}` : key;

  // Проверка кэша
  const cached = cache.get(cacheKey);
  if (cached && Date.now() < cached.expiresAt) {
    return cached.value;
  }

  try {
    // Сначала ищем специфичный флаг для филиала
    if (branchId) {
      const branchFlag = await prisma.featureFlag.findUnique({
        where: {
          key_branchId: {
            key,
            branchId,
          },
        },
      });

      if (branchFlag) {
        const value = branchFlag.enabled;
        cache.set(cacheKey, { value, expiresAt: Date.now() + CACHE_TTL_MS });
        return value;
      }
    }

    // Если специфичного нет — берём глобальный
    const globalFlag = await prisma.featureFlag.findFirst({
      where: {
        key,
        branchId: null,
      },
    });

    const value = globalFlag?.enabled ?? false;
    cache.set(cacheKey, { value, expiresAt: Date.now() + CACHE_TTL_MS });
    return value;
  } catch (error) {
    console.error(`[FeatureFlags] Error checking flag "${key}"`, error);
    return false;
  }
}

/**
 * Получить все флаги (для отладки / будущей админки)
 */
export async function getAllFeatureFlags(): Promise<FeatureFlag[]> {
  const flags = await prisma.featureFlag.findMany({
    orderBy: [{ key: "asc" }, { branchId: "asc" }],
  });

  return flags.map((f) => ({
    key: f.key,
    enabled: f.enabled,
    description: f.description,
  }));
}

/**
 * Вспомогательная функция для очистки кэша (полезно в тестах)
 */
export function clearFeatureFlagsCache() {
  cache.clear();
}
