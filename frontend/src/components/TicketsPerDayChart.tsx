import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { BarChart3 } from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

function formatChartDate(dateStr: string): string {
  const [year, month, day] = dateStr.split('-').map(Number);
  const d = new Date(year, month - 1, day);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export interface TicketsPerDayItem {
  date: string;
  count: number;
}

interface TicketsPerDayChartProps {
  data: TicketsPerDayItem[];
  isLoading?: boolean;
}

export function TicketsPerDayChart({ data, isLoading }: TicketsPerDayChartProps) {
  const chartData = data.map((item) => ({
    ...item,
    label: formatChartDate(item.date),
  }));

  return (
    <Card className="border-0 shadow-soft">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-semibold text-muted-foreground font-body uppercase tracking-wide">
          Tickets per Day (Last 30 Days)
        </CardTitle>
        <div className="flex items-center justify-center size-9 rounded-xl bg-teal-50">
          <BarChart3 className="h-4 w-4 text-teal-600" />
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-72 w-full rounded-xl" />
        ) : chartData.length === 0 ? (
          <p className="text-muted-foreground text-sm py-12 text-center font-body">No ticket data available.</p>
        ) : (
          <ResponsiveContainer width="100%" height={320}>
            <BarChart data={chartData} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(150 15% 88%)" vertical={false} />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 12, fontFamily: 'Nunito, sans-serif', fill: '#5b8a6a' }}
                interval="preserveStartEnd"
                angle={-45}
                textAnchor="end"
                height={60}
                axisLine={false}
                tickLine={false}
              />
              <YAxis 
                tick={{ fontSize: 12, fontFamily: 'Nunito, sans-serif', fill: '#5b8a6a' }} 
                allowDecimals={false} 
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                formatter={(value) => [`${value} tickets`, 'Count']}
                labelFormatter={(label) => String(label)}
                contentStyle={{
                  borderRadius: '16px',
                  border: 'none',
                  boxShadow: '0 4px 24px rgba(28, 43, 36, 0.12)',
                  fontFamily: 'Nunito, sans-serif',
                  fontSize: '13px',
                  padding: '12px 16px',
                }}
                cursor={{ fill: 'hsl(150 15% 92% / 0.5)' }}
              />
              <Bar dataKey="count" fill="#0d9488" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
