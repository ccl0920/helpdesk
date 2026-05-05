import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { loginSchema, type LoginFormData } from '../lib/validation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { LayoutDashboard } from 'lucide-react';

export function LoginPage() {
  const { login, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setError,
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  if (isAuthenticated) {
    navigate('/', { replace: true });
    return null;
  }

  const onSubmit = async (data: LoginFormData) => {
    try {
      await login(data.email, data.password);
      navigate('/');
    } catch (err) {
      setError('root', {
        message: err instanceof Error ? err.message : 'Invalid email or password',
      });
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col justify-center py-12 sm:px-6 lg:px-8 font-body">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center mb-6">
          <div className="flex items-center justify-center size-14 rounded-2xl bg-primary text-primary-foreground shadow-soft">
            <LayoutDashboard className="size-7" />
          </div>
        </div>
        <h1 className="text-center font-heading text-3xl font-bold tracking-tight text-foreground">
          Welcome to Helpdesk
        </h1>
        <h2 className="mt-2 text-center text-base font-medium text-muted-foreground">
          Sign in to manage your support tickets
        </h2>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <Card className="border-0 shadow-soft-lg">
          <CardHeader className="pb-4">
            <CardTitle className="font-heading text-lg">Sign In</CardTitle>
            <CardDescription>Enter your credentials to access your account</CardDescription>
          </CardHeader>
          <CardContent>
            <form className="space-y-5" onSubmit={handleSubmit(onSubmit)} noValidate>
              {errors.root && (
                <Alert variant="destructive">
                  <AlertDescription>{errors.root.message}</AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <Label htmlFor="email">Email address</Label>
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  disabled={isSubmitting}
                  {...register('email')}
                  placeholder="you@example.com"
                  aria-invalid={!!errors.email}
                  aria-describedby={errors.email ? 'email-error' : undefined}
                  className={errors.email ? 'border-coral-300 ring-3 ring-coral-500/15' : ''}
                />
                {errors.email && (
                  <Alert variant="destructive">
                    <AlertDescription id="email-error">{errors.email.message}</AlertDescription>
                  </Alert>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  disabled={isSubmitting}
                  {...register('password')}
                  className={errors.password ? 'border-coral-300 ring-3 ring-coral-500/15' : ''}
                  aria-invalid={!!errors.password}
                  aria-describedby={errors.password ? 'password-error' : undefined}
                />
                {errors.password && (
                  <Alert variant="destructive">
                    <AlertDescription id="password-error">{errors.password.message}</AlertDescription>
                  </Alert>
                )}
              </div>

              <div>
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full"
                  aria-label="Sign in"
                >
                  {isSubmitting ? 'Signing in...' : 'Sign In'}
                </Button>
              </div>
            </form>

            {import.meta.env.DEV && (
              <div className="mt-8">
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-border/60" />
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="bg-card px-3 text-muted-foreground font-medium">
                      Demo credentials
                    </span>
                  </div>
                </div>
                <div className="mt-4 text-sm text-muted-foreground">
                  <p>Use the seeded admin account:</p>
                  <p className="mt-2 font-mono text-xs bg-secondary/60 p-3 rounded-xl">
                    Email: admin@example.com<br />
                    Password: password
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
