import { useQuery } from '@tanstack/react-query';
import { fetchDashboardStats } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ErrorMessage } from '@/components/ui/error-message';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '../hooks/useAuth';
import { TicketsPerDayChart } from '@/components/TicketsPerDayChart';
import {
  Ticket,
  TicketCheck,
  Bot,
  Percent,
  Clock,
} from 'lucide-react';

export function HomePage() {
  const { user } = useAuth();
  const { data: stats, isLoading, error } = useQuery({
    queryKey: ['dashboardStats'],
    queryFn: fetchDashboardStats,
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">
          Welcome back, <span className="font-medium text-foreground">{user?.email}</span>
        </p>
      </div>

      {error && (
        <ErrorMessage message="Failed to load dashboard stats. Please try again." />
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard
          title="Total Tickets"
          value={stats?.total}
          isLoading={isLoading}
          icon={<Ticket className="h-4 w-4 text-muted-foreground" />}
        />
        <StatCard
          title="Open Tickets"
          value={stats?.open}
          isLoading={isLoading}
          icon={<TicketCheck className="h-4 w-4 text-muted-foreground" />}
        />
        <StatCard
          title="Resolved by AI"
          value={stats?.aiResolved}
          isLoading={isLoading}
          icon={<Bot className="h-4 w-4 text-muted-foreground" />}
        />
        <StatCard
          title="% Resolved by AI"
          value={stats?.percentAiResolved !== undefined ? `${stats.percentAiResolved}%` : undefined}
          isLoading={isLoading}
          icon={<Percent className="h-4 w-4 text-muted-foreground" />}
        />
        <StatCard
          title="Avg. Resolution Time"
          value={
            stats?.avgResolutionTimeHours !== null && stats?.avgResolutionTimeHours !== undefined
              ? `${stats.avgResolutionTimeHours}h`
              : 'N/A'
          }
          isLoading={isLoading}
          icon={<Clock className="h-4 w-4 text-muted-foreground" />}
        />
      </div>

      <TicketsPerDayChart
        data={stats?.ticketsPerDay ?? []}
        isLoading={isLoading}
      />
    </div>
  );
}

interface StatCardProps {
  title: string;
  value: number | string | undefined;
  isLoading: boolean;
  icon: React.ReactNode;
}

function StatCard({ title, value, isLoading, icon }: StatCardProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-8 w-20" />
        ) : (
          <div className="text-2xl font-bold">{value ?? 0}</div>
        )}
      </CardContent>
    </Card>
  );
}
