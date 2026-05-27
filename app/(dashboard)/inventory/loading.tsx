import { Skeleton } from "@/components/ui/skeleton";

export default function InventoryLoading() {
  return (
    <div className="space-y-6 p-6">
      <div className="mb-2 space-y-2">
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-4 w-96" />
      </div>

      {/* Sync status */}
      <Skeleton className="h-28 w-full rounded-3xl" />

      {/* Warning / info skeleton */}
      <Skeleton className="h-12 w-full rounded-xl" />

      {/* Shift selector */}
      <div className="max-w-xl space-y-2">
        <Skeleton className="h-4 w-16" />
        <Skeleton className="h-10 w-full max-w-md" />
      </div>

      {/* Big table skeleton */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex gap-3">
            <Skeleton className="h-6 w-28" />
            <Skeleton className="h-6 w-36" />
          </div>
          <Skeleton className="h-9 w-52 rounded-lg" />
        </div>

        <div className="overflow-hidden rounded-xl border border-border/60">
          <div className="bg-muted/30 p-3">
            <div className="flex gap-3">
              {Array.from({ length: 9 }).map((_, i) => (
                <Skeleton key={i} className="h-4 flex-1" />
              ))}
            </div>
          </div>
          <div className="divide-y divide-border/60">
            {Array.from({ length: 10 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 p-3.5">
                {Array.from({ length: 9 }).map((_, j) => (
                  <Skeleton key={j} className="h-7 flex-1" />
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
