import { Router, Request, Response } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { validateRequest } from '../middleware/validate.js';
import {
  createTicketSchema,
  updateTicketSchema,
  createMessageSchema,
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
 * Query params: page, limit, status, category, assignedToId
 */
router.get('/tickets', requireAuth, async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const status = req.query.status as TicketStatus | undefined;
    const category = req.query.category as TicketCategory | undefined;
    const assignedToId = req.query.assignedToId as string | undefined;

    const result = await listTickets({
      page,
      limit,
      status,
      category,
      assignedToId: assignedToId === 'null' ? null : assignedToId,
    });

    res.json(result);
  } catch (error) {
    console.error('Error listing tickets:', error);
    res.status(500).json({
      error: 'Failed to list tickets',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

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

export default router;
