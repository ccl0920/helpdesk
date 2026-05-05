import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

interface BackButtonProps {
  onBack: () => void;
}

export function BackButton({ onBack }: BackButtonProps) {
  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={onBack}
      className="gap-2 rounded-full -ml-2 text-muted-foreground hover:text-foreground"
    >
      <ArrowLeft className="h-4 w-4" />
      Back to tickets
    </Button>
  );
}
