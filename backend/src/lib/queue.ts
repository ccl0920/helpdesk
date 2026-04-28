import { PgBoss } from 'pg-boss';

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error('DATABASE_URL environment variable is not set');
}

export const CLASSIFY_TICKET_QUEUE = 'ticket-classification';
export const AUTO_RESOLVE_TICKET_QUEUE = 'ticket-auto-resolution';

export const boss = new PgBoss(connectionString);

boss.on('error', (error: Error) => {
  console.error('[PgBoss] Error:', error);
});

/**
 * Start pg-boss and register workers
 */
export async function startQueue(): Promise<void> {
  await boss.start();
  await boss.createQueue(CLASSIFY_TICKET_QUEUE);
  await boss.createQueue(AUTO_RESOLVE_TICKET_QUEUE);
  console.log('📬 Job queue started');
}

/**
 * Stop pg-boss gracefully
 */
export async function stopQueue(): Promise<void> {
  await boss.stop();
  console.log('📬 Job queue stopped');
}

/**
 * Enqueue a ticket classification job
 */
export async function enqueueClassifyTicket(ticketId: bigint): Promise<void> {
  await boss.send(CLASSIFY_TICKET_QUEUE, { ticketId: ticketId.toString() });
}

/**
 * Enqueue a ticket auto-resolution job
 */
export async function enqueueAutoResolveTicket(ticketId: bigint): Promise<void> {
  await boss.send(AUTO_RESOLVE_TICKET_QUEUE, { ticketId: ticketId.toString() });
}
