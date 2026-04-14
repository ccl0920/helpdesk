import { AlertCircle } from 'lucide-react';

interface ErrorMessageProps {
  message: string;
  className?: string;
}

/**
 * Displays a styled error message.
 * Used for mutation failures, load errors, etc.
 */
export function ErrorMessage({ message, className = '' }: ErrorMessageProps) {
  return (
    <p className={`text-destructive ${className}`}>
      <AlertCircle className="inline h-3 w-3 mr-1" />
      {message}
    </p>
  );
}
