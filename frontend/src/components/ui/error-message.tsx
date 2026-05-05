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
    <p className={`text-coral-600 font-medium flex items-center gap-1.5 ${className}`}>
      <AlertCircle className="inline h-4 w-4 flex-shrink-0" />
      {message}
    </p>
  );
}
