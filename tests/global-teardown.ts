/**
 * Global teardown - runs once after all tests
 * Cleans up the test database
 */
import { dropTestDatabase } from './db-setup';

export default async function globalTeardown() {
  await dropTestDatabase();
}
