import type { VKMessage } from "./types";

const VK_API_VERSION = "5.131";
const VK_BOT_TOKEN = process.env.VK_BOT_TOKEN;

/**
 * Низкоуровневый клиент для работы с VK API.
 * Отвечает только за прямые HTTP-запросы к VK.
 */
export class VKClient {
  /**
   * Отправить сообщение через messages.send
   */
  static async sendMessage(message: VKMessage): Promise<{ message_id: number } | null> {
    if (!VK_BOT_TOKEN || !message.peer_id) {
      console.warn("[VK] Bot not configured or peer_id missing");
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

      const data = (await response.json()) as {
        response?: { message_id: number };
        error?: Record<string, unknown>;
      };

      if (data.error) {
        console.error("[VK] API error:", data.error);
        return null;
      }

      return data.response || null;
    } catch (error) {
      console.error("[VK] Failed to send message:", error);
      return null;
    }
  }
}
