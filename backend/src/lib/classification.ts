import { generateText, Output } from 'ai';
import { opencode } from 'ai-sdk-provider-opencode-sdk';
import prisma from './prisma.js';
import { TicketCategory } from '@helpdesk/common';
import { boss, CLASSIFY_TICKET_QUEUE } from './queue.js';

const CATEGORY_VALUES = Object.values(TicketCategory);

/**
 * Classify a ticket using qwen3.5-plus via OpenCode.
 * Updates the ticket's category field with the predicted category.
 */
export async function classifyTicket(ticketId: bigint): Promise<void> {
  const ticket = await prisma.ticket.findUnique({
    where: { id: ticketId },
    select: {
      id: true,
      subject: true,
      description: true,
      category: true,
    },
  });

  if (!ticket) {
    console.warn(`[Classification] Ticket ${ticketId} not found, skipping`);
    return;
  }

  // Skip if already categorized
  if (ticket.category) {
    console.log(`[Classification] Ticket ${ticketId} already categorized as ${ticket.category}, skipping`);
    return;
  }

  const { output } = await generateText({
    model: opencode('qwen3.5-plus'),
    output: Output.json(),
    prompt: `You are a customer support ticket classification assistant.

Classify the following support ticket into exactly one of these categories:
- GENERAL_QUESTION: General inquiries, policy questions, or non-technical information requests
- TECHNICAL_QUESTION: Bugs, errors, feature usage, integrations, or any technical issues
- REFUND_REQUEST: Requests for refunds, billing disputes, or payment reversals

Ticket Subject: ${ticket.subject}
Ticket Description:
${ticket.description}

Respond with a JSON object containing a single key "category" with one of the exact values: GENERAL_QUESTION, TECHNICAL_QUESTION, or REFUND_REQUEST.`,
  });

  let predictedCategory: string | undefined;
  if (output && typeof output === 'object' && 'category' in output) {
    predictedCategory = String(output.category).trim().toUpperCase();
  }

  if (!predictedCategory || !CATEGORY_VALUES.includes(predictedCategory as TicketCategory)) {
    console.warn(`[Classification] Invalid category "${predictedCategory}" for ticket ${ticketId}, skipping update`);
    return;
  }

  await prisma.ticket.update({
    where: { id: ticketId },
    data: { category: predictedCategory as TicketCategory },
  });

  console.log(`[Classification] Ticket ${ticketId} classified as ${predictedCategory}`);
}

interface ClassifyJobData {
  ticketId: string;
}

/**
 * Register the pg-boss worker for ticket classification.
 * Should be called once after the queue has started.
 */
export function registerClassificationWorker(): void {
  boss.work<ClassifyJobData>(CLASSIFY_TICKET_QUEUE, async (jobs) => {
    for (const job of jobs) {
      const ticketIdStr = job.data?.ticketId;
      if (!ticketIdStr) {
        console.warn('[Classification] Job missing ticketId, skipping');
        continue;
      }

      const ticketId = BigInt(ticketIdStr);

      try {
        await classifyTicket(ticketId);
      } catch (error: any) {
        const message = error?.message || '';
        if (message.includes('rate limit') || message.includes('Rate limit')) {
          console.warn(`[Classification] Rate limit hit for ticket ${ticketId}`);
        } else {
          console.error(`[Classification] Failed to classify ticket ${ticketId}:`, error);
        }
        // Re-throw so pg-boss can retry the job
        throw error;
      }
    }
  });

  console.log('🤖 Classification worker registered');
}
