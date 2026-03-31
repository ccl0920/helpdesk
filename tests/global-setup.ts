/**
 * Global setup - runs once before all tests
 * Sets up the test database
 */
import { createTestDatabase } from './db-setup';

export default async function globalSetup() {
  await createTestDatabase();
}
