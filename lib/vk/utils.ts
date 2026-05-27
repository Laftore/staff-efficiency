import { createHmac } from "crypto";

/**
 * Проверяет подпись запроса от VK Callback API.
 * 
 * VK отправляет заголовок X-VK-Signature, который является HMAC-SHA256
 * от raw-тела запроса с использованием VK_SECRET.
 */
export function verifyVkSignature(rawBody: string, signature: string): boolean {
  const secret = process.env.VK_SECRET;
  
  if (!secret) {
    console.warn("[VK] VK_SECRET не задан — пропускаем проверку подписи");
    return true;
  }

  if (!signature) {
    console.warn("[VK] Отсутствует заголовок X-VK-Signature");
    return false;
  }

  try {
    // VK использует hex-дайджест HMAC-SHA256(rawBody, secret)
    const hash = createHmac("sha256", secret)
      .update(rawBody, "utf8")
      .digest("hex");

    // VK иногда присылает с префиксом "sha256=", иногда без
    const receivedSignature = signature.startsWith("sha256=") 
      ? signature.slice(7) 
      : signature;

    return hash === receivedSignature;
  } catch (error) {
    console.error("[VK] Ошибка при проверке подписи:", error);
    return false;
  }
}

/**
 * @deprecated Используйте verifyVkSignature из utils.ts
 * Оставлено для обратной совместимости.
 */
export function verifySignature(body: string, signature: string): boolean {
  return verifyVkSignature(body, signature);
}
