import { Skeleton } from '@/components/ui/skeleton';

export function TicketDetailSkeleton() {
  return (
    <div className="space-y-8 animate-fade-up">
      <div className="space-y-2">
        <Skeleton className="h-8 w-32 rounded-lg" />
        <Skeleton className="h-10 w-64 rounded-xl" />
      </div>
      <div className="space-y-4">
        <Skeleton className="h-48 w-full rounded-2xl" />
        <Skeleton className="h-32 w-full rounded-2xl" />
        <Skeleton className="h-64 w-full rounded-2xl" />
      </div>
    </div>
  );
}
