import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchUsers, createUser, updateUser, User } from '@/lib/api';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PlusIcon } from 'lucide-react';
import { UserFormModal } from '@/components/UserFormModal';
import { UserTable } from '@/components/UserTable';

export function UsersPage() {
  const queryClient = useQueryClient();
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  const { data: users = [], isLoading, error } = useQuery({
    queryKey: ['users'],
    queryFn: fetchUsers,
  });

  const createMutation = useMutation({
    mutationFn: createUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setIsCreating(false);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: { name: string; email: string; password?: string; role: 'AGENT' | 'ADMIN' } }) =>
      updateUser(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setEditingUser(null);
    },
  });

  const activeUser = editingUser;
  const isModalOpen = isCreating || !!editingUser;

  const handleSubmit = async (data: { name: string; email: string; password?: string; role: 'AGENT' | 'ADMIN' }) => {
    if (editingUser) {
      await updateMutation.mutateAsync({ id: editingUser.id, data });
    } else {
      if (!data.password) {
        throw new Error('Password is required');
      }
      await createMutation.mutateAsync(data as { name: string; email: string; password: string; role: 'AGENT' | 'ADMIN' });
    }
  };

  return (
    <div>
      <div className="mb-8 flex items-center justify-between">
        <h1 className="text-4xl font-bold text-foreground">User Management</h1>
        <Button onClick={() => setIsCreating(true)}>
          <PlusIcon className="w-4 h-4 mr-2" />
          Create User
        </Button>
      </div>

      <Card>
        <CardContent className="pt-6">
          {error && (
            <p className="text-sm text-destructive mb-4">
              {error instanceof Error ? error.message : 'Failed to load users'}
            </p>
          )}
          <UserTable
            users={users}
            isLoading={isLoading}
            onEdit={setEditingUser}
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
    </div>
  );
}
