import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';

interface LinkButtonProps {
  to: string;
  children: React.ReactNode;
  className?: string;
}

/**
 * A button that looks like a link and navigates to a route.
 * Use this for clickable elements that should navigate (like table cells).
 */
export function LinkButton({ to, children, className }: LinkButtonProps) {
  const navigate = useNavigate();

  return (
    <button
      onClick={() => navigate(to)}
      className={cn(
        'text-left font-medium text-foreground hover:text-primary hover:underline cursor-pointer bg-transparent border-0 p-0 transition-colors duration-200',
        className
      )}
    >
      {children}
    </button>
  );
}
