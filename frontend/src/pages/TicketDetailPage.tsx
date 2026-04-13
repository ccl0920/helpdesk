import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchTicketById, updateTicket, fetchAgents } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft } from 'lucide-react';
import { STATUS_CONFIG, CATEGORY_CONFIG } from '@helpdesk/common';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Role } from '@/lib/role';
import type { User } from '@/lib/api';

export function TicketDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);

  const { data: ticket, isLoading, error } = useQuery({
    queryKey: ['ticket', id],
    queryFn: () => fetchTicketById(id!),
    enabled: !!id,
  });

  // Fetch agents (users with AGENT or ADMIN role)
  const { data: agents = [] } = useQuery({
    queryKey: ['agents'],
    queryFn: fetchAgents,
    select: (users) => users.filter((u) => u.role === Role.AGENT || u.role === Role.ADMIN),
  });

  // Mutation for updating ticket
  const updateMutation = useMutation({
    mutationFn: (data: { assignedToId?: string | null }) => updateTicket(id!, data),
    onSuccess: (updatedTicket) => {
      queryClient.setQueryData(['ticket', id], updatedTicket);
      queryClient.invalidateQueries({ queryKey: ['tickets'] });
    },
  });

  // Sync selectedAgentId with ticket.assignedToId when ticket loads
  useEffect(() => {
    if (ticket) {
      setSelectedAgentId(ticket.assignedToId);
    }
  }, [ticket]);

  const handleAgentChange = async (agentId: string) => {
    const newAgentId = agentId === 'unassigned' ? null : agentId;
    setSelectedAgentId(newAgentId);
    await updateMutation.mutateAsync({ assignedToId: newAgentId });
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-8 w-64" />
        </CardHeader>
        <CardContent className="space-y-6">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
        </CardContent>
      </Card>
    );
  }

  if (error || !ticket) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-destructive">Failed to load ticket. Please try again.</p>
          <Button variant="outline" onClick={() => navigate('/tickets')} className="mt-4">
            Back to Tickets
          </Button>
        </CardContent>
      </Card>
    );
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate('/tickets')}
          className="-ml-2"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
        <h1 className="text-2xl font-bold">Ticket #{ticket.id.toString()}</h1>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-4">
            <CardTitle className="text-xl">{ticket.subject}</CardTitle>
            <div className="flex items-center gap-2 shrink-0">
              <Badge variant={STATUS_CONFIG[ticket.status].variant}>
                {STATUS_CONFIG[ticket.status].label}
              </Badge>
              {ticket.category && (
                <Badge variant={CATEGORY_CONFIG[ticket.category].variant}>
                  {CATEGORY_CONFIG[ticket.category].label}
                </Badge>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Ticket Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">From:</span>
              <div className="mt-1">
                {ticket.senderName && (
                  <p className="font-medium">{ticket.senderName}</p>
                )}
                <p className="text-muted-foreground">{ticket.emailFrom}</p>
              </div>
            </div>
            <div>
              <span className="text-muted-foreground">Created:</span>
              <p className="mt-1 font-medium">{formatDate(ticket.createdAt)}</p>
            </div>
            <div className="md:col-span-2">
              <span className="text-muted-foreground">Assigned To:</span>
              <div className="mt-1">
                <Select
                  value={selectedAgentId || 'unassigned'}
                  onValueChange={handleAgentChange}
                  disabled={updateMutation.isPending}
                >
                  <SelectTrigger className="w-full md:w-64" aria-label="Select an agent">
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
                    {/* Add currently assigned agent if not in agents list */}
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
                {updateMutation.isPending && (
                  <p className="text-xs text-muted-foreground mt-1">Updating...</p>
                )}
                {updateMutation.isError && (
                  <p className="text-xs text-destructive mt-1">Failed to update assignment</p>
                )}
              </div>
            </div>
          </div>

          {/* Original Description */}
          <div className="border-t pt-4">
            <h3 className="font-semibold mb-2">Description</h3>
            <p className="text-muted-foreground whitespace-pre-wrap">{ticket.description}</p>
          </div>
        </CardContent>
      </Card>

      {/* Message Thread */}
      <Card>
        <CardHeader>
          <CardTitle>Message Thread</CardTitle>
        </CardHeader>
        <CardContent>
          {ticket.messages && ticket.messages.length > 0 ? (
            <div className="space-y-4">
              {ticket.messages.map((message) => (
                <div
                  key={message.id}
                  className="border rounded-lg p-4 space-y-2"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="font-medium">{message.from}</p>
                      <p className="text-sm text-muted-foreground">{message.subject}</p>
                    </div>
                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                      {formatDate(message.createdAt)}
                    </span>
                  </div>
                  <div className="text-sm text-muted-foreground whitespace-pre-wrap">
                    {message.body}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-muted-foreground py-8">
              No messages yet
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
