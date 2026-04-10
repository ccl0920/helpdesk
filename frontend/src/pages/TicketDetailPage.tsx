import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { fetchTicketById } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft } from 'lucide-react';
import { STATUS_CONFIG, CATEGORY_CONFIG } from '@helpdesk/common';

export function TicketDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: ticket, isLoading, error } = useQuery({
    queryKey: ['ticket', id],
    queryFn: () => fetchTicketById(id!),
    enabled: !!id,
  });

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
            {ticket.assignedTo && (
              <div>
                <span className="text-muted-foreground">Assigned To:</span>
                <p className="mt-1 font-medium">{ticket.assignedTo.name || ticket.assignedTo.email}</p>
              </div>
            )}
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
