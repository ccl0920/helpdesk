import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchUsers, createUser, updateUser, deleteUser, User } from '@/lib/api';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PlusIcon } from 'lucide-react';
import { UserFormModal } from '@/components/UserFormModal';
import { DeleteConfirmationModal } from '@/components/DeleteConfirmationModal';
import { UserTable } from '@/components/UserTable';
import { Role } from '@/lib/role';

export function UsersPage() {
  const queryClient = useQueryClient();
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [deletingUser, setDeletingUser] = useState<User | null>(null);

  const { data: users = [], isLoading, error } = useQuery({
    queryKey: ['users'],
    queryFn: fetchUsers,
  });

  const createMutation = useMutation({
    mutationFn: createUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      queryClient.invalidateQueries({ queryKey: ['agents'] });
      setIsCreating(false);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: { name: string; email: string; password?: string; role: Role } }) =>
      updateUser(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      queryClient.invalidateQueries({ queryKey: ['agents'] });
      setEditingUser(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      // Invalidate all ticket-related queries since assigned agents may have changed
      queryClient.invalidateQueries({ queryKey: ['ticket'] });
      queryClient.invalidateQueries({ queryKey: ['tickets'] });
      queryClient.invalidateQueries({ queryKey: ['agents'] });
      setDeletingUser(null);
    },
  });

  const activeUser = editingUser;
  const isModalOpen = isCreating || !!editingUser;

  const handleSubmit = async (data: { name: string; email: string; password?: string; role: Role }) => {
    if (editingUser) {
      await updateMutation.mutateAsync({ id: editingUser.id, data });
    } else {
      if (!data.password) {
        throw new Error('Password is required');
      }
      await createMutation.mutateAsync(data as { name: string; email: string; password: string; role: Role });
    }
  };

  const handleDelete = async () => {
    if (deletingUser) {
      await deleteMutation.mutateAsync(deletingUser.id);
    }
  };

  return (
    <div className="space-y-6 animate-fade-up">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-heading text-3xl font-bold tracking-tight text-foreground">
            User Management
          </h1>
          <p className="mt-1 text-muted-foreground font-body">
            Create and manage team members
          </p>
        </div>
        <Button onClick={() => setIsCreating(true)} className="gap-2 self-start">
          <PlusIcon className="w-4 h-4" />
          Create User
        </Button>
      </div>

      <Card className="border-0 shadow-soft">
        <CardContent className="pt-6">
          {error && (
            <p className="text-sm text-coral-600 mb-4 font-medium">
              {error instanceof Error ? error.message : 'Failed to load users'}
            </p>
          )}
          <UserTable
            users={users}
            isLoading={isLoading}
            onEdit={setEditingUser}
            onDelete={setDeletingUser}
          />
        </CardContent>
      </Card>

      <UserFormModal
        open={isModalOpen}
        onOpenChange={(open) => {
          if (!open) {
            setIsCreating(false);
            setEditingUser(null);
          }
        }}
        user={activeUser}
        onSubmit={handleSubmit}
      />

      <DeleteConfirmationModal
        open={!!deletingUser}
        onOpenChange={(open) => !open && setDeletingUser(null)}
        user={deletingUser}
        onConfirm={handleDelete}
      />
    </div>
  );
}
