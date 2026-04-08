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
import { AlertTriangleIcon } from 'lucide-react';
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
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangleIcon className="w-5 h-5" />
            Delete User
          </DialogTitle>
          <DialogDescription>
            This action cannot be undone.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          <Alert variant="destructive">
            <AlertTriangleIcon className="w-4 h-4" />
            <AlertDescription>
              Are you sure you want to delete this user?
            </AlertDescription>
          </Alert>

          <div className="mt-4 p-3 rounded-lg bg-muted">
            <p className="text-sm">
              <span className="font-medium">Name:</span> {user.name || '-'}
            </p>
            <p className="text-sm">
              <span className="font-medium">Email:</span> {user.email}
            </p>
            <p className="text-sm">
              <span className="font-medium">Role:</span> {user.role}
            </p>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button type="button" variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button type="button" variant="destructive" onClick={handleConfirm}>
            Delete User
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
