import prisma from '../lib/prisma.js';
import {
  type CreateTicketInput,
  type UpdateTicketInput,
  type CreateMessageInput,
  TicketStatus,
  TicketCategory,
} from '@helpdesk/common';

/**
 * Ticket with related data
 */
export interface TicketWithDetails {
  id: bigint;
  subject: string;
  description: string;
  status: TicketStatus;
  category: TicketCategory | null;
  emailFrom: string;
  senderName: string;
  emailTo: string;
  assignedToId: string | null;
  assignedTo: {
    id: string;
    name: string | null;
    email: string;
  } | null;
  messages: Array<{
    id: string;
    from: string;
    to: string;
    subject: string;
    body: string;
    bodyHtml: string | null;
    createdAt: Date;
  }>;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Pagination result
 */
export interface PaginatedTickets {
  tickets: TicketWithDetails[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

/**
 * Create a new ticket
 */
export async function createTicket(
  data: CreateTicketInput,
  status: TicketStatus = TicketStatus.OPEN
): Promise<TicketWithDetails> {
  const ticket = await prisma.ticket.create({
    data: {
      subject: data.subject,
      description: data.description,
      emailFrom: data.emailFrom,
      senderName: data.senderName,
      emailTo: data.emailTo,
      status,
      category: data.category || null,
      messages: {
        create: {
          from: data.emailFrom,
          to: data.emailTo,
          subject: data.subject,
          body: data.description,
        },
      },
    },
    include: {
      assignedTo: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      messages: {
        orderBy: { createdAt: 'asc' },
        select: {
          id: true,
          from: true,
          to: true,
          subject: true,
          body: true,
          bodyHtml: true,
          createdAt: true,
        },
      },
    },
  });

  return ticket as TicketWithDetails;
}

/**
 * Get a ticket by ID with full details
 */
export async function getTicketById(id: string): Promise<TicketWithDetails | null> {
  const ticket = await prisma.ticket.findUnique({
    where: { id: BigInt(id) },
    include: {
      assignedTo: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      messages: {
        orderBy: { createdAt: 'asc' },
        select: {
          id: true,
          from: true,
          to: true,
          subject: true,
          body: true,
          bodyHtml: true,
          createdAt: true,
        },
      },
    },
  });

  return ticket as TicketWithDetails | null;
}

/**
 * Valid columns that can be sorted
 */
export const VALID_SORT_COLUMNS = ['id', 'subject', 'emailFrom', 'status', 'category', 'createdAt'] as const;
export type SortColumn = typeof VALID_SORT_COLUMNS[number];
export type SortOrder = 'asc' | 'desc';

/**
 * List tickets with pagination and filtering
 */
export async function listTickets(options: {
  page?: number;
  limit?: number;
  search?: string;
  status?: TicketStatus;
  category?: TicketCategory;
  assignedToId?: string | null;
  sortBy?: SortColumn;
  sortOrder?: SortOrder;
} = {}): Promise<PaginatedTickets> {
  const {
    page = 1,
    limit = 10,
    search,
    status,
    category,
    assignedToId,
    sortBy = 'createdAt',
    sortOrder = 'desc',
  } = options;

  const skip = (page - 1) * limit;

  // Build where clause
  const where: Record<string, any> = {};
  
  // Add search filter
  if (search) {
    where.OR = [
      { subject: { contains: search, mode: 'insensitive' } },
      { description: { contains: search, mode: 'insensitive' } },
      { emailFrom: { contains: search, mode: 'insensitive' } },
      { senderName: { contains: search, mode: 'insensitive' } },
    ];
  }
  
  // Add other filters
  if (status) where.status = status;
  if (category) where.category = category;
  if (assignedToId === null) where.assignedToId = null;
  else if (assignedToId) where.assignedToId = assignedToId;

  // Get total count
  const total = await prisma.ticket.count({ where });

  // Build orderBy clause
  const orderBy: Record<string, any> = {};
  if (VALID_SORT_COLUMNS.includes(sortBy)) {
    orderBy[sortBy] = sortOrder;
  } else {
    orderBy.createdAt = 'desc';
  }

  // Get tickets
  const tickets = await prisma.ticket.findMany({
    where,
    skip,
    take: limit,
    orderBy,
    include: {
      assignedTo: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      messages: {
        orderBy: { createdAt: 'asc' },
        select: {
          id: true,
          from: true,
          to: true,
          subject: true,
          body: true,
          bodyHtml: true,
          createdAt: true,
        },
      },
    },
  });

  return {
    tickets: tickets as TicketWithDetails[],
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
}

/**
 * Update a ticket
 */
export async function updateTicket(
  id: string,
  data: UpdateTicketInput
): Promise<TicketWithDetails> {
  const ticket = await prisma.ticket.update({
    where: { id: BigInt(id) },
    data: {
      ...(data.status && { status: data.status }),
      ...(data.category !== undefined && { category: data.category }),
      ...(data.assignedToId !== undefined && { assignedToId: data.assignedToId }),
    },
    include: {
      assignedTo: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      messages: {
        orderBy: { createdAt: 'asc' },
        select: {
          id: true,
          from: true,
          to: true,
          subject: true,
          body: true,
          bodyHtml: true,
          createdAt: true,
        },
      },
    },
  });

  return ticket as TicketWithDetails;
}

/**
 * Add a message to a ticket
 */
export async function addMessage(
  ticketId: string,
  data: CreateMessageInput
): Promise<TicketWithDetails> {
  const ticket = await prisma.ticket.update({
    where: { id: BigInt(ticketId) },
    data: {
      messages: {
        create: {
          from: data.from,
          to: data.to,
          subject: data.subject,
          body: data.body,
          bodyHtml: data.bodyHtml || null,
          headers: {},
        },
      },
    },
    include: {
      assignedTo: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      messages: {
        orderBy: { createdAt: 'asc' },
        select: {
          id: true,
          from: true,
          to: true,
          subject: true,
          body: true,
          bodyHtml: true,
          createdAt: true,
        },
      },
    },
  });

  return ticket as TicketWithDetails;
}

/**
 * Find ticket by email Message-ID (to avoid duplicates)
 */
export async function findTicketByMessageId(messageId: string): Promise<TicketWithDetails | null> {
  // Search for ticket with message that has this Message-ID in headers
  const message = await prisma.ticketMessage.findFirst({
    where: {
      headers: {
        path: ['messageId'],
        equals: messageId,
      },
    },
    include: {
      ticket: {
        include: {
          assignedTo: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          messages: {
            orderBy: { createdAt: 'asc' },
            select: {
              id: true,
              from: true,
              to: true,
              subject: true,
              body: true,
              bodyHtml: true,
              createdAt: true,
            },
          },
        },
      },
    },
  });

  return message?.ticket as TicketWithDetails | null;
}

/**
 * Find ticket by sender email and subject (fuzzy match for replies)
 */
export async function findTicketBySender(
  emailFrom: string,
  inReplyTo?: string,
  references?: string[]
): Promise<TicketWithDetails | null> {
  // Try to find by In-Reply-To or References headers
  if (inReplyTo || (references && references.length > 0)) {
    const messageIds = [inReplyTo, ...(references || [])].filter(Boolean) as string[];

    const message = await prisma.ticketMessage.findFirst({
      where: {
        OR: messageIds.map((msgId) => ({
          headers: {
            path: ['messageId'],
            equals: msgId,
          },
        })),
      },
      include: {
        ticket: {
          include: {
            assignedTo: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
            messages: {
              orderBy: { createdAt: 'asc' },
              select: {
                id: true,
                from: true,
                to: true,
                subject: true,
                body: true,
                bodyHtml: true,
                createdAt: true,
              },
            },
          },
        },
      },
    });

    if (message?.ticket) {
      return message.ticket as TicketWithDetails;
    }
  }

  // Fallback: find by email and subject match
  const ticket = await prisma.ticket.findFirst({
    where: {
      emailFrom,
      subject: {
        contains: extractSubjectBase(inReplyTo || ''),
        mode: 'insensitive',
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
    include: {
      assignedTo: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      messages: {
        orderBy: { createdAt: 'asc' },
        select: {
          id: true,
          from: true,
          to: true,
          subject: true,
          body: true,
          bodyHtml: true,
          createdAt: true,
        },
      },
    },
  });

  return ticket as TicketWithDetails | null;
}

/**
 * Extract base subject from reply (remove "Re: " prefix)
 */
function extractSubjectBase(subject: string): string {
  return subject.replace(/^(Re|Fw|Fwd):\s*/i, '');
}
