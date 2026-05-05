import { Mail, User } from 'lucide-react';
import DOMPurify from 'dompurify';
import { SenderType } from '@helpdesk/common';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { TicketMessage } from '@/lib/api';

interface MessageThreadProps {
  messages: TicketMessage[];
}

export function MessageThread({ messages }: MessageThreadProps) {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (!messages || messages.length === 0) {
    return (
      <Card className="border-0 shadow-soft">
        <CardHeader>
          <CardTitle className="text-lg font-heading">Message Thread</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-center text-muted-foreground py-10 font-body">No messages yet</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-0 shadow-soft">
      <CardHeader>
        <CardTitle className="text-lg font-heading">Message Thread</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-5">
          {messages.map((message) => {
            const isAgent = message.senderType === SenderType.AGENT;
            return (
              <div
                key={message.id}
                className={`flex gap-3 ${isAgent ? 'flex-row' : 'flex-row-reverse'}`}
              >
                {/* Avatar */}
                <div className={`flex-shrink-0 flex items-center justify-center size-9 rounded-full ${
                  isAgent ? 'bg-teal-100 text-teal-700' : 'bg-sage-200 text-sage-700'
                }`}>
                  {isAgent ? <User className="h-4 w-4" /> : <Mail className="h-4 w-4" />}
                </div>

                {/* Bubble */}
                <div className={`max-w-[85%] sm:max-w-[75%] rounded-2xl px-5 py-3.5 shadow-soft ${
                  isAgent
                    ? 'bg-teal-50 text-teal-900 rounded-tl-md'
                    : 'bg-card border border-border/40 rounded-tr-md'
                }`}>
                  <div className="flex items-center justify-between gap-4 mb-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <p className="font-semibold text-sm truncate">{message.from}</p>
                      <Badge
                        variant={isAgent ? 'teal' : 'secondary'}
                        className="text-[10px] px-2 py-0"
                      >
                        {isAgent ? 'Agent' : 'Customer'}
                      </Badge>
                    </div>
                    <span className="text-xs text-muted-foreground whitespace-nowrap flex-shrink-0">
                      {formatDate(message.createdAt)}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground mb-1 font-medium">{message.subject}</p>
                  <div className="text-sm leading-relaxed">
                    {message.bodyHtml ? (
                      <div
                        className="prose prose-sm max-w-none dark:prose-invert"
                        dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(message.bodyHtml) }}
                      />
                    ) : (
                      <div className="whitespace-pre-wrap">{message.body}</div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
