import { Badge } from "@/components/ui/badge";
import { isSmartshellConfigured } from "@/lib/env";
import { SmartshellSyncStatusForm } from "./smartshell-sync-status-form";

interface SmartshellSyncStatusProps {
  branchIds: string[];
  latestSmartshellSyncAt?: string | null;
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

export function SmartshellSyncStatus({
  branchIds,
  latestSmartshellSyncAt,
}: SmartshellSyncStatusProps) {
  const configured = isSmartshellConfigured();

  return (
    <section className="space-y-4 rounded-3xl border border-violet-500/30 bg-violet-500/10 p-6 shadow-lg shadow-violet-500/10 text-violet-100">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-2">
          <p className="text-sm uppercase tracking-[0.3em] text-violet-200/90">Smartshell</p>
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-sm text-violet-100/80">Последняя синхронизация:</span>
            <Badge variant="secondary" className="bg-violet-600/90 text-violet-100">
              {formatSyncTimestamp(latestSmartshellSyncAt)}
            </Badge>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline" className="border-violet-400/50 bg-violet-950/20 text-violet-100">
            {branchIds.length} филиалов
          </Badge>
          <Badge variant="outline" className="border-violet-400/50 bg-violet-950/20 text-violet-100">
            Ручная синхронизация
          </Badge>
        </div>
      </div>

      {configured ? (
        <SmartshellSyncStatusForm branchIds={branchIds} initialLastSyncedAt={latestSmartshellSyncAt} />
      ) : (
        <div className="rounded-3xl border border-amber-400/30 bg-amber-400/10 p-5 text-sm text-amber-100">
          <p className="font-medium">Smartshell API не настроен.</p>
          <p className="mt-2 text-amber-100/80">
            Установите токен Smartshell в окружении, чтобы активировать ручную синхронизацию и получать актуальные данные.
          </p>
        </div>
      )}
    </section>
  );
}
