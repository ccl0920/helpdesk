import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { Button } from '@/components/ui/button';

interface NavBarProps {
  showAuth?: boolean;
}

export function NavBar({ showAuth = true }: NavBarProps) {
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <header className="bg-card border-b">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between">
          <Link to="/" className="text-3xl font-bold tracking-tight text-foreground">
            Helpdesk
          </Link>
          {showAuth && (
            <div className="flex items-center gap-4">
              {isAuthenticated ? (
                <>
                  {user?.name && (
                    <span className="text-muted-foreground">Hello, {user.name}</span>
                  )}
                  <Button
                    onClick={handleSignOut}
                    variant="outline"
                  >
                    Sign Out
                  </Button>
                </>
              ) : (
                <Link to="/login">
                  <Button>Sign In</Button>
                </Link>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
