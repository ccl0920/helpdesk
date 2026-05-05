import * as Sentry from '@sentry/node';
import { generateText, Output } from 'ai';
import { opencode } from 'ai-sdk-provider-opencode-sdk';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import prisma from './prisma.js';
import { TicketStatus, SenderType } from '@helpdesk/common';
import { addMessage } from '../services/ticketService.js';
import { boss, AUTO_RESOLVE_TICKET_QUEUE } from './queue.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const KB_PATH = resolve(__dirname, '..', '..', 'knowledge-base.md');

let knowledgeBaseContent: string;
try {
  knowledgeBaseContent = readFileSync(KB_PATH, 'utf-8');
} catch (error) {
  Sentry.captureException(error, {
    tags: { component: 'auto-resolution', action: 'load-knowledge-base' },
    extra: { knowledgeBasePath: KB_PATH },
  });
  knowledgeBaseContent = '';
}

const MIN_CONFIDENCE = 0.8;
const AI_SENDER_EMAIL = 'support@test.test';
const SIGNATURE = '\n\nBest regards,\nSupport Team';

interface AutoResolveResult {
  resolved: boolean;
  confidence: number;
  answer?: string;
  escalate?: boolean;
}

/**
 * Attempt to auto-resolve a ticket using the knowledge base.
 * Ticket must be in NEW status. On entry, status is updated to PROCESSING.
 * On success, ticket becomes RESOLVED with resolvedBy=AI and an agent reply is added.
 * On failure/escalation, ticket becomes OPEN.
 */
export async function autoResolveTicket(ticketId: bigint): Promise<void> {
  const ticket = await prisma.ticket.findUnique({
    where: { id: ticketId },
    select: {
      id: true,
      subject: true,
      description: true,
      status: true,
      emailFrom: true,
      senderName: true,
      emailTo: true,
    },
  });

  if (!ticket) {
    console.warn(`[AutoResolve] Ticket ${ticketId} not found, skipping`);
    return;
  }

  if (ticket.status !== TicketStatus.NEW) {
    console.log(`[AutoResolve] Ticket ${ticketId} status is ${ticket.status}, skipping`);
    return;
  }

  // Move to PROCESSING so it's not visible in the list
  await prisma.ticket.update({
    where: { id: ticketId },
    data: { status: TicketStatus.PROCESSING },
  });

  if (!knowledgeBaseContent) {
    console.warn(`[AutoResolve] Knowledge base not loaded, moving ticket ${ticketId} to OPEN`);
    await prisma.ticket.update({
      where: { id: ticketId },
      data: { status: TicketStatus.OPEN, resolvedBy: null },
    });
    return;
  }

  const customerFirstName = ticket.senderName?.split(' ')[0] || 'there';

  try {
    const { output } = await generateText({
      model: opencode('qwen3.5-plus'),
      output: Output.json(),
      prompt: `You are an expert customer support AI assistant. Your job is to determine if an incoming support ticket can be auto-resolved using the provided knowledge base.

## Knowledge Base
${knowledgeBaseContent}

## Ticket Information
Customer Name: ${ticket.senderName}
Subject: ${ticket.subject}
Description: ${ticket.description}

## Instructions
1. Analyze the ticket carefully against the knowledge base.
2. Determine if the issue can be fully resolved using ONLY the information in the knowledge base.
3. You MUST escalate to a human agent (escalate: true) if ANY of the following apply:
   - The user threatens legal action.
   - The user requests a refund outside the 30-day window.
   - The user disputes a charge or mentions a chargeback.
   - The issue involves account security concerns.
   - You are not highly confident you can resolve the issue (confidence < ${MIN_CONFIDENCE}).
   - The issue is not covered by the knowledge base.
4. If you can resolve it, write a helpful answer based ONLY on the knowledge base.
   - Address the customer by their first name ("${customerFirstName}") in the greeting.
   - Use a professional, warm, and customer-friendly tone.
   - Format the reply with clear paragraphs and bullet points where appropriate.
   - Sign the email with:\n\nBest regards,\nSupport Team
5. Respond with a JSON object in this exact format:
{
  "resolved": boolean,
  "confidence": number (0.0 to 1.0),
  "answer": string (the response to send to the customer, only if resolved is true),
  "escalate": boolean
}`,
    });

    const result = parseAutoResolveResult(output);

    if (result.escalate || !result.resolved || result.confidence < MIN_CONFIDENCE) {
      console.log(
        `[AutoResolve] Ticket ${ticketId} escalated (escalate=${result.escalate}, resolved=${result.resolved}, confidence=${result.confidence})`
      );
      await prisma.ticket.update({
        where: { id: ticketId },
        data: { status: TicketStatus.OPEN, resolvedBy: null },
      });
      return;
    }

    // Auto-resolve: update ticket and add agent message
    await prisma.ticket.update({
      where: { id: ticketId },
      data: { status: TicketStatus.RESOLVED, resolvedBy: 'AI' },
    });

    let answer = result.answer || 'Your issue has been resolved.';
    // Ensure signature is present
    if (!answer.includes('Support Team')) {
      answer = answer.trimEnd() + SIGNATURE;
    }

    await addMessage(ticketId.toString(), {
      from: AI_SENDER_EMAIL,
      to: ticket.emailFrom,
      subject: `Re: ${ticket.subject}`,
      body: answer,
      senderType: SenderType.AGENT,
    });

    console.log(`[AutoResolve] Ticket ${ticketId} auto-resolved with confidence ${result.confidence}`);
  } catch (error: any) {
    Sentry.captureException(error, {
      tags: { component: 'auto-resolution', action: 'process-ticket' },
      extra: { ticketId: ticketId.toString() },
    });
    // On error, move to OPEN so it doesn't get stuck in PROCESSING
    await prisma.ticket.update({
      where: { id: ticketId },
      data: { status: TicketStatus.OPEN, resolvedBy: null },
    });
    throw error;
  }
}

