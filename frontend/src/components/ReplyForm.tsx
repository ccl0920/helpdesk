import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { createMessageSchema, SenderType } from '@helpdesk/common';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { addMessage, polishReply } from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { FormFieldError } from '@/components/ui/form-field-error';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Send, Loader2, Sparkles } from 'lucide-react';
import type { Ticket } from '@/lib/api';

type ReplyFormValues = {
  from: string;
  to: string;
  subject: string;
  body: string;
  bodyHtml?: string;
  senderType: SenderType;
};

interface ReplyFormProps {
  ticket: Ticket;
}

export function ReplyForm({ ticket }: ReplyFormProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<ReplyFormValues>({
    resolver: zodResolver(createMessageSchema) as any,
    defaultValues: {
      from: user?.email || '',
      to: ticket.emailFrom,
      subject: `Re: ${ticket.subject}`,
      body: '',
      senderType: SenderType.AGENT,
    },
  });

  const bodyValue = watch('body');

  const addMessageMutation = useMutation({
    mutationFn: (data: ReplyFormValues) => addMessage(ticket.id.toString(), data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ticket', ticket.id.toString()] });
      reset({
        from: user?.email || '',
        to: ticket.emailFrom,
        subject: `Re: ${ticket.subject}`,
        body: '',
        senderType: SenderType.AGENT,
      });
    },
  });

  const polishMutation = useMutation({
    mutationFn: () => polishReply({
      originalText: bodyValue,
      ticketContext: `Customer: ${ticket.senderName}\nSubject: ${ticket.subject}\nDescription: ${ticket.description}`,
    }),
    onSuccess: (data) => {
      setValue('body', data.polishedText, { shouldDirty: true });
    },
  });

  const onSubmit = async (data: ReplyFormValues) => {
    await addMessageMutation.mutateAsync(data);
  };

  const handlePolish = async () => {
    await polishMutation.mutateAsync();
  };

  return (
    <Card className="border-0 shadow-soft">
      <CardHeader>
        <CardTitle className="text-lg font-heading">Reply to Customer</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <Input
              {...register('subject')}
              placeholder="Subject"
              aria-label="Reply subject"
            />
            <FormFieldError error={errors.subject} />
          </div>

          <div>
            <Textarea
              {...register('body')}
              placeholder="Type your reply..."
              className="min-h-[150px]"
              aria-label="Reply body"
            />
            <FormFieldError error={errors.body} />
          </div>

          {addMessageMutation.isError && (
            <p className="text-sm text-coral-600 font-medium">
              {addMessageMutation.error instanceof Error
                ? addMessageMutation.error.message
                : 'Failed to send reply. Please try again.'}
            </p>
          )}

          {polishMutation.isError && (
            <p className="text-sm text-coral-600 font-medium">
              {polishMutation.error instanceof Error
                ? polishMutation.error.message
                : 'Failed to polish reply. Please try again.'}
            </p>
          )}

          <div className="flex justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              disabled={!bodyValue.trim() || polishMutation.isPending}
              onClick={handlePolish}
              className="flex items-center gap-2 rounded-full border-border/80"
            >
              {polishMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Polishing...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  Polish
                </>
              )}
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || !bodyValue.trim()}
              className="flex items-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4" />
                  Send Reply
                </>
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
