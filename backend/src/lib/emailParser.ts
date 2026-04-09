import { simpleParser, ParsedMail } from 'mailparser';

/**
 * Represents a parsed email with extracted fields
 */
export interface ParsedEmail {
  /** Email sender address */
  from: string;
  /** Sender display name */
  senderName: string;
  /** Email recipient address */
  to: string;
  /** Email subject */
  subject: string;
  /** Plain text body */
  body: string;
  /** HTML body (if available) */
  bodyHtml?: string;
  /** Raw email headers as key-value pairs */
  headers: Record<string, string>;
  /** Unique Message-ID from email headers */
  messageId: string;
  /** In-Reply-To header (for reply threading) */
  inReplyTo?: string;
  /** References header (for reply threading) */
  references?: string[];
  /** Date the email was sent */
  date?: Date;
}

/**
 * Parse raw email content (MIME format) into structured data
 * 
 * @param rawEmail - Raw email content as string or buffer
 * @returns Parsed email data with extracted fields
 */
export async function parseEmail(rawEmail: string | Buffer): Promise<ParsedEmail> {
  try {
    const parsed: ParsedMail = await simpleParser(rawEmail);

    // Extract text content (prefer text/plain, fallback to HTML)
    const body = parsed.text || parsed.html || '';
    const bodyHtml = parsed.html || undefined;

    // Extract headers into a flat record
    const headers: Record<string, string> = {};
    if (parsed.headerLines) {
      for (const header of parsed.headerLines) {
        headers[header.key.toLowerCase()] = header.line;
      }
    }

    // Extract addresses (handle both string and object formats)
    const extractEmail = (addr: any): string => {
      if (!addr) return '';
      if (typeof addr === 'string') return addr;
      if (Array.isArray(addr)) return addr[0]?.address || '';
      return addr.address || '';
    };

    // Extract display name from address
    const extractSenderName = (addr: any): string => {
      if (!addr) return '';
      if (typeof addr === 'string') return '';
      if (Array.isArray(addr)) return addr[0]?.name || '';
      return addr.name || '';
    };

    // Extract Message-ID and threading headers
    const messageId = parsed.messageId || '';
    const inReplyTo = parsed.inReplyTo;
    const references = parsed.references;

    return {
      from: extractEmail(parsed.from),
      senderName: extractSenderName(parsed.from),
      to: extractEmail(parsed.to),
      subject: parsed.subject || '(No Subject)',
      body: typeof body === 'string' ? body : '',
      bodyHtml,
      headers,
      messageId,
      inReplyTo,
      references: Array.isArray(references) ? references : (references ? [references] : undefined),
      date: parsed.date || undefined,
    };
  } catch (error) {
    throw new Error(`Failed to parse email: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Extract ticket reference ID from email headers
 * Looks for ticket ID in In-Reply-To or References headers
 * 
 * Convention: Tickets can be referenced by Message-ID pattern
 * e.g., <ticket-abc123@helpdesk.local>
 * 
 * @param parsedEmail - Parsed email data
 * @returns Ticket ID if found, null otherwise
 */
export function extractTicketIdFromHeaders(parsedEmail: ParsedEmail): string | null {
  // Check In-Reply-To for ticket reference
  if (parsedEmail.inReplyTo) {
    const match = parsedEmail.inReplyTo.match(/<ticket-([a-z0-9]+)@/);
    if (match) return match[1];
  }

  // Check References for ticket reference
  if (parsedEmail.references && parsedEmail.references.length > 0) {
    const lastRef = parsedEmail.references[parsedEmail.references.length - 1];
    const match = lastRef.match(/<ticket-([a-z0-9]+)@/);
    if (match) return match[1];
  }

  return null;
}
