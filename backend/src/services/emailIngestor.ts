import { parseEmail, type ParsedEmail } from '../lib/emailParser.js';
import {
  createTicket,
  addMessage,
  findTicketByMessageId,
  findTicketBySender,
  type TicketWithDetails,
} from './ticketService.js';
import { SenderType } from '@helpdesk/common';
import prisma from '../lib/prisma.js';
import { classifyTicket } from '../lib/classification.js';

/**
 * Process incoming raw email and create/update ticket
 * 
 * This is the core ingestion function called by both IMAP and webhook providers.
 * It handles:
 * - Parsing raw email into structured data
 * - Deduplication via Message-ID
 * - Reply threading (linking to existing tickets)
 * - Creating new tickets or appending messages
 * 
 * @param rawEmail - Raw email content (MIME format)
 * @returns The ticket that was created or updated
 */
export async function processIncomingEmail(rawEmail: string | Buffer): Promise<{
  ticket: TicketWithDetails;
  isNew: boolean;
}> {
  // Step 1: Parse the email
  const parsedEmail = await parseEmail(rawEmail);
  console.log(`📧 Processing email from ${parsedEmail.from}: ${parsedEmail.subject}`);

  // Step 2: Check for duplicate by Message-ID
  if (parsedEmail.messageId) {
    const existingByMessageId = await findTicketByMessageId(parsedEmail.messageId);
    if (existingByMessageId) {
      console.log(`⏭️  Duplicate email detected (Message-ID: ${parsedEmail.messageId}), skipping`);
      return { ticket: existingByMessageId, isNew: false };
    }
  }

  // Step 3: Try to find existing ticket for reply threading
  const existingTicket = await findTicketBySender(
    parsedEmail.from,
    parsedEmail.inReplyTo,
    parsedEmail.references
  );

  let ticket: TicketWithDetails;
  let isNew: boolean;

  if (existingTicket) {
    // Step 4a: Append message to existing ticket
    console.log(`📎 Appending message to existing ticket ${existingTicket.id}`);
    ticket = await addMessage(existingTicket.id.toString(), {
      from: parsedEmail.from,
      to: parsedEmail.to,
      subject: parsedEmail.subject,
      body: parsedEmail.body,
      bodyHtml: parsedEmail.bodyHtml,
      senderType: SenderType.CUSTOMER,
    });

    // Store Message-ID in the new message headers
    if (parsedEmail.messageId) {
      const latestMessage = ticket.messages[ticket.messages.length - 1];
      await prisma.ticketMessage.update({
        where: { id: latestMessage.id },
        data: {
          headers: {
            messageId: parsedEmail.messageId,
            inReplyTo: parsedEmail.inReplyTo || null,
            references: parsedEmail.references || null,
          },
        },
      });
    }

    isNew = false;
  } else {
    // Step 4b: Create new ticket
    console.log(`🎫 Creating new ticket from ${parsedEmail.from}`);
    ticket = await createTicket({
      subject: parsedEmail.subject,
      description: parsedEmail.body,
      emailFrom: parsedEmail.from,
      senderName: parsedEmail.senderName,
      emailTo: parsedEmail.to,
    });

    // Store Message-ID in the first message headers
    if (parsedEmail.messageId) {
      const latestMessage = ticket.messages[ticket.messages.length - 1];
      await prisma.ticketMessage.update({
        where: { id: latestMessage.id },
        data: {
          headers: {
            messageId: parsedEmail.messageId,
            inReplyTo: parsedEmail.inReplyTo || null,
            references: parsedEmail.references || null,
          },
        },
      });
    }

    isNew = true;
  }

  // Non-blocking automatic classification for new tickets
  if (isNew) {
    classifyTicket(ticket.id).catch(() => {
      // Errors are logged inside classifyTicket
    });
  }

  console.log(`✅ Ticket ${ticket.id} ${isNew ? 'created' : 'updated'} successfully`);
  return { ticket, isNew };
}

/**
 * Process incoming email from already-parsed data
 * 
 * Use this when the email provider (e.g., webhook) has already parsed the email
 * and you're receiving structured data instead of raw MIME.
 * 
 * @param parsedEmail - Already parsed email data
 * @returns The ticket that was created or updated
 */
export async function processParsedEmail(parsedEmail: ParsedEmail): Promise<{
  ticket: TicketWithDetails;
  isNew: boolean;
}> {
  console.log(`📧 Processing parsed email from ${parsedEmail.from}: ${parsedEmail.subject}`);

  // Check for duplicate by Message-ID
  if (parsedEmail.messageId) {
    const existingByMessageId = await findTicketByMessageId(parsedEmail.messageId);
    if (existingByMessageId) {
      console.log(`⏭️  Duplicate email detected (Message-ID: ${parsedEmail.messageId}), skipping`);
      return { ticket: existingByMessageId, isNew: false };
    }
  }

  // Try to find existing ticket for reply threading
  const existingTicket = await findTicketBySender(
    parsedEmail.from,
    parsedEmail.inReplyTo,
    parsedEmail.references
  );

  let ticket: TicketWithDetails;
  let isNew: boolean;

  if (existingTicket) {
    console.log(`📎 Appending message to existing ticket ${existingTicket.id}`);
    ticket = await addMessage(existingTicket.id.toString(), {
      from: parsedEmail.from,
      to: parsedEmail.to,
      subject: parsedEmail.subject,
      body: parsedEmail.body,
      bodyHtml: parsedEmail.bodyHtml,
      senderType: SenderType.CUSTOMER,
    });

    // Store Message-ID in the new message headers
    if (parsedEmail.messageId) {
      const latestMessage = ticket.messages[ticket.messages.length - 1];
      await prisma.ticketMessage.update({
        where: { id: latestMessage.id },
        data: {
          headers: {
            messageId: parsedEmail.messageId,
            inReplyTo: parsedEmail.inReplyTo || null,
            references: parsedEmail.references || null,
          },
        },
      });
    }

    isNew = false;
  } else {
    console.log(`🎫 Creating new ticket from ${parsedEmail.from}`);
    ticket = await createTicket({
      subject: parsedEmail.subject,
      description: parsedEmail.body,
      emailFrom: parsedEmail.from,
      senderName: parsedEmail.senderName,
      emailTo: parsedEmail.to,
    });

    // Store Message-ID in the first message headers
    if (parsedEmail.messageId) {
      const latestMessage = ticket.messages[ticket.messages.length - 1];
      await prisma.ticketMessage.update({
        where: { id: latestMessage.id },
        data: {
          headers: {
            messageId: parsedEmail.messageId,
            inReplyTo: parsedEmail.inReplyTo || null,
            references: parsedEmail.references || null,
          },
        },
      });
    }

    isNew = true;
  }

  // Non-blocking automatic classification for new tickets
  if (isNew) {
    classifyTicket(ticket.id).catch(() => {
      // Errors are logged inside classifyTicket
    });
  }

  console.log(`✅ Ticket ${ticket.id} ${isNew ? 'created' : 'updated'} successfully`);
  return { ticket, isNew };
}
