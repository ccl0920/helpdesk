import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { generateText, Output } from 'ai';
import { opencode } from 'ai-sdk-provider-opencode-sdk';
import { requireAuth } from '../middleware/auth.js';
import { validateRequest } from '../middleware/validate.js';
import {
  createTicketSchema,
  updateTicketSchema,
  createMessageSchema,
  listTicketsQuerySchema,
  polishReplySchema,
  summarizeTicketSchema,
  TicketStatus,
  TicketCategory,
  type UpdateTicketInput,
  type CreateMessageInput,
} from '@helpdesk/common';
import {
  createTicket,
  getTicketById,
  listTickets,
  updateTicket,
  addMessage,
  type TicketWithDetails,
} from '../services/ticketService.js';
import { handleWebhook } from '../services/emailProviders/webhookProvider.js';
import { enqueueClassifyTicket } from '../lib/queue.js';
import prisma from '../lib/prisma.js';

const router = Router();

/**
 * POST /api/email/webhook
 * Webhook endpoint for email providers (no auth required, uses signature validation)
 * MUST be defined before parameterized routes like /:id to avoid conflicts
 */
router.post('/email/webhook', async (req: Request, res: Response) => {
  await handleWebhook(req, res);
});

/**
 * GET /api/tickets
 * List all tickets with pagination and filtering
 * Query params: page, limit, status, category, assignedToId, sortBy, sortOrder
 */
