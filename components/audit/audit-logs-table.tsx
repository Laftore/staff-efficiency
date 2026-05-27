"use client";

import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Eye } from "lucide-react";

// Используем нативное форматирование, чтобы не добавлять зависимость date-fns
function formatDate(dateInput: string | Date): string {
  const date = new Date(dateInput);
  return date.toLocaleDateString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

interface AuditLog {
  id: string;
  createdAt: string | Date;
  actorName?: string | null;
  actorRole: string;
  action: string;
  entityType: string;
  entityId: string;
  branchId?: string | null;
  details?: any;
}

interface AuditLogsTableProps {
  logs: AuditLog[];
}

/**
 * Компактный предпросмотр details (1-2 ключа или счётчик)
 */
function getDetailsPreview(details: any): string {
  if (!details || typeof details !== "object") {
    return String(details ?? "—");
  }

  const keys = Object.keys(details);
  if (keys.length === 0) return "{}";

  // Специальные красивые случаи
  if ("previousBonus" in details && "newBonus" in details) {
    return `${details.previousBonus} → ${details.newBonus}`;
  }
  if ("newRole" in details && "previousRole" in details) {
    return `${details.previousRole} → ${details.newRole}`;
  }
  if (keys.length === 1) {
    const k = keys[0];
    const v = details[k];
    return `${k}: ${typeof v === "object" ? "..." : String(v)}`;
  }

  return `${keys.length} полей: ${keys.slice(0, 2).join(", ")}${keys.length > 2 ? "…" : ""}`;
}

/**
 * Красивый JSON-viewer внутри диалога
 */
function DetailsViewer({ log }: { log: AuditLog }) {
  const json = log.details
    ? JSON.stringify(log.details, null, 2)
    : "Нет дополнительных данных";

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(json);
    } catch {
      // silently ignore (старые браузеры)
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          {log.action} • {log.entityType} #{log.entityId.slice(0, 8)}
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={copyToClipboard}
          className="h-7 text-xs"
        >
          Копировать JSON
        </Button>
      </div>

      <pre className="max-h-[420px] overflow-auto rounded-md border bg-muted/30 p-4 text-xs leading-relaxed font-mono">
        {json}
      </pre>
    </div>
  );
}

/**
 * Ячейка с деталями: компактный превью + кнопка открытия модального JSON viewer
 */
function AuditDetailsCell({ log }: { log: AuditLog }) {
  if (!log.details) {
    return <span className="text-muted-foreground">—</span>;
  }

  const preview = getDetailsPreview(log.details);

  return (
    <Dialog>
      <DialogTrigger asChild>
        <button
          className="group flex max-w-[260px] items-center gap-1.5 rounded border border-transparent px-2 py-1 text-left text-xs text-muted-foreground transition hover:border-border hover:bg-muted/40 hover:text-foreground"
          title="Нажмите, чтобы посмотреть полные детали"
        >
          <Eye className="size-3.5 opacity-60 group-hover:opacity-100" />
          <span className="truncate">{preview}</span>
        </button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Детали события</DialogTitle>
        </DialogHeader>
        <DetailsViewer log={log} />
      </DialogContent>
    </Dialog>
  );
}

export function AuditLogsTable({ logs }: AuditLogsTableProps) {
  if (logs.length === 0) {
    return (
      <div className="rounded-xl border border-dashed p-8 text-center text-muted-foreground">
        Нет записей по выбранным фильтрам.
      </div>
    );
  }

  return (
    <div className="rounded-xl border overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-muted/40">
          <tr>
            <th className="text-left px-4 py-3 font-medium">Дата / Время</th>
            <th className="text-left px-4 py-3 font-medium">Пользователь</th>
            <th className="text-left px-4 py-3 font-medium">Действие</th>
            <th className="text-left px-4 py-3 font-medium">Объект</th>
            <th className="text-left px-4 py-3 font-medium">Филиал</th>
            <th className="text-left px-4 py-3 font-medium w-[280px]">Детали</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {logs.map((log) => (
            <tr key={log.id} className="hover:bg-muted/30">
              <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                {formatDate(log.createdAt)}
              </td>
              <td className="px-4 py-3">
                <div className="font-medium">{log.actorName || "—"}</div>
                <div className="text-xs text-muted-foreground">{log.actorRole}</div>
              </td>
              <td className="px-4 py-3">
                <span className="inline-flex items-center rounded-md bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                  {log.action}
                </span>
              </td>
              <td className="px-4 py-3 text-muted-foreground">
                {log.entityType} <span className="text-xs">#{log.entityId.slice(0, 8)}</span>
              </td>
              <td className="px-4 py-3 text-muted-foreground text-xs">
                {log.branchId ? log.branchId.slice(0, 8) : "—"}
              </td>
              <td className="px-4 py-3">
                <AuditDetailsCell log={log} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
