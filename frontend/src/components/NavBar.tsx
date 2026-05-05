import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Ticket, Users, LogOut, LayoutDashboard } from 'lucide-react';

interface NavBarProps {
  showAuth?: boolean;
}

export function NavBar({ showAuth = true }: NavBarProps) {
  const { user, isAuthenticated, isAdmin, logout } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <header className="sticky top-0 z-40 bg-card/80 backdrop-blur-xl border-b border-border/40 shadow-soft">
      <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5 group">
            <div className="flex items-center justify-center size-9 rounded-xl bg-primary text-primary-foreground shadow-soft transition-transform duration-200 group-hover:scale-105">
              <LayoutDashboard className="size-5" />
            </div>
            <span className="font-heading text-xl font-bold tracking-tight text-foreground">
              Helpdesk
            </span>
          </Link>
          {showAuth && (
            <div className="flex items-center gap-3">
              {isAuthenticated && (
                <Link to="/tickets">
                  <Button variant="ghost" size="sm" className="gap-2 rounded-full">
                    <Ticket className="size-4" />
                    <span className="hidden sm:inline">Tickets</span>
                  </Button>
                </Link>
              )}
              {isAuthenticated && isAdmin && (
                <Link to="/users">
                  <Button variant="ghost" size="sm" className="gap-2 rounded-full">
                    <Users className="size-4" />
                    <span className="hidden sm:inline">Users</span>
                  </Button>
                </Link>
              )}
              {isAuthenticated ? (
                <div className="flex items-center gap-3 pl-3 border-l border-border/60">
                  {user?.name && (
                    <span className="hidden md:inline text-sm text-muted-foreground font-medium">
                      {user.name}
                    </span>
                  )}
                  <Button
                    onClick={handleSignOut}
                    variant="outline"
                    size="sm"
                    className="gap-2 rounded-full border-border/80"
                  >
                    <LogOut className="size-4" />
                    <span className="hidden sm:inline">Sign Out</span>
                  </Button>
                </div>
              ) : (
                <Link to="/login">
                  <Button size="sm" className="rounded-full">Sign In</Button>
                </Link>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
