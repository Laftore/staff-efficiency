import { VKBotService } from "@/lib/vk";
import type { NextRequest } from "next/server";

const VK_CONFIRMATION_TOKEN = process.env.VK_CONFIRMATION_TOKEN;
const VK_SECRET = process.env.VK_SECRET;

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
 * POST handler for VK webhook events
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Verify signature (optional but recommended)
    const signature = request.headers.get("X-VK-Signature") || "";
    if (VK_SECRET && !VKBotService.verifySignature(JSON.stringify(body), signature)) {
      console.warn("Invalid VK signature");
      return new Response("Invalid signature", { status: 403 });
    }

    const { type, object, group_id, event_id } = body;

    // Handle different event types
    switch (type) {
      case "confirmation":
        return new Response(VK_CONFIRMATION_TOKEN || "OK", { status: 200 });

      case "message_new":
        await handleMessageNew(object);
        break;

      case "message_reply":
        await handleMessageReply(object);
        break;

      case "group_join":
        console.log("User joined group:", object);
        break;

      default:
        console.log("Unhandled event type:", type);
    }

    // Always return OK to acknowledge receipt
    return new Response("OK", { status: 200 });
  } catch (error) {
    console.error("VK webhook error:", error);
    return new Response("Internal Server Error", { status: 500 });
  }
}

/**
 * Handle incoming messages
 */
async function handleMessageNew(message: Record<string, unknown>) {
  console.log("New message from VK:", {
    from_id: message.from_id,
    text: message.text,
    peer_id: message.peer_id,
  });

  // Example: Echo message back
  const text = String(message.text || "");
  const fromId = Number(message.from_id || 0);
  const peerId = Number(message.peer_id || fromId);

  if (text.toLowerCase().includes("hello")) {
    const response = await VKBotService.sendMessage({
      peer_id: peerId,
      message: "Привет! 👋 Это bot уведомлений для StaffEfficiency.",
    });

    if (response) {
      console.log("Message sent successfully:", response.message_id);
    }
  }

  // Parse commands if needed
  if (text.startsWith("/")) {
    await handleCommand(text, peerId);
  }
}

/**
 * Handle message replies (reactions, etc.)
 */
async function handleMessageReply(reply: Record<string, unknown>) {
  console.log("Message reply:", reply);
}

/**
 * Handle bot commands
 */
async function handleCommand(command: string, peerId: number) {
  const cmd = command.toLowerCase().split(" ")[0];

  switch (cmd) {
    case "/help":
      await VKBotService.sendMessage({
        peer_id: peerId,
        message: `📖 Доступные команды:\n/help - эта справка\n/status - статус уведомлений`,
      });
      break;

    case "/status":
      await VKBotService.sendMessage({
        peer_id: peerId,
        message: "✅ Уведомления активны. Вы будете получать:\n- Уведомления о новых сменах\n- Расчёты бонусов\n- Ежедневные отчёты",
      });
      break;

    default:
      await VKBotService.sendMessage({
        peer_id: peerId,
        message: "❓ Неизвестная команда. Напишите /help для справки.",
      });
  }
}
