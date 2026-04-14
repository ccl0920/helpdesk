import { FieldError } from 'react-hook-form';

interface FormFieldErrorProps {
  error?: FieldError;
}

/**
 * Displays a form field error message if present.
 * Renders nothing if no error is provided.
 */
export function FormFieldError({ error }: FormFieldErrorProps) {
  if (!error) return null;

  return <p className="text-sm text-destructive mt-1">{error.message}</p>;
}
