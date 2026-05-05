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
    <Card className="border-0 shadow-soft bg-coral-50/40">
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center size-8 rounded-lg bg-coral-100">
            <Sparkles className="h-4 w-4 text-coral-600" />
          </div>
          <CardTitle className="text-lg font-heading">AI Summary</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        {ticket.summary && (
          <p className="text-foreground/80 whitespace-pre-wrap mb-5 leading-relaxed font-body">{ticket.summary}</p>
        )}
        <Button
          variant="outline"
          size="sm"
          onClick={() => summarizeMutation.mutate()}
          disabled={summarizeMutation.isPending}
          className="rounded-full border-coral-200 text-coral-700 hover:bg-coral-100 hover:text-coral-800"
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
