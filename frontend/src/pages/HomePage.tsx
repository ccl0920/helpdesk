import { useAuth } from '../hooks/useAuth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export function HomePage() {
  const { user } = useAuth();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Welcome to Helpdesk</CardTitle>
        <CardDescription>
          You are signed in as <span className="font-medium text-foreground">{user?.email}</span>
        </CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground">
          This is your dashboard. Ticket management features coming soon.
        </p>
      </CardContent>
    </Card>
  );
}
