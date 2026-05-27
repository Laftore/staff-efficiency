"use client";

import { useState } from "react";
import { toast } from "sonner";
import { updateOwnVkChatId } from "@/app/actions/vk";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Send } from "lucide-react";

interface VkBotSettingsProps {
  initialVkChatId?: string | null;
}

export function VkBotSettings({ initialVkChatId }: VkBotSettingsProps) {
  const [value, setValue] = useState(initialVkChatId ?? "");
  const [pending, setPending] = useState(false);

  async function handleSave() {
    setPending(true);
    try {
      const result = await updateOwnVkChatId(value.trim() || null);

      if (result.success) {
        toast.success("VK Chat ID сохранён", {
          description: value ? "Вы будете получать уведомления в этот чат" : "Уведомления отключены",
        });
      } else {
        toast.error("Ошибка сохранения", {
          description: result.error || "Неизвестная ошибка",
        });
      }
    } finally {
      setPending(false);
    }
  }

  return (
    <Card className="border-violet-500/30">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Send className="h-5 w-5 text-violet-400" />
          VK Bot Уведомления
        </CardTitle>
        <CardDescription>
          Укажите свой VK Chat ID (peer_id), чтобы получать уведомления о сменах и бонусах.
          OWNER получает уведомления по всем филиалам.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="vkChatId">VK Chat ID (peer_id)</Label>
          <Input
            id="vkChatId"
            type="text"
            placeholder="Например: 123456789"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            disabled={pending}
            className="font-mono"
          />
          <p className="text-xs text-muted-foreground">
            Чтобы узнать свой ID, напишите боту команду <code>/myid</code> или используйте любой VK бот для получения peer_id.
          </p>
        </div>

        <div className="flex gap-2">
          <Button onClick={handleSave} disabled={pending} className="gap-2">
            <Send className="h-4 w-4" />
            {pending ? "Сохранение..." : "Сохранить"}
          </Button>
          {value && (
            <Button
              variant="outline"
              onClick={() => setValue("")}
              disabled={pending}
            >
              Очистить
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
