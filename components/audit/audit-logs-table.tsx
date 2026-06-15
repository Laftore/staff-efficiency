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
import {
  formatAuditEntity,
  formatDetailsEntries,
  formatDetailsPreview,
  getAuditActionLabel,
  getBranchLabel,
  getRoleLabel,
} from "@/lib/audit/labels";

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
  details?: unknown;
}

interface AuditLogsTableProps {
  logs: AuditLog[];
  branchNames: Record<string, string>;
}

function DetailsViewer({
  log,
  branchNames,
}: {
  log: AuditLog;
  branchNames: Record<string, string>;
}) {
  const entries = formatDetailsEntries(log.details);
  const json = log.details
    ? JSON.stringify(log.details, null, 2)
    : "Нет дополнительных данных";

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(json);
    } catch {
      // ignore
    }
  };

  return (
    <div className="space-y-4">
      <div className="rounded-lg border bg-muted/20 p-4 text-sm">
        <p className="font-medium">{getAuditActionLabel(log.action)}</p>
        <p className="mt-1 text-muted-foreground">
          {formatAuditEntity(log)}
          {log.branchId
            ? ` · ${getBranchLabel(log.branchId, branchNames)}`
            : null}
        </p>
      </div>

      {entries.length > 0 ? (
        <dl className="grid gap-3 sm:grid-cols-2">
          {entries.map((entry) => (
            <div key={entry.label} className="rounded-md border px-3 py-2">
              <dt className="text-xs text-muted-foreground">{entry.label}</dt>
              <dd className="mt-0.5 text-sm font-medium">{entry.value}</dd>
            </div>
          ))}
        </dl>
      ) : (
        <p className="text-sm text-muted-foreground">Дополнительных данных нет.</p>
      )}

      <details className="rounded-md border">
        <summary className="cursor-pointer px-3 py-2 text-xs text-muted-foreground">
          Технические данные (JSON)
        </summary>
        <div className="border-t p-3">
          <div className="mb-2 flex justify-end">
            <Button
              variant="outline"
              size="sm"
              onClick={copyToClipboard}
              className="h-7 text-xs"
            >
              Копировать
            </Button>
          </div>
          <pre className="max-h-[280px] overflow-auto rounded-md bg-muted/30 p-3 text-xs leading-relaxed font-mono">
            {json}
          </pre>
        </div>
      </details>
    </div>
  );
}

function AuditDetailsCell({
  log,
  branchNames,
}: {
  log: AuditLog;
  branchNames: Record<string, string>;
}) {
  if (!log.details) {
    return <span className="text-muted-foreground">—</span>;
  }

  const preview = formatDetailsPreview(log.details);

  return (
    <Dialog>
      <DialogTrigger asChild>
        <button
          className="group flex max-w-[280px] items-center gap-1.5 rounded border border-transparent px-2 py-1 text-left text-xs text-muted-foreground transition hover:border-border hover:bg-muted/40 hover:text-foreground"
          title="Посмотреть подробности"
        >
          <Eye className="size-3.5 shrink-0 opacity-60 group-hover:opacity-100" />
          <span className="truncate">{preview}</span>
        </button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Подробности события</DialogTitle>
        </DialogHeader>
        <DetailsViewer log={log} branchNames={branchNames} />
      </DialogContent>
    </Dialog>
  );
}

export function AuditLogsTable({ logs, branchNames }: AuditLogsTableProps) {
  if (logs.length === 0) {
    return (
      <div className="rounded-xl border border-dashed p-8 text-center text-muted-foreground">
        Нет записей по выбранным фильтрам.
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border">
      <table className="w-full text-sm">
        <thead className="bg-muted/40">
          <tr>
            <th className="px-4 py-3 text-left font-medium">Дата и время</th>
            <th className="px-4 py-3 text-left font-medium">Пользователь</th>
            <th className="px-4 py-3 text-left font-medium">Действие</th>
            <th className="px-4 py-3 text-left font-medium">Объект</th>
            <th className="px-4 py-3 text-left font-medium">Филиал</th>
            <th className="w-[280px] px-4 py-3 text-left font-medium">Подробности</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {logs.map((log) => (
            <tr key={log.id} className="hover:bg-muted/30">
              <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">
                {formatDate(log.createdAt)}
              </td>
              <td className="px-4 py-3">
                <div className="font-medium">{log.actorName || "—"}</div>
                <div className="text-xs text-muted-foreground">
                  {getRoleLabel(log.actorRole)}
                </div>
              </td>
              <td className="px-4 py-3">
                <span className="inline-flex items-center rounded-md bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                  {getAuditActionLabel(log.action)}
                </span>
              </td>
              <td className="px-4 py-3 text-muted-foreground">
                {formatAuditEntity(log)}
              </td>
              <td className="px-4 py-3 text-sm">
                {getBranchLabel(log.branchId, branchNames)}
              </td>
              <td className="px-4 py-3">
                <AuditDetailsCell log={log} branchNames={branchNames} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}