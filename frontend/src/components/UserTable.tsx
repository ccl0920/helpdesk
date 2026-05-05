import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { PencilIcon, Trash2Icon } from 'lucide-react';
import { Role } from '@/lib/role';
import type { User } from '@/lib/api';

interface UserTableProps {
  users: User[];
  isLoading: boolean;
  onEdit?: (user: User) => void;
  onDelete?: (user: User) => void;
}

export function UserTable({ users, isLoading, onEdit, onDelete }: UserTableProps) {
  function formatDate(dateString: string) {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  }

  if (isLoading) {
    return (
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Email</TableHead>
            <TableHead>Name</TableHead>
            <TableHead>Role</TableHead>
            <TableHead>Verified</TableHead>
            <TableHead>Created</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {Array.from({ length: 5 }).map((_, i) => (
            <TableRow key={i}>
              <TableCell><Skeleton className="h-4 w-32 rounded-lg" /></TableCell>
              <TableCell><Skeleton className="h-4 w-24 rounded-lg" /></TableCell>
              <TableCell><Skeleton className="h-6 w-16 rounded-full" /></TableCell>
              <TableCell><Skeleton className="h-6 w-20 rounded-full" /></TableCell>
              <TableCell><Skeleton className="h-4 w-28 rounded-lg" /></TableCell>
              <TableCell><Skeleton className="h-8 w-16 rounded-lg" /></TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Email</TableHead>
          <TableHead>Name</TableHead>
          <TableHead>Role</TableHead>
          <TableHead>Verified</TableHead>
          <TableHead>Created</TableHead>
          <TableHead>Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {users.map((user) => (
          <TableRow key={user.id}>
            <TableCell className="font-medium text-foreground">{user.email}</TableCell>
            <TableCell>{user.name || '-'}</TableCell>
            <TableCell>
              <Badge variant={user.role === Role.ADMIN ? 'default' : 'secondary'}>
                {user.role}
              </Badge>
            </TableCell>
            <TableCell>
              {user.emailVerified ? (
                <Badge variant="teal" className="text-xs">
                  Verified
                </Badge>
              ) : (
                <Badge variant="outline" className="text-xs">
                  Pending
                </Badge>
              )}
            </TableCell>
            <TableCell className="text-muted-foreground">
              {formatDate(user.createdAt)}
            </TableCell>
            <TableCell>
              <div className="flex items-center gap-1">
                {onEdit && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onEdit(user)}
                    aria-label={`Edit ${user.name || user.email}`}
                    className="rounded-full text-muted-foreground hover:text-foreground"
                  >
                    <PencilIcon className="w-4 h-4" />
                  </Button>
                )}
                {onDelete && user.role !== Role.ADMIN && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onDelete(user)}
                    aria-label={`Delete ${user.name || user.email}`}
                    className="rounded-full text-coral-500 hover:text-coral-600 hover:bg-coral-50"
                  >
                    <Trash2Icon className="w-4 h-4" />
                  </Button>
                )}
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
