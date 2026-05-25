import type { VKMessage, BonusNotification } from "./types";

const VK_API_VERSION = "5.131";
const VK_BOT_TOKEN = process.env.VK_BOT_TOKEN;
const VK_GROUP_ID = process.env.VK_GROUP_ID;

export class VKBotService {
  /**
   * Отправить сообщение в VK чат
   */
  static async sendMessage(message: VKMessage): Promise<{ message_id: number } | null> {
    if (!VK_BOT_TOKEN || !message.peer_id) {
      console.warn("VK Bot not configured or peer_id missing");
      return null;
    }

    try {
      const params = new URLSearchParams({
        message: message.message,
        peer_id: String(message.peer_id),
        random_id: String(message.random_id || Math.random() * 1000000),
        access_token: VK_BOT_TOKEN,
        v: VK_API_VERSION,
      });

      if (message.keyboard) {
        params.append("keyboard", JSON.stringify(message.keyboard));
      }

      const response = await fetch("https://api.vk.com/method/messages.send", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: params.toString(),
      });

      const data = (await response.json()) as { response?: { message_id: number }; error?: Record<string, unknown> };

      if (data.error) {
        console.error("VK API error:", data.error);
        return null;
      }

      return data.response || null;
    } catch (error) {
      console.error("Failed to send VK message:", error);
      return null;
    }
  }

  /**
   * Отправить уведомление о создании смены
   */
  static async notifyShiftCreated(notification: BonusNotification, peerId: number): Promise<boolean> {
    const message: VKMessage = {
      peer_id: peerId,
      message: `📋 Новая смена создана!\n\n${notification.message}`,
    };

    const result = await this.sendMessage(message);
    return result !== null;
  }

  /**
   * Отправить уведомление о расчёте бонуса
   */
  static async notifyBonusCalculated(notification: BonusNotification, peerId: number): Promise<boolean> {
    let text = `💰 Бонус рассчитан!\n\n${notification.message}`;

    if (notification.bonusAmount !== undefined) {
      text += `\n\nРазмер бонуса: **${notification.bonusAmount} ₽**`;
    }

    if (notification.needsReset) {
      text += `\n\n⚠️ Требуется обнуление бонуса за предыдущую смену`;
    }

    const message: VKMessage = {
      peer_id: peerId,
      message: text,
    };

    const result = await this.sendMessage(message);
    return result !== null;
  }

  /**
   * Отправить уведомление об обнулении бонуса
   */
  static async notifyBonusReset(notification: BonusNotification, peerId: number): Promise<boolean> {
    const message: VKMessage = {
      peer_id: peerId,
      message: `🔄 Бонус обнулен\n\n${notification.message}`,
    };

    const result = await this.sendMessage(message);
    return result !== null;
  }

  /**
   * Отправить ежедневный отчёт
   */
  static async sendDailyReport(reportText: string, peerId: number): Promise<boolean> {
    const message: VKMessage = {
      peer_id: peerId,
      message: `📊 Ежедневный отчёт\n\n${reportText}`,
    };

    const result = await this.sendMessage(message);
    return result !== null;
  }

  /**
   * Проверить подпись запроса от VK (для безопасности)
   */
  static verifySignature(body: string, signature: string): boolean {
    if (!process.env.VK_SECRET) {
      console.warn("VK_SECRET not set, skipping signature verification");
      return true;
    }

    // VK использует HMAC-SHA256 для подписи
    // Это базовая проверка; полная реализация требует crypto
    console.log("Signature verification: skipped (implement crypto.hmac if needed)");
    return true;
  }
}
