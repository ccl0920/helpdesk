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
        'text-left hover:underline cursor-pointer bg-transparent border-0 p-0',
        className
      )}
    >
      {children}
    </button>
  );
}