function parseAutoResolveResult(output: unknown): AutoResolveResult {
  const defaultResult: AutoResolveResult = {
    resolved: false,
    confidence: 0,
    escalate: true,
  };

  if (!output || typeof output !== 'object') {
    return defaultResult;
  }

  const obj = output as Record<string, unknown>;

  return {
    resolved: Boolean(obj.resolved),
    confidence: typeof obj.confidence === 'number' ? obj.confidence : 0,
    answer: typeof obj.answer === 'string' ? obj.answer : undefined,
    escalate: typeof obj.escalate === 'boolean' ? obj.escalate : true,
  };
}

interface AutoResolveJobData {
  ticketId: string;
}

/**
 * Register the pg-boss worker for ticket auto-resolution.
 * Should be called once after the queue has started.
 */
export function registerAutoResolutionWorker(): void {
  boss.work<AutoResolveJobData>(AUTO_RESOLVE_TICKET_QUEUE, async (jobs) => {
    for (const job of jobs) {
      const ticketIdStr = job.data?.ticketId;
      if (!ticketIdStr) {
        console.warn('[AutoResolve] Job missing ticketId, skipping');
        continue;
      }

      const ticketId = BigInt(ticketIdStr);

      try {
        await autoResolveTicket(ticketId);
      } catch (error: any) {
        const message = error?.message || '';
        if (message.includes('rate limit') || message.includes('Rate limit')) {
          Sentry.captureMessage(`Auto-resolution rate limit hit for ticket ${ticketId}`, 'warning');
        } else {
          Sentry.captureException(error, {
            tags: { component: 'auto-resolution', action: 'worker-job' },
            extra: { ticketId: ticketId.toString() },
          });
        }
        // Re-throw so pg-boss can retry the job
        throw error;
      }
    }
  });

  console.log('🤖 Auto-resolution worker registered');
}
