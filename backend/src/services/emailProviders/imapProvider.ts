import * as Sentry from '@sentry/node';
import Imap from 'imap';
import { simpleParser } from 'mailparser';
import { processIncomingEmail } from '../emailIngestor.js';

/**
 * IMAP configuration
 */
export interface ImapConfig {
  host: string;
  port: number;
  user: string;
  password: string;
  tls?: boolean;
  mailbox?: string;
  pollingInterval?: number; // milliseconds
}

/**
 * Processed UID tracker to avoid re-processing emails
 */
let processedUids: Set<string> = new Set();

let imapConnection: Imap | null = null;
let pollingTimer: NodeJS.Timeout | null = null;
let isRunning = false;

/**
 * Start IMAP polling to check for new emails
 * 
 * @param config - IMAP configuration
 */
export function startImapPolling(config: ImapConfig): void {
  const {
    host,
    port,
    user,
    password,
    tls = true,
    mailbox = 'INBOX',
    pollingInterval = 30000,
  } = config;

  console.log(`📬 Starting IMAP polling for ${user}@${host}:${port}`);

  imapConnection = new Imap({
    user,
    password,
    host,
    port,
    tls,
    tlsOptions: { rejectUnauthorized: false }, // Allow self-signed certs in dev
  });

  // Handle connection events
  imapConnection.once('ready', () => {
    console.log('✅ IMAP connection established');
    
    // Open mailbox and start polling
    openMailboxAndPoll(mailbox, pollingInterval);
  });

  imapConnection.on('error', (err: Error) => {
    Sentry.withScope((scope) => {
      scope.setTag('component', 'imap-provider');
      scope.setTag('action', 'connection-error');
      scope.setContext('imap', { host: config.host, user: config.user });
      Sentry.captureMessage(`IMAP connection error: ${err.message}`, 'error');
    });

    // Attempt reconnect after error
    if (isRunning) {
      console.log('🔄 Attempting IMAP reconnect...');
      setTimeout(() => {
        if (isRunning && imapConnection) {
          imapConnection.connect();
        }
      }, 5000);
    }
  });

  imapConnection.on('close', () => {
    console.log('⚠️  IMAP connection closed');
  });

  // Mark as running and connect
  isRunning = true;
  imapConnection.connect();
}

/**
 * Stop IMAP polling and disconnect
 */
export function stopImapPolling(): Promise<void> {
  return new Promise((resolve) => {
    console.log('🛑 Stopping IMAP polling...');
    isRunning = false;

    // Clear polling timer
    if (pollingTimer) {
      clearTimeout(pollingTimer);
      pollingTimer = null;
    }

    // End IMAP connection
    if (imapConnection) {
      imapConnection.end();
      imapConnection = null;
    }

    console.log('✅ IMAP polling stopped');
    resolve();
  });
}

/**
 * Open mailbox and start polling loop
 */
async function openMailboxAndPoll(mailbox: string, interval: number): Promise<void> {
  if (!imapConnection) return;

  try {
    // Open the mailbox
    await openMailbox(mailbox);
    
    // Initial poll
    await pollMailbox(mailbox);

    // Set up recurring poll
    pollingTimer = setInterval(async () => {
      if (isRunning) {
        await pollMailbox(mailbox);
      }
    }, interval);

  } catch (error) {
    Sentry.captureException(error, {
      tags: { component: 'imap-provider', action: 'open-mailbox' },
      extra: { mailbox },
    });

    // Retry after delay
    if (isRunning) {
      setTimeout(() => openMailboxAndPoll(mailbox, interval), 5000);
    }
  }
}

/**
 * Open a specific mailbox folder
 */
function openMailbox(mailbox: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (!imapConnection) {
      reject(new Error('IMAP connection not initialized'));
      return;
    }

    imapConnection.openBox(mailbox, true, (err: Error | null) => {
      if (err) {
        reject(err);
      } else {
        resolve();
      }
    });
  });
}

/**
 * Poll mailbox for unseen emails
 */
async function pollMailbox(mailbox: string): Promise<void> {
  if (!imapConnection) return;

  try {
    // Search for unseen emails
    const messages = await searchUnseenMessages();

    if (messages.length === 0) {
      return; // No new emails
    }

    console.log(`📨 Found ${messages.length} new email(s) in ${mailbox}`);

    // Process each message
    for (const uid of messages) {
      // Skip if already processed
      if (processedUids.has(uid)) {
        continue;
      }

      try {
        await fetchAndProcessMessage(uid);
        processedUids.add(uid);
      } catch (error) {
        Sentry.captureException(error, {
          tags: { component: 'imap-provider', action: 'process-message' },
          extra: { messageUid: uid },
        });
        // Don't add to processedUids, retry next time
      }
    }

  } catch (error) {
    Sentry.captureException(error, {
      tags: { component: 'imap-provider', action: 'poll-mailbox' },
    });
  }
}

/**
 * Search for unseen messages
 */
function searchUnseenMessages(): Promise<string[]> {
  return new Promise((resolve, reject) => {
    if (!imapConnection) {
      reject(new Error('IMAP connection not initialized'));
      return;
    }

    imapConnection.search(['UNSEEN'], (err: Error | null, results: number[]) => {
      if (err) {
        reject(err);
      } else {
        resolve(results.map((id) => id.toString()));
      }
    });
  });
}

/**
 * Fetch and process a single message by UID
 */
async function fetchAndProcessMessage(uid: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (!imapConnection) {
      reject(new Error('IMAP connection not initialized'));
      return;
    }

    const fetch = imapConnection.fetch(uid, {
      bodies: '',
      markSeen: true, // Mark as seen after fetching
    });

    let rawData = '';

    fetch.on('message', (msg: Imap.ImapMessage) => {
      msg.on('body', (stream: NodeJS.ReadableStream) => {
        stream.on('data', (chunk: Buffer) => {
          rawData += chunk.toString('utf8');
        });
      });

      msg.once('end', () => {
        // Process the raw email
        processIncomingEmail(rawData)
          .then(({ ticket, isNew }) => {
            console.log(`  ✅ Ticket ${ticket.id} ${isNew ? 'created' : 'updated'}`);
            resolve();
          })
          .catch((err: Error) => {
            reject(err);
          });
      });
    });

    fetch.once('error', (err: Error) => {
      reject(err);
    });
  });
}

/**
 * Get count of processed UIDs (for monitoring)
 */
export function getProcessedUidCount(): number {
  return processedUids.size;
}
