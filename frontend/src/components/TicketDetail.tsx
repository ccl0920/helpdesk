import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { UpdateTicket } from '@/components/UpdateTicket';
import type { Ticket, User } from '@/lib/api';

interface TicketDetailProps {
  ticket: Ticket;
  agents: User[];
}

export function TicketDetail({ ticket, agents }: TicketDetailProps) {
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
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">{ticket.subject}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Left Column - Ticket Details */}
          <div className="space-y-6 text-sm">
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

            <div className="border-t pt-4">
              <h3 className="font-semibold mb-2">Description</h3>
              <p className="text-muted-foreground whitespace-pre-wrap">{ticket.description}</p>
            </div>
          </div>

          {/* Right Column - Dropdowns */}
          <div className="space-y-4">
            <UpdateTicket ticket={ticket} agents={agents} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
