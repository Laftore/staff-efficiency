import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import {
  notifyNewShiftCreated,
  notifyBonusNeedsReset,
  notifyBonusWasReset,
} from "@/lib/vk/notifications";

export async function GET(request: NextRequest) {
  const user = await getSessionUser();

  if (!user || user.role !== "OWNER") {
    return NextResponse.json(
      { error: "Доступ разрешён только владельцу (OWNER)" },
      { status: 403 }
    );
  }

  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type");
  const shiftId = searchParams.get("shiftId");

  if (!type) {
    return NextResponse.json({
      usage: "GET /api/vk/test-notification?type=shift_created|bonus_needs_reset|bonus_was_reset&shiftId=xxx",
      availableTypes: ["shift_created", "bonus_needs_reset", "bonus_was_reset"],
    });
  }

  if (!shiftId) {
    return NextResponse.json(
      { error: "Параметр shiftId обязателен для тестовых уведомлений" },
      { status: 400 }
    );
  }

  try {
    let result;

    switch (type) {
      case "shift_created":
        result = await notifyNewShiftCreated(shiftId);
        break;
      case "bonus_needs_reset":
        result = await notifyBonusNeedsReset(shiftId);
        break;
      case "bonus_was_reset":
        result = await notifyBonusWasReset(shiftId);
        break;
      default:
        return NextResponse.json(
          { error: `Неизвестный тип: ${type}` },
          { status: 400 }
        );
    }

    return NextResponse.json({
      success: true,
      type,
      shiftId,
      result,
      message: "Тестовое уведомление отправлено (если у получателей настроен vkChatId)",
    });
  } catch (error) {
    console.error("[VK Test] Ошибка отправки тестового уведомления:", error);
    return NextResponse.json(
      { error: "Не удалось отправить тестовое уведомление", details: String(error) },
      { status: 500 }
    );
  }
}
