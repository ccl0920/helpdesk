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
    <Card className="border-0 shadow-soft">
      <CardHeader>
        <CardTitle className="text-xl font-heading">{ticket.subject}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Left Column - Ticket Details */}
          <div className="space-y-6 text-sm font-body">
            <div>
              <span className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">From</span>
              <div className="mt-2 space-y-0.5">
                {ticket.senderName && (
                  <p className="font-semibold text-foreground">{ticket.senderName}</p>
                )}
                <p className="text-muted-foreground">{ticket.emailFrom}</p>
              </div>
            </div>

            <div>
              <span className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Created</span>
              <p className="mt-2 font-semibold text-foreground">{formatDate(ticket.createdAt)}</p>
            </div>

            <div className="border-t border-border/40 pt-5">
              <h3 className="text-xs uppercase tracking-wider text-muted-foreground font-semibold mb-3">Description</h3>
              <p className="text-muted-foreground whitespace-pre-wrap leading-relaxed">{ticket.description}</p>
            </div>
          </div>

          {/* Right Column - Dropdowns */}
          <div className="space-y-4 bg-secondary/30 rounded-2xl p-5">
            <h3 className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Ticket Properties</h3>
            <UpdateTicket ticket={ticket} agents={agents} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
