"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import {
  formatAuditEntity,
  formatDetailsPreview,
  getAuditActionLabel,
  getBranchLabel,
  getRoleLabel,
} from "@/lib/audit/labels";

interface AuditLogForExport {
  createdAt: string | Date;
  actorName?: string | null;
  actorRole: string;
  action: string;
  entityType: string;
  entityId: string;
  branchId?: string | null;
  details?: any;
}

interface AuditExportButtonProps {
  logs: AuditLogForExport[];
  branchNames?: Record<string, string>;
  filenamePrefix?: string;
}

function escapeCsvValue(value: unknown): string {
  if (value === null || value === undefined) return "";
  const str = typeof value === "object" ? JSON.stringify(value) : String(value);
  // Экранируем кавычки и переносы строк
  if (/[",\n\r]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function generateCsv(
  logs: AuditLogForExport[],
  branchNames: Record<string, string>,
): string {
  const headers = [
    "Дата",
    "Пользователь",
    "Роль",
    "Действие",
    "Объект",
    "Филиал",
    "Подробности",
  ];

  const rows = logs.map((log) => [
    new Date(log.createdAt).toLocaleString("ru-RU"),
    log.actorName || "",
    getRoleLabel(log.actorRole),
    getAuditActionLabel(log.action),
    formatAuditEntity(log),
    getBranchLabel(log.branchId, branchNames),
    formatDetailsPreview(log.details),
  ]);

  const csvContent = [
    headers.map(escapeCsvValue).join(","),
    ...rows.map((row) => row.map(escapeCsvValue).join(",")),
  ].join("\r\n");

  return csvContent;
}

export function AuditExportButton({
  logs,
  branchNames = {},
  filenamePrefix = "audit-logs",
}: AuditExportButtonProps) {
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = () => {
    if (!logs || logs.length === 0) return;

    setIsExporting(true);

    try {
      const csv = generateCsv(logs, branchNames);
      const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);

      const dateStr = new Date().toISOString().slice(0, 10);
      const filename = `${filenamePrefix}-${dateStr}.csv`;

      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } finally {
      setIsExporting(false);
    }
  };

  const isDisabled = !logs || logs.length === 0;

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleExport}
      disabled={isDisabled || isExporting}
      className="gap-2"
    >
      <Download className="size-4" />
      {isExporting ? "Экспорт..." : "Экспорт CSV (эта страница)"}
    </Button>
  );
}
