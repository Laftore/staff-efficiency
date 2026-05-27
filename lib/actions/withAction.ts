import { AuthorizationError } from "@/lib/auth/authorization";

/**
 * Универсальная обёртка для Server Actions.
 * 
 * Преимущества:
 * - Единообразная обработка AuthorizationError (возвращаем понятное сообщение пользователю)
 * - Логирование неожиданных ошибок на сервере
 * - Снижение дублирования try/catch в каждом Action
 * - Чёткое разделение: клиент получает { data? | error? }, а критичные ошибки логируются
 */
export async function withAction<T>(
  fn: () => Promise<T>
): Promise<{ data?: T; error?: string }> {
  try {
    const result = await fn();
    return { data: result };
  } catch (error) {
    if (error instanceof AuthorizationError) {
      // Это ожидаемая ошибка доступа — отдаём сообщение пользователю
      return { error: error.message };
    }

    // Неожиданная ошибка — логируем и отдаём общее сообщение
    console.error("[Server Action Error]", error);
    return { error: "Произошла непредвиденная ошибка. Попробуйте позже." };
  }
}

/**
 * Вариант обёртки, который позволяет возвращать свои ошибки из Action.
 * Полезно, когда внутри логики есть валидация, которая должна вернуть конкретное сообщение.
 */
export async function withActionSafe<T>(
  fn: () => Promise<{ data?: T; error?: string }>
): Promise<{ data?: T; error?: string }> {
  try {
    return await fn();
  } catch (error) {
    if (error instanceof AuthorizationError) {
      return { error: error.message };
    }

    console.error("[Server Action Error]", error);
    return { error: "Произошла непредвиденная ошибка. Попробуйте позже." };
  }
}
