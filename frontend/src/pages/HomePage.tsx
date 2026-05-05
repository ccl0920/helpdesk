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
    <div className="space-y-8">
      <div className="animate-fade-up">
        <h1 className="font-heading text-3xl font-bold tracking-tight text-foreground">
          Dashboard
        </h1>
        <p className="mt-1 text-muted-foreground font-body">
          Welcome back, <span className="font-semibold text-foreground">{user?.email}</span>
        </p>
      </div>

      {error && (
        <ErrorMessage message="Failed to load dashboard stats. Please try again." />
      )}

      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard
          title="Total Tickets"
          value={stats?.total}
          isLoading={isLoading}
          icon={<Ticket className="h-5 w-5 text-teal-600" />}
          tint="bg-teal-50"
          delay="animate-fade-up-delay-1"
        />
        <StatCard
          title="Open Tickets"
          value={stats?.open}
          isLoading={isLoading}
          icon={<TicketCheck className="h-5 w-5 text-sage-600" />}
          tint="bg-sage-100"
          delay="animate-fade-up-delay-2"
        />
        <StatCard
          title="Resolved by AI"
          value={stats?.aiResolved}
          isLoading={isLoading}
          icon={<Bot className="h-5 w-5 text-coral-500" />}
          tint="bg-coral-50"
          delay="animate-fade-up-delay-3"
        />
        <StatCard
          title="% Resolved by AI"
          value={stats?.percentAiResolved !== undefined ? `${stats.percentAiResolved}%` : undefined}
          isLoading={isLoading}
          icon={<Percent className="h-5 w-5 text-teal-600" />}
          tint="bg-teal-50"
          delay="animate-fade-up-delay-4"
        />
        <StatCard
          title="Avg. Resolution Time"
          value={
            stats?.avgResolutionTimeHours !== null && stats?.avgResolutionTimeHours !== undefined
              ? `${stats.avgResolutionTimeHours}h`
              : 'N/A'
          }
          isLoading={isLoading}
          icon={<Clock className="h-5 w-5 text-sage-600" />}
          tint="bg-sage-100"
          delay="animate-fade-up-delay-5"
        />
      </div>

      <div className="animate-fade-up animate-fade-up-delay-3">
        <TicketsPerDayChart
          data={stats?.ticketsPerDay ?? []}
          isLoading={isLoading}
        />
      </div>
    </div>
  );
}

interface StatCardProps {
  title: string;
  value: number | string | undefined;
  isLoading: boolean;
  icon: React.ReactNode;
  tint: string;
  delay: string;
}

function StatCard({ title, value, isLoading, icon, tint, delay }: StatCardProps) {
  return (
    <Card className={`animate-fade-up ${delay} border-0 shadow-soft hover:shadow-lift hover:-translate-y-0.5 transition-all duration-300`}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
        <CardTitle className="text-sm font-semibold text-muted-foreground font-body uppercase tracking-wide">{title}</CardTitle>
        <div className={`flex items-center justify-center size-10 rounded-xl ${tint}`}>
          {icon}
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-9 w-24 rounded-lg" />
        ) : (
          <div className="font-heading text-3xl font-bold text-foreground">{value ?? 0}</div>
        )}
      </CardContent>
    </Card>
  );
}
