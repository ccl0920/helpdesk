import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ShieldAlert, Home, LogOut } from 'lucide-react';

export function AccessDeniedPage() {
  const navigate = useNavigate();
  const { logout } = useAuth();

  const handleSignOut = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4 font-body">
      <Card className="w-full max-w-md border-0 shadow-soft-lg">
        <CardHeader className="text-center pb-4">
          <div className="flex justify-center mb-4">
            <div className="flex items-center justify-center size-14 rounded-2xl bg-coral-100 text-coral-600">
              <ShieldAlert className="size-7" />
            </div>
          </div>
          <CardTitle className="font-heading text-2xl">Access Denied</CardTitle>
          <CardDescription>
            You don't have permission to access this page
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground mb-6 text-center leading-relaxed">
            Your account role does not have access to this resource. Please contact an administrator if you believe this is an error.
          </p>
          <div className="flex gap-3">
            <Button variant="outline" className="flex-1 gap-2 rounded-full border-border/80" onClick={() => navigate('/')}>
              <Home className="size-4" />
              Go Home
            </Button>
            <Button variant="destructive" className="flex-1 gap-2" onClick={handleSignOut}>
              <LogOut className="size-4" />
              Sign Out
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
