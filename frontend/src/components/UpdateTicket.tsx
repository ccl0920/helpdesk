import { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { updateTicket } from '@/lib/api';
import { STATUS_CONFIG, CATEGORY_CONFIG, TicketStatus, TicketCategory } from '@helpdesk/common';
import { ErrorMessage } from '@/components/ui/error-message';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { Ticket, User } from '@/lib/api';

interface UpdateTicketProps {
  ticket: Ticket;
  agents: User[];
}

export function UpdateTicket({ ticket, agents }: UpdateTicketProps) {
  const queryClient = useQueryClient();
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<TicketStatus | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<TicketCategory | null | 'none'>(null);

  useEffect(() => {
    if (ticket) {
      setSelectedStatus(ticket.status);
      setSelectedCategory(ticket.category || 'none');
      setSelectedAgentId(ticket.assignedToId);
    }
  }, [ticket]);

  const updateMutation = useMutation({
    mutationFn: (data: { assignedToId?: string | null; status?: TicketStatus; category?: TicketCategory | null }) =>
      updateTicket(ticket.id.toString(), data),
    onSuccess: (updatedTicket) => {
      queryClient.setQueryData(['ticket', ticket.id.toString()], updatedTicket);
      queryClient.invalidateQueries({ queryKey: ['tickets'] });
    },
  });

  const handleAgentChange = async (agentId: string | null) => {
    const newAgentId = agentId === 'unassigned' ? null : agentId;
    setSelectedAgentId(newAgentId);
    try {
      await updateMutation.mutateAsync({ assignedToId: newAgentId });
    } catch {
      // Error is handled by updateMutation.isError state
    }
  };

  const handleStatusChange = async (status: TicketStatus | null) => {
    if (!status) return;
    setSelectedStatus(status);
    try {
      await updateMutation.mutateAsync({ status });
    } catch {
      // Error is handled by updateMutation.isError state
    }
  };

  const handleCategoryChange = async (category: string | null) => {
    const newCategory = category === 'none' || !category ? null : (category as TicketCategory);
    setSelectedCategory(newCategory || 'none');
    try {
      await updateMutation.mutateAsync({ category: newCategory });
    } catch {
      // Error is handled by updateMutation.isError state
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <span className="text-muted-foreground text-sm">Status</span>
        <div className="mt-1">
          <Select
            value={selectedStatus || ticket.status}
            onValueChange={handleStatusChange}
            disabled={updateMutation.isPending}
          >
            <SelectTrigger className="w-[180px]" aria-label="Update status">
              <SelectValue>
                {STATUS_CONFIG[selectedStatus || ticket.status].label}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {Object.values(TicketStatus)
                .filter((status) => status !== TicketStatus.NEW && status !== TicketStatus.PROCESSING)
                .map((status) => (
                  <SelectItem key={status} value={status}>
                    {STATUS_CONFIG[status].label}
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div>
        <span className="text-muted-foreground text-sm">Category</span>
        <div className="mt-1">
          <Select
            value={(selectedCategory || 'none') as string}
            onValueChange={handleCategoryChange}
            disabled={updateMutation.isPending}
          >
            <SelectTrigger className="w-[180px]" aria-label="Update category">
              <SelectValue>
                {selectedCategory === 'none' || !selectedCategory
                  ? 'No Category'
                  : CATEGORY_CONFIG[selectedCategory as TicketCategory].label}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">No Category</SelectItem>
              {Object.values(TicketCategory).map((category) => (
                <SelectItem key={category} value={category}>
                  {CATEGORY_CONFIG[category].label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div>
        <span className="text-muted-foreground text-sm">Assigned To</span>
        <div className="mt-1">
          <Select
            value={selectedAgentId || 'unassigned'}
            onValueChange={handleAgentChange}
            disabled={updateMutation.isPending}
          >
            <SelectTrigger className="w-[180px]" aria-label="Select an agent">
              <SelectValue>
                {selectedAgentId
                  ? (agents.find((a) => a.id === selectedAgentId)?.name ||
                      ticket.assignedTo?.name ||
                      agents.find((a) => a.id === selectedAgentId)?.email ||
                      ticket.assignedTo?.email ||
                      'Unknown')
                  : 'Unassigned'}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="unassigned">Unassigned</SelectItem>
              {ticket.assignedTo &&
                !agents.find((a) => a.id === ticket.assignedToId) && (
                  <SelectItem value={ticket.assignedToId!}>
                    {ticket.assignedTo.name || ticket.assignedTo.email}
                  </SelectItem>
                )}
              {agents.map((agent) => (
                <SelectItem key={agent.id} value={agent.id}>
                  {agent.name || agent.email}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {updateMutation.isPending && (
          <p className="text-xs text-muted-foreground mt-1">Updating...</p>
        )}
        {updateMutation.isError && (
          <ErrorMessage message="Failed to update" className="text-xs mt-1" />
        )}
      </div>
    </div>
  );
}
