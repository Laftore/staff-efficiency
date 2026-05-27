import { VKBotService, verifyVkSignature } from "@/lib/vk";
import type { NextRequest } from "next/server";

const VK_CONFIRMATION_TOKEN = process.env.VK_CONFIRMATION_TOKEN;

/**
 * GET handler for VK webhook verification
 * VK sends a confirmation request with action=confirmation
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get("action");

  if (action === "confirmation") {
    if (!VK_CONFIRMATION_TOKEN) {
      return new Response("VK_CONFIRMATION_TOKEN not configured", { status: 400 });
    }
    return new Response(VK_CONFIRMATION_TOKEN, { status: 200 });
  }

  return new Response("OK", { status: 200 });
}

/**
 * POST handler for VK webhook events.
 * 
 * Важно: для корректной проверки подписи мы сначала читаем raw body как текст,
 * затем парсим JSON. Это критично для HMAC.
 */
export async function POST(request: NextRequest) {
  try {
    // Читаем сырое тело для проверки подписи
    const rawBody = await request.text();

    // Проверяем подпись VK (HMAC-SHA256)
    const signature = request.headers.get("X-VK-Signature") || "";
    if (!verifyVkSignature(rawBody, signature)) {
      console.warn("[VK Webhook] Неверная подпись запроса");
      return new Response("Invalid signature", { status: 403 });
    }

    // Парсим тело
    const body = JSON.parse(rawBody);

    const { type, object, group_id, event_id } = body;

    console.log("[VK Webhook] Получено событие:", { 
      type, 
      event_id, 
      group_id 
    });

    // Обработка разных типов событий
    switch (type) {
      case "confirmation":
        console.log("[VK Webhook] Запрос подтверждения");
        return new Response(VK_CONFIRMATION_TOKEN || "OK", { status: 200 });

      case "message_new":
        await handleMessageNew(object);
        break;

      case "message_reply":
        await handleMessageReply(object);
        break;

      case "group_join":
        console.log("[VK Webhook] Пользователь вступил в группу:", object);
        break;

      default:
        console.log("[VK Webhook] Необработанный тип события:", type);
    }

    // VK требует ответ "OK" в любом случае
    return new Response("OK", { status: 200 });
  } catch (error) {
    console.error("[VK Webhook] Критическая ошибка обработки:", error);
    return new Response("Internal Server Error", { status: 500 });
  }
}

/**
 * Обработка нового входящего сообщения
 */
async function handleMessageNew(message: Record<string, unknown>) {
  const text = String(message.text || "").trim();
  const peerId = Number(message.peer_id || message.from_id || 0);

  console.log("[VK Webhook] Новое сообщение:", {
    from_id: message.from_id,
    peer_id: peerId,
    text: text.substring(0, 100), // обрезаем для логов
  });

  // Улучшенная реакция на приветствие
  if (text.toLowerCase().match(/^(привет|hello|hi|здравствуй|добрый)/)) {
    await VKBotService.sendMessage({
      peer_id: peerId,
      message: "Привет! 👋 Я бот уведомлений StaffEfficiency.\n\nНапиши /help, чтобы увидеть команды.\nЧтобы узнать свой Chat ID для настройки уведомлений — используй /myid.",
    });
  }

  // Обработка команд
  if (text.startsWith("/")) {
    await handleCommand(text, peerId);
  }
}

/**
 * Обработка ответов на сообщения (пока просто логируем)
 */
async function handleMessageReply(reply: Record<string, unknown>) {
  console.log("[VK Webhook] Ответ на сообщение:", reply);
}

/**
 * Обработка команд бота
 */
async function handleCommand(command: string, peerId: number) {
  const cmd = command.toLowerCase().split(" ")[0];
  console.log("[VK Webhook] Выполняется команда:", cmd);

  switch (cmd) {
    case "/help":
      await VKBotService.sendMessage({
        peer_id: peerId,
        message: [
          "📖 Доступные команды:",
          "",
          "/help — эта справка",
          "/status — статус уведомлений",
          "/myid — показать твой VK Chat ID (peer_id)",
          "",
          "Бот автоматически присылает:",
          "• Уведомления о новых сменах",
          "• Предупреждения, когда бонус требует обнуления (Q < 0)",
          "• Уведомления об обнулении бонуса",
        ].join("\n"),
      });
      break;

    case "/status":
      await VKBotService.sendMessage({
        peer_id: peerId,
        message: [
          "✅ Уведомления VK Bot активны.",
          "",
          "Вы получаете:",
          "• Уведомления о создании новых смен",
          "• Предупреждения при needsReset (Q < 0)",
          "• Уведомления об обнулении бонуса",
          "",
          "Ежедневные отчёты — в разработке.",
          "",
          "Чтобы настроить получение уведомлений — зайдите в раздел «Филиалы» (доступно только владельцу).",
        ].join("\n"),
      });
      break;

    case "/myid":
      await VKBotService.sendMessage({
        peer_id: peerId,
        message: `Ваш VK Chat ID (peer_id): \`${peerId}\`\n\nСкопируйте это число и укажите его в настройках VK Bot на странице «Филиалы».`,
      });
      break;

    default:
      await VKBotService.sendMessage({
        peer_id: peerId,
        message: "❓ Неизвестная команда.\nНапишите /help для списка доступных команд.",
      });
  }
}
