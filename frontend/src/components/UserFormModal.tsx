import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { updateUserSchema, type UpdateUserInput, Role } from '@helpdesk/common';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { FormFieldError } from '@/components/ui/form-field-error';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { User } from '@/lib/api';

// Extend the common schema for frontend-specific use
const userFormSchema = updateUserSchema;

type UserFormData = z.infer<typeof userFormSchema>;

interface UserFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: User | null;
  onSubmit: (data: UpdateUserInput) => Promise<void>;
}

export function UserFormModal({ open, onOpenChange, user, onSubmit }: UserFormModalProps) {
  const [generalError, setGeneralError] = useState<string | null>(null);
  const isEditing = !!user;

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<UserFormData>({
    resolver: zodResolver(userFormSchema),
    defaultValues: {
      name: '',
      email: '',
      password: '',
      role: Role.AGENT,
    },
  });

  const roleValue = watch('role');

  // Populate form when user changes or modal opens
  useEffect(() => {
    if (open) {
      if (user) {
        reset({
          name: user.name || '',
          email: user.email,
          password: '',
          role: user.role,
        });
      } else {
        reset({
          name: '',
          email: '',
          password: '',
          role: Role.AGENT,
        });
      }
      setGeneralError(null);
    }
  }, [user, open, reset]);

  const handleFormSubmit = async (data: UserFormData) => {
    setGeneralError(null);
    try {
      await onSubmit(data);
      reset();
      onOpenChange(false);
    } catch (error) {
      if (error instanceof Error) {
        if (error.message.includes('Email already exists')) {
          setError('email', {
            type: 'server',
            message: 'Email already exists',
          });
        } else {
          setGeneralError(error.message);
        }
      } else {
        setGeneralError(isEditing ? 'Failed to update user' : 'Failed to create user');
      }
    }
  };

  const handleClose = () => {
    reset();
    setGeneralError(null);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={handleSubmit(handleFormSubmit)} noValidate>
          <DialogHeader>
            <DialogTitle>{isEditing ? 'Edit User' : 'Create New User'}</DialogTitle>
          </DialogHeader>

          <div className="grid gap-5 py-5">
            {generalError && (
              <Alert variant="destructive">
                <AlertDescription>{generalError}</AlertDescription>
              </Alert>
            )}

            <div className="grid gap-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                autoComplete="name"
                disabled={isSubmitting}
                placeholder="Enter user name"
                className={errors.name ? 'border-coral-300 ring-3 ring-coral-500/15' : ''}
                {...register('name')}
              />
              {errors.name && (
                <FormFieldError error={errors.name} />
              )}
            </div>

            <div className="grid gap-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                autoComplete="new-email"
                disabled={isSubmitting}
                placeholder="Enter email address"
                className={errors.email ? 'border-coral-300 ring-3 ring-coral-500/15' : ''}
                {...register('email')}
              />
              {errors.email && (
                <FormFieldError error={errors.email} />
              )}
            </div>

            <div className="grid gap-2">
              <Label htmlFor="password">
                Password {isEditing ? '(leave blank to keep current)' : ''}
              </Label>
              <Input
                id="password"
                type="password"
                autoComplete="new-password"
                disabled={isSubmitting}
                placeholder={isEditing ? 'Enter new password (optional)' : 'Enter password'}
                className={errors.password ? 'border-coral-300 ring-3 ring-coral-500/15' : ''}
                {...register('password')}
              />
              {errors.password && (
                <FormFieldError error={errors.password} />
              )}
            </div>

            <div className="grid gap-2">
              <Label htmlFor="role">Role</Label>
              <Select
                value={roleValue}
                onValueChange={(value) => value && setValue('role', value as Role)}
              >
                <SelectTrigger className={errors.role ? 'border-coral-300 ring-3 ring-coral-500/15' : 'w-full rounded-xl bg-background border-border/60'}>
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={Role.AGENT}>Agent</SelectItem>
                  <SelectItem value={Role.ADMIN}>Admin</SelectItem>
                </SelectContent>
              </Select>
              {errors.role && (
                <FormFieldError error={errors.role} />
              )}
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={handleClose} disabled={isSubmitting} className="rounded-full border-border/80">
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (isEditing ? 'Updating...' : 'Creating...') : (isEditing ? 'Update User' : 'Create User')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
