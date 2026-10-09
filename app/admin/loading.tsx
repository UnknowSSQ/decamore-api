import { Skeleton } from '@/components/ui/Panel';

export default function AdminLoading() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between">
        <div className="flex flex-col gap-2">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-4 w-48" />
        </div>
        <div className="flex items-center gap-3">
          <Skeleton className="h-9 w-32 rounded-full" />
          <Skeleton className="h-9 w-24 rounded-full" />
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4 max-xl:grid-cols-2 max-sm:grid-cols-1">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-lg border border-line bg-surface p-5">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="mt-3 h-8 w-32" />
            <Skeleton className="mt-2 h-3 w-20" />
            <Skeleton className="mt-2 h-3 w-28" />
          </div>
        ))}
      </div>

      <div className="grid grid-cols-[1.9fr_1fr] gap-4 max-lg:grid-cols-1">
        <div className="rounded-lg border border-line bg-surface p-5">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="mt-2 h-4 w-48" />
          <Skeleton className="mt-4 h-[258px] w-full" />
        </div>
        <div className="rounded-lg border border-line bg-surface p-5">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="mt-2 h-4 w-40" />
          <div className="mt-4 flex items-center gap-6">
            <Skeleton className="h-[168px] w-[168px] rounded-full" />
            <div className="flex flex-col gap-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-4 w-32" />
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-[1.55fr_1fr] gap-4 max-lg:grid-cols-1">
        <div className="rounded-lg border border-line bg-surface p-5">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="mt-2 h-4 w-48" />
          <div className="mt-4 flex flex-col gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-4 w-16" />
                </div>
                <Skeleton className="h-1.5 w-full" />
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-lg border border-line bg-surface p-5">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="mt-2 h-4 w-48" />
          <div className="mt-4 flex flex-col gap-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3">
                <Skeleton className="h-2 w-2 rounded-full" />
                <div className="flex-1">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="mt-1 h-3 w-32" />
                </div>
                <Skeleton className="h-4 w-16" />
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 max-lg:grid-cols-1">
        <div className="rounded-lg border border-line bg-surface p-5">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="mt-2 h-4 w-48" />
          <div className="mt-4 flex flex-col gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-4 w-12" />
                </div>
                <Skeleton className="h-1.5 w-full" />
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-lg border border-line bg-surface p-5">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="mt-2 h-4 w-48" />
          <div className="mt-4 flex flex-col gap-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex gap-3">
                <Skeleton className="h-2 w-2 rounded-full" />
                <div className="flex-1">
                  <Skeleton className="h-4 w-48" />
                  <Skeleton className="mt-1 h-3 w-56" />
                </div>
                <Skeleton className="h-4 w-20" />
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4 max-xl:grid-cols-2 max-sm:grid-cols-1">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-lg border border-line bg-surface p-5 text-center">
            <Skeleton className="mx-auto h-3 w-24" />
            <Skeleton className="mx-auto mt-3 h-8 w-20" />
            <Skeleton className="mx-auto mt-2 h-3 w-16" />
          </div>
        ))}
      </div>

      <Skeleton className="mx-auto h-3 w-64" />
    </div>
  );
}
