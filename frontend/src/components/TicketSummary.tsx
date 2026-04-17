import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Sparkles, Loader2 } from 'lucide-react';
import { summarizeTicket, type Ticket } from '@/lib/api';

interface TicketSummaryProps {
  ticket: Ticket;
}

export function TicketSummary({ ticket }: TicketSummaryProps) {
  const queryClient = useQueryClient();
  const ticketId = ticket.id.toString();

  const summarizeMutation = useMutation({
    mutationFn: () => summarizeTicket(ticketId),
    onSuccess: (data) => {
      queryClient.setQueryData(['ticket', ticketId], (old: Ticket) => ({
        ...old,
        summary: data.summary,
      }));
    },
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">AI Summary</CardTitle>
      </CardHeader>
      <CardContent>
        {ticket.summary && (
          <p className="text-muted-foreground whitespace-pre-wrap mb-4">{ticket.summary}</p>
        )}
        <Button
          variant="outline"
          size="sm"
          onClick={() => summarizeMutation.mutate()}
          disabled={summarizeMutation.isPending}
        >
          {summarizeMutation.isPending ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Sparkles className="mr-2 h-4 w-4" />
          )}
          {ticket.summary ? 'Regenerate Summary' : 'Summarize'}
        </Button>
      </CardContent>
    </Card>
  );
}