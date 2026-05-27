"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";

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

function generateCsv(logs: AuditLogForExport[]): string {
  const headers = [
    "Дата",
    "Пользователь",
    "Роль",
    "Действие",
    "Тип объекта",
    "ID объекта",
    "Филиал",
    "Детали (JSON)",
  ];

  const rows = logs.map((log) => [
    new Date(log.createdAt).toISOString(),
    log.actorName || "",
    log.actorRole,
    log.action,
    log.entityType,
    log.entityId,
    log.branchId || "",
    log.details ? JSON.stringify(log.details) : "",
  ]);

  const csvContent = [
    headers.map(escapeCsvValue).join(","),
    ...rows.map((row) => row.map(escapeCsvValue).join(",")),
  ].join("\r\n");

  return csvContent;
}

export function AuditExportButton({
  logs,
  filenamePrefix = "audit-logs",
}: AuditExportButtonProps) {
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = () => {
    if (!logs || logs.length === 0) return;

    setIsExporting(true);

    try {
      const csv = generateCsv(logs);
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
