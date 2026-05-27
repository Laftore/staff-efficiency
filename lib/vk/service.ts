import type { VKMessage, BonusNotification } from "./types";
import { VKClient } from "./client";
import { verifyVkSignature, verifySignature } from "./utils";

const VK_GROUP_ID = process.env.VK_GROUP_ID;

/**
 * Сервис для отправки сообщений через VK.
 * Является транспортным слоем. Для бизнес-уведомлений используйте notifications.ts
 */
export class VKBotService {
  /**
   * Отправить сообщение в VK чат.
   * Делегирует работу в VKClient.
   */
  static async sendMessage(message: VKMessage): Promise<{ message_id: number } | null> {
    return VKClient.sendMessage(message);
  }

  /**
   * @deprecated Используйте notifyNewShiftCreated из notifications.ts
   * Отправить уведомление о создании смены (устаревший метод)
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
   * @deprecated Используйте notifyBonusNeedsReset из notifications.ts
   * Отправить уведомление о расчёте бонуса (устаревший метод)
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
   * @deprecated Используйте notifyBonusWasReset из notifications.ts
   * Отправить уведомление об обнулении бонуса (устаревший метод)
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
   * Проверить подпись запроса от VK (для безопасности).
   * Делегирует в verifyVkSignature из utils.ts
   * @deprecated Рекомендуется использовать verifyVkSignature напрямую из @/lib/vk/utils
   */
  static verifySignature(body: string, signature: string): boolean {
    return verifyVkSignature(body, signature);
  }
}