router.get(
  '/tickets',
  requireAuth,
  validateRequest(listTicketsQuerySchema, 'query'),
  async (req: Request, res: Response) => {
    try {
      const {
        page,
        limit,
        search,
        status,
        category,
        assignedToId,
        sortBy,
        sortOrder,
      } = (req as any).validatedQuery as z.infer<typeof listTicketsQuerySchema>;

      const result = await listTickets({
        page,
        limit,
        search,
        status,
        category,
        assignedToId: assignedToId === 'null' ? null : assignedToId,
        sortBy,
        sortOrder,
      });

      res.json(result);
    } catch (error) {
      console.error('Error listing tickets:', error);
      res.status(500).json({
        error: 'Failed to list tickets',
        details: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
);

/**
 * GET /api/tickets/:id
 * Get a single ticket with full details and message thread
 */
router.get('/tickets/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const { id } = req.params as { id: string };

    // Validate that id is a valid BigInt string
    let bigintId: bigint;
    try {
      bigintId = BigInt(id);
    } catch {
      return res.status(400).json({ error: 'Invalid ticket ID format' });
    }

    const ticket = await getTicketById(bigintId.toString());

    if (!ticket) {
      return res.status(404).json({ error: 'Ticket not found' });
    }

    res.json(ticket);
  } catch (error) {
    console.error('Error getting ticket:', error);
    res.status(500).json({
      error: 'Failed to get ticket',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * POST /api/tickets
 * Create a new ticket manually
 */
router.post('/tickets', requireAuth, validateRequest(createTicketSchema), async (req: Request, res: Response) => {
  try {
    const ticket = await createTicket(req.body);

    // Enqueue automatic classification if no category was provided
    if (!ticket.category) {
      enqueueClassifyTicket(ticket.id).catch((err) => {
        console.error(`[TicketsRoute] Failed to enqueue classification for ticket ${ticket.id}:`, err);
      });
    }

    res.status(201).json(ticket);
  } catch (error) {
    console.error('Error creating ticket:', error);
    res.status(500).json({
      error: 'Failed to create ticket',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * PUT /api/tickets/:id
 * Update ticket status, category, or assignee
 */
router.put('/tickets/:id', requireAuth, validateRequest(updateTicketSchema), async (req: Request, res: Response) => {
  try {
    const { id } = req.params as { id: string };
    const data: UpdateTicketInput = req.body;

    // Validate that id is a valid BigInt string
    try {
      BigInt(id);
    } catch {
      return res.status(400).json({ error: 'Invalid ticket ID format' });
    }

    // Validate assignedToId is a valid user if provided
    if (data.assignedToId !== undefined) {
      if (data.assignedToId !== null) {
        const user = await prisma.user.findUnique({
          where: { id: data.assignedToId },
          select: { id: true },
        });

        if (!user) {
          return res.status(400).json({ error: 'Invalid assignee: user does not exist' });
        }
      }
    }

    const ticket = await updateTicket(id, data);

    res.json(ticket);
  } catch (error: any) {
    // Prisma throws P2025 error when record not found
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Ticket not found' });
    }

    console.error('Error updating ticket:', error);
    res.status(500).json({
      error: 'Failed to update ticket',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * POST /api/tickets/:id/messages
 * Add a message to a ticket
 */
router.post('/tickets/:id/messages', requireAuth, validateRequest(createMessageSchema), async (req: Request, res: Response) => {
  try {
    const { id } = req.params as { id: string };
    const data: CreateMessageInput = req.body;

    const ticket = await addMessage(id, data);

    res.status(201).json(ticket);
  } catch (error) {
    console.error('Error adding message:', error);
    res.status(500).json({
      error: 'Failed to add message',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * POST /api/tickets/polish
 * Polish an agent's reply using qwen3.5-plus via OpenCode
 */
router.post('/tickets/polish', requireAuth, validateRequest(polishReplySchema), async (req: Request, res: Response) => {
  try {
    const { originalText, ticketContext } = req.body as z.infer<typeof polishReplySchema>;

    const agentName = req.session?.user?.name || req.session?.user?.email || 'Support Agent';
    const customerName = ticketContext?.split('\n')[0]?.replace('Customer: ', '') || 'Customer';

    const { output } = await generateText({
      model: opencode('qwen3.5-plus'),
      output: Output.json(),
      prompt: `You are a professional customer support agent helping to polish agent replies.

Your task is to improve the following reply to make it more professional, clear, and helpful.

Context:
- Customer name: ${customerName}
- Agent name: ${agentName}

${ticketContext ? `Ticket context: ${ticketContext}\n\n` : ''}Original reply:
${originalText}

Improve the reply by:
1. Addressing the customer by name
2. Making it more professional and courteous
3. Improving clarity and grammar
4. Ensuring it addresses the customer's concern
5. Signing the reply as "${agentName}"
6. Keeping it concise but comprehensive

Respond with a JSON object with a single key "polishedText" containing the improved reply.`,
    });

    let polishedText = '';
    if (output && typeof output === 'object' && 'polishedText' in output) {
      polishedText = String(output.polishedText);
    }

    res.json({ polishedText });
  } catch (error: any) {
    console.error('Error polishing reply:', error);

    const errorMessage = error.message || '';
    if (errorMessage.includes('rate limit') || errorMessage.includes('Rate limit')) {
      return res.status(429).json({
        error: 'Rate limit exceeded. Please wait a moment and try again.',
        details: errorMessage,
      });
    }

    res.status(500).json({
      error: 'Failed to polish reply',
      details: errorMessage,
    });
  }
});

/**
 * POST /api/tickets/:id/summarize
 * Summarize a ticket and its conversation history using qwen3.5-plus via OpenCode
 */
router.post('/tickets/:id/summarize', requireAuth, async (req: Request, res: Response) => {
  try {
    const { id } = req.params as { id: string };

    let bigintId: bigint;
    try {
      bigintId = BigInt(id);
    } catch {
      return res.status(400).json({ error: 'Invalid ticket ID format' });
    }

    const ticket = await prisma.ticket.findUnique({
      where: { id: bigintId },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' },
        },
        assignedTo: {
          select: { name: true, email: true },
        },
      },
    });

    if (!ticket) {
      return res.status(404).json({ error: 'Ticket not found' });
    }

    const conversationHistory = ticket.messages
      .map((msg: { senderType: string; body: string }) => {
        const sender = msg.senderType === 'AGENT' ? 'Agent' : 'Customer';
        return `${sender}: ${msg.body}`;
      })
      .join('\n\n');

    const context = `
Ticket Subject: ${ticket.subject}
Customer: ${ticket.senderName} (${ticket.emailFrom})
Status: ${ticket.status}
Category: ${ticket.category || 'Uncategorized'}
Assigned to: ${ticket.assignedTo?.name || ticket.assignedTo?.email || 'Unassigned'}
Created: ${ticket.createdAt.toISOString()}

Description:
${ticket.description}

Conversation History:
${conversationHistory || 'No messages yet'}
`.trim();

    const { output } = await generateText({
      model: opencode('qwen3.5-plus'),
      output: Output.text(),
      prompt: `You are a professional customer support AI assistant. Your task is to summarize support tickets concisely.

Provide a brief summary (2-4 sentences) that captures:
1. The main issue or question
2. Current status
3. Any key actions taken or resolution steps

Summary:
${context}`,
    });

    const summary = typeof output === 'string' ? output : String(output || '');

    const updatedTicket = await prisma.ticket.update({
      where: { id: bigintId },
      data: { summary },
    });

    res.json({ summary: updatedTicket.summary });
  } catch (error: any) {
    console.error('Error summarizing ticket:', error);

    const errorMessage = error.message || '';
    if (errorMessage.includes('rate limit') || errorMessage.includes('Rate limit')) {
      return res.status(429).json({
        error: 'Rate limit exceeded. Please wait a moment and try again.',
        details: errorMessage,
      });
    }

    res.status(500).json({
      error: 'Failed to summarize ticket',
      details: errorMessage,
    });
  }
});

export default router;
