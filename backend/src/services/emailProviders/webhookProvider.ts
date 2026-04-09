import { Request, Response } from 'express';
import { processIncomingEmail, processParsedEmail } from '../emailIngestor.js';
import crypto from 'crypto';

/**
 * Extract display name from an email address string
 * e.g., "John Doe <john@example.com>" → "John Doe"
 */
function extractNameFromAddress(address: string): string | undefined {
  if (!address) return undefined;
  const match = address.match(/^"?(.+?)"?\s*</);
  if (match && match[1]) {
    return match[1].trim();
  }
  return undefined;
}

/**
 * Webhook provider configuration
 */
interface WebhookConfig {
  /** Secret for signature validation */
  secret?: string;
}

let config: WebhookConfig = {};

/**
 * Initialize webhook provider with configuration
 */
export function initWebhookProvider(webhookConfig: WebhookConfig): void {
  config = webhookConfig;
  console.log('🔗 Webhook provider initialized');
}

/**
 * Webhook endpoint handler
 * 
 * Accepts email from providers via HTTP POST.
 * Supports multiple payload formats:
 * 1. Raw MIME email (multipart/form-data or application/json with `raw` field)
 * 2. Parsed email data (application/json with structured fields)
 * 
 * Common provider mappings:
 * - Mailgun: multipart with body-mime or parsed fields
 * - SendGrid: parsed JSON with from, to, subject, text, html
 * - AWS SES: SNS notification with mail content
 */
export async function handleWebhook(req: Request, res: Response): Promise<void> {
  try {
    // Validate webhook signature if secret is configured
    if (config.secret) {
      const isValid = validateWebhookSignature(req, config.secret);
      if (!isValid) {
        console.error('❌ Webhook signature validation failed');
        res.status(401).json({ error: 'Invalid webhook signature' });
        return;
      }
    }

    let result: { ticket: any; isNew: boolean };

    // Case 1: Raw MIME email (multipart or JSON with `raw` field)
    if (req.body?.raw || req.body?.['body-mime']) {
      const rawEmail = req.body.raw || req.body['body-mime'];
      console.log('📧 Processing raw MIME email from webhook');
      result = await processIncomingEmail(rawEmail);
    }
    // Case 2: Parsed email from provider (Mailgun-style)
    else if (req.body?.['from'] && req.body?.['subject']) {
      console.log('📧 Processing parsed email from webhook (Mailgun-style)');
      const parsedEmail = {
        from: req.body['from'],
        senderName: req.body['from-name'] || extractNameFromAddress(req.body['from']) || req.body['from'],
        to: req.body['to'] || req.body['recipient'] || '',
        subject: req.body['subject'] || '(No Subject)',
        body: req.body['body-plain'] || req.body['body'] || req.body['text'] || '',
        bodyHtml: req.body['body-html'] || req.body['html'] || undefined,
        headers: {},
        messageId: req.body['Message-Id'] || req.body['message-id'] || '',
        inReplyTo: req.body['In-Reply-To'] || req.body['in-reply-to'] || undefined,
        references: req.body['References'] || req.body['references'] || undefined,
        date: req.body['Date'] ? new Date(req.body['Date']) : undefined,
      };
      result = await processParsedEmail(parsedEmail);
    }
    // Case 3: SendGrid-style parsed email
    else if (req.body?.headers?.from || req.body?.from_email) {
      console.log('📧 Processing parsed email from webhook (SendGrid-style)');
      const parsedEmail = {
        from: req.body.from_email || req.body.headers?.from || '',
        senderName: req.body.from_name || req.body.headers?.['from-name'] || extractNameFromAddress(req.body.from_email || req.body.headers?.from || '') || '',
        to: req.body.headers?.to || req.body.to || '',
        subject: req.body.headers?.subject || req.body.subject || '(No Subject)',
        body: req.body.text || req.body.content?.[0]?.value || '',
        bodyHtml: req.body.html || req.body.content?.find((c: any) => c.type === 'text/html')?.value || undefined,
        headers: req.body.headers || {},
        messageId: req.body.headers?.['message-id'] || '',
        inReplyTo: req.body.headers?.['in-reply-to'] || undefined,
        references: req.body.headers?.references || undefined,
        date: req.body.headers?.date ? new Date(req.body.headers.date) : undefined,
      };
      result = await processParsedEmail(parsedEmail);
    }
    // Case 4: Generic JSON with from, to, subject, body
    else if (req.body?.from && req.body?.to && req.body?.body) {
      console.log('📧 Processing parsed email from webhook (generic)');
      const parsedEmail = {
        from: req.body.from,
        senderName: req.body.senderName || req.body.from_name || req.body.fromName || extractNameFromAddress(req.body.from) || req.body.from,
        to: req.body.to,
        subject: req.body.subject || '(No Subject)',
        body: req.body.body,
        bodyHtml: req.body.bodyHtml || req.body.html || undefined,
        headers: req.body.headers || {},
        messageId: req.body.messageId || '',
        inReplyTo: req.body.inReplyTo || undefined,
        references: req.body.references || undefined,
        date: req.body.date ? new Date(req.body.date) : undefined,
      };
      result = await processParsedEmail(parsedEmail);
    }
    else {
      console.error('❌ Unsupported webhook payload format');
      res.status(400).json({
        error: 'Unsupported payload format',
        hint: 'Provide raw MIME in `raw` or `body-mime` field, or parsed fields: from, to, subject, body',
      });
      return;
    }

    // Return success response
    res.status(200).json({
      success: true,
      ticket: {
        id: result.ticket.id.toString(),
        subject: result.ticket.subject,
        senderName: result.ticket.senderName,
        emailFrom: result.ticket.emailFrom,
        status: result.ticket.status,
      },
      isNew: result.isNew,
    });

  } catch (error) {
    console.error('❌ Webhook processing error:', error);
    res.status(500).json({
      error: 'Failed to process webhook',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

/**
 * Validate webhook signature (HMAC SHA256)
 * 
 * Common provider signature formats:
 * - Mailgun: HMAC-SHA256 of timestamp + token
 * - Generic: HMAC-SHA256 of request body
 */
function validateWebhookSignature(req: Request, secret: string): boolean {
  // Mailgun-style signature
  const mailgunSignature = req.body?.signature?.token;
  const mailgunTimestamp = req.body?.signature?.timestamp;
  const mailgunSignatureHash = req.body?.signature?.signature;

  if (mailgunSignature && mailgunTimestamp && mailgunSignatureHash) {
    const expectedHash = crypto
      .createHmac('sha256', secret)
      .update(mailgunTimestamp + mailgunSignature)
      .digest('hex');
    
    return crypto.timingSafeEqual(
      Buffer.from(mailgunSignatureHash),
      Buffer.from(expectedHash)
    );
  }

  // Generic body-based signature (X-Webhook-Signature header)
  const headerSignature = req.headers['x-webhook-signature'] as string;
  if (headerSignature) {
    const bodyHash = crypto
      .createHmac('sha256', secret)
      .update(JSON.stringify(req.body))
      .digest('hex');
    
    return crypto.timingSafeEqual(
      Buffer.from(headerSignature),
      Buffer.from(bodyHash)
    );
  }

  // If no recognized signature format, reject (safe default)
  return false;
}
