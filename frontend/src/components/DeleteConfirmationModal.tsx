import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangleIcon, Trash2 } from 'lucide-react';
import type { User } from '@/lib/api';

interface DeleteConfirmationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: User | null;
  onConfirm: () => Promise<void>;
}

export function DeleteConfirmationModal({ open, onOpenChange, user, onConfirm }: DeleteConfirmationModalProps) {
  const handleConfirm = async () => {
    await onConfirm();
  };

  const handleClose = () => {
    onOpenChange(false);
  };

  if (!user) return null;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center size-10 rounded-xl bg-coral-100">
              <AlertTriangleIcon className="w-5 h-5 text-coral-600" />
            </div>
            <DialogTitle className="text-coral-700 font-heading">Delete User</DialogTitle>
          </div>
          <DialogDescription>
            This action cannot be undone.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          <Alert variant="destructive">
            <AlertDescription>
              Are you sure you want to delete this user?
            </AlertDescription>
          </Alert>

          <div className="mt-4 p-4 rounded-2xl bg-secondary/50 space-y-1">
            <p className="text-sm">
              <span className="font-semibold text-foreground">Name:</span> <span className="text-muted-foreground">{user.name || '-'}</span>
            </p>
            <p className="text-sm">
              <span className="font-semibold text-foreground">Email:</span> <span className="text-muted-foreground">{user.email}</span>
            </p>
            <p className="text-sm">
              <span className="font-semibold text-foreground">Role:</span> <span className="text-muted-foreground">{user.role}</span>
            </p>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button type="button" variant="outline" onClick={handleClose} className="rounded-full border-border/80">
            Cancel
          </Button>
          <Button type="button" variant="destructive" onClick={handleConfirm} className="gap-2">
            <Trash2 className="size-4" />
            Delete User
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
