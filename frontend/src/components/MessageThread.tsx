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
      <Card>
        <CardHeader>
          <CardTitle>Message Thread</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-center text-muted-foreground py-8">No messages yet</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Message Thread</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {messages.map((message) => {
            const isAgent = message.senderType === SenderType.AGENT;
            return (
              <div
                key={message.id}
                className={`border rounded-lg p-4 space-y-2 ${
                  isAgent
                    ? 'bg-blue-50 border-blue-200 dark:bg-blue-950/20 dark:border-blue-900'
                    : 'bg-white'
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-2">
                    {isAgent ? (
                      <User className="h-4 w-4 mt-0.5 text-blue-600" />
                    ) : (
                      <Mail className="h-4 w-4 mt-0.5 text-muted-foreground" />
                    )}
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{message.from}</p>
                        <Badge
                          variant={isAgent ? 'default' : 'secondary'}
                          className="text-xs"
                        >
                          {isAgent ? 'Agent' : 'Customer'}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">{message.subject}</p>
                    </div>
                  </div>
                  <span className="text-xs text-muted-foreground whitespace-nowrap">
                    {formatDate(message.createdAt)}
                  </span>
                </div>
                <div className="text-sm text-muted-foreground pl-6">
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
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
