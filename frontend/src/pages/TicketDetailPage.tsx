import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { fetchTicketById, fetchAgents } from '@/lib/api';
import { TicketDetailSkeleton } from '@/components/TicketDetailSkeleton';
import { ErrorMessage } from '@/components/ui/error-message';
import { BackButton } from '@/components/BackButton';
import { TicketDetail } from '@/components/TicketDetail';
import { TicketSummary } from '@/components/TicketSummary';
import { MessageThread } from '@/components/MessageThread';
import { ReplyForm } from '@/components/ReplyForm';
import { Role } from '@/lib/role';

export function TicketDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: ticket, isLoading, error } = useQuery({
    queryKey: ['ticket', id],
    queryFn: () => fetchTicketById(id!),
    enabled: !!id,
  });

  const { data: agents = [] } = useQuery({
    queryKey: ['agents'],
    queryFn: fetchAgents,
    select: (users) => users.filter((u) => u.role === Role.AGENT || u.role === Role.ADMIN),
  });

  if (isLoading) {
    return <TicketDetailSkeleton />;
  }

  if (error || !ticket) {
    return (
      <div className="space-y-6">
        <BackButton onBack={() => navigate('/tickets')} />
        <ErrorMessage message="Failed to load ticket. Please try again." />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Ticket #{ticket.id.toString()}</h1>
      <BackButton onBack={() => navigate('/tickets')} />

      <TicketDetail ticket={ticket} agents={agents} />

      <TicketSummary ticket={ticket} />

      <MessageThread messages={ticket.messages} />

      <ReplyForm ticket={ticket} />
    </div>
  );
}
