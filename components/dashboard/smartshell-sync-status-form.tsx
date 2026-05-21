"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, Clock3, CloudUpload, RotateCcw, ShieldCheck } from "lucide-react";
import { syncSmartshellBranchesAction } from "@/app/actions/smartshell";
import type { SmartshellSyncStatus } from "@/lib/smartshell/types";

interface SmartshellSyncStatusFormProps {
  branchIds: string[];
  initialLastSyncedAt?: string | null;
}

function formatSyncTimestamp(value?: string | null) {
  if (!value) {
    return "никогда";
  }
  return new Intl.DateTimeFormat("ru-RU", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export function SmartshellSyncStatusForm({
  branchIds,
  initialLastSyncedAt,
}: SmartshellSyncStatusFormProps) {
  const [state, formAction, pending] = useActionState(
    async () => {
      const statuses = await syncSmartshellBranchesAction(branchIds);
      return { statuses };
    },
    null,
  );

  const statuses = state?.statuses;
  const succeeded = statuses?.filter((status) => status.success).length ?? 0;
  const failed = statuses?.filter((status) => !status.success).length ?? 0;
  const errors = statuses?.flatMap((status) => status.errors) ?? [];
  const totalSalesCount = statuses?.reduce(
    (total, status) => total + (status.salesCount ?? 0),
    0,
  ) ?? 0;

  const actionLastSyncedAt = statuses
    ?.map((status) => status.lastSyncedAt)
    .filter(Boolean)
    .map((value) => new Date(String(value)))
    .sort((a, b) => b.getTime() - a.getTime())[0];

  const lastSyncedAt = actionLastSyncedAt
    ? actionLastSyncedAt.toISOString()
    : initialLastSyncedAt ?? null;

  const summary = statuses
    ? failed > 0
      ? `Импортировано ${totalSalesCount} продаж • ${statuses.length} смен. Есть ошибки.`
      : `Импортировано ${totalSalesCount} продаж • ${statuses.length} смен.`
    : "Нажмите кнопку, чтобы обновить данные из Smartshell.";

  return (
    <form action={formAction} className="space-y-4">
      <div className="flex flex-col gap-4 rounded-3xl border border-violet-500/30 bg-violet-500/10 p-5 shadow-lg shadow-violet-500/10 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm text-violet-100">
            <Clock3 className="h-4 w-4 text-violet-200" />
            <span>Последняя успешная синхронизация:</span>
            <Badge variant="secondary" className="rounded-full bg-violet-600/90 text-violet-100">
              {formatSyncTimestamp(lastSyncedAt)}
            </Badge>
          </div>
          <p className="text-sm text-violet-100/80">
            {summary}
          </p>
        </div>

        <div className="flex flex-col items-start gap-3 sm:items-end sm:flex-row sm:gap-4">
          <div className="flex items-center gap-2 text-sm text-violet-100">
            <CloudUpload className="h-4 w-4 text-violet-200" />
            <span>{branchIds.length} филиалов готово к синхронизации</span>
          </div>
          <Button
            type="submit"
            variant="secondary"
            className="bg-violet-500 text-white hover:bg-violet-400"
            disabled={pending || branchIds.length === 0}
          >
            {pending ? (
              <>
                <RotateCcw className="h-4 w-4 animate-spin" /> Запуск...
              </>
            ) : (
              "Синхронизировать из Smartshell сейчас"
            )}
          </Button>
        </div>
      </div>

      {statuses ? (
        <div className="rounded-3xl border border-violet-500/30 bg-violet-500/5 p-4 text-sm text-violet-100">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={failed > 0 ? "destructive" : "secondary"}>
              {failed > 0 ? "Синхронизация завершена с ошибками" : "Синхронизация успешна"}
            </Badge>
            <span className="text-violet-100/80">{succeeded} / {statuses.length}</span>
            <span className="text-violet-100/80">Продано товаров: {totalSalesCount}</span>
            {failed > 0 ? <AlertCircle className="h-4 w-4 text-rose-300" /> : <ShieldCheck className="h-4 w-4 text-emerald-300" />}
          </div>
          {errors.length > 0 ? (
            <div className="mt-3 rounded-2xl bg-violet-900/30 p-3 text-xs text-violet-100/90">
              <p className="font-medium">Ошибки:</p>
              <ul className="mt-2 list-disc space-y-1 pl-5">
                {errors.slice(0, 3).map((error, index) => (
                  <li key={index}>{error}</li>
                ))}
                {errors.length > 3 ? <li>...еще {errors.length - 3} сообщений</li> : null}
              </ul>
            </div>
          ) : null}
        </div>
      ) : null}
    </form>
  );
}
