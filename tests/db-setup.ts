import { execSync } from 'child_process';
import { config } from 'dotenv';
import { resolve } from 'path';

/**
 * Load environment variables from .env.test in backend directory
 */
config({ path: resolve(__dirname, '../backend/.env.test') });

const TEST_DATABASE_URL = process.env.TEST_DATABASE_URL;

if (!TEST_DATABASE_URL) {
  throw new Error('TEST_DATABASE_URL is not set in .env.test');
}

/**
 * Extract database name from connection URL
 */
function getDatabaseName(url: string): string {
  const match = url.match(/\/([^?\/\s]+)(\?|$)/);
  if (!match) {
    throw new Error('Could not extract database name from TEST_DATABASE_URL');
  }
  return match[1];
}

/**
 * Extract base URL (without database name) from connection URL
 */
function getBasePostgresUrl(url: string): string {
  // Remove the database name from the URL to connect to postgres default database
  return url.replace(/\/([^?\/\s]+)(\?|$)/, '/postgres');
}

/**
 * Create a fresh test database
 */
export async function createTestDatabase(): Promise<void> {
  const dbName = getDatabaseName(TEST_DATABASE_URL);
  const dbUrl = new URL(TEST_DATABASE_URL);
  const dbPassword = dbUrl.password || '';
  const dbUser = dbUrl.username;
  const dbHost = dbUrl.hostname;

  console.log(`Setting up test database: ${dbName}`);

  try {
    // Drop database if exists (in case of previous failed runs)
    console.log(`Dropping database ${dbName} if exists...`);
    execSync(`psql -h ${dbHost} -U ${dbUser} -d postgres -c "DROP DATABASE IF EXISTS ${dbName} WITH (FORCE);"`, {
      stdio: 'pipe',
      env: { ...process.env, PGPASSWORD: dbPassword }
    });
  } catch (error) {
    // Ignore errors - database might not exist
  }

  // Create fresh database
  console.log(`Creating database ${dbName}...`);
  execSync(`psql -h ${dbHost} -U ${dbUser} -d postgres -c "CREATE DATABASE ${dbName};"`, {
    stdio: 'inherit',
    env: { ...process.env, PGPASSWORD: dbPassword }
  });

  // Run migrations on test database
  console.log('Running Prisma migrations on test database...');
  execSync('bunx prisma migrate dev', {
    cwd: resolve(__dirname, '../backend'),
    stdio: 'inherit',
    env: { ...process.env, DATABASE_URL: TEST_DATABASE_URL }
  });

  // Seed the test database
  console.log('Seeding test database...');
  execSync('bun run db:seed', {
    cwd: resolve(__dirname, '../backend'),
    stdio: 'inherit',
    env: { ...process.env, DATABASE_URL: TEST_DATABASE_URL }
  });

  console.log('Test database setup complete!');
}

/**
 * Drop the test database
 */
export async function dropTestDatabase(): Promise<void> {
  const dbName = getDatabaseName(TEST_DATABASE_URL);
  const dbUrl = new URL(TEST_DATABASE_URL);
  const dbPassword = dbUrl.password || '';
  const dbUser = dbUrl.username;
  const dbHost = dbUrl.hostname;

  console.log(`Tearing down test database: ${dbName}`);

  try {
    // Drop the database
    console.log(`Dropping database ${dbName}...`);
    execSync(`psql -h ${dbHost} -U ${dbUser} -d postgres -c "DROP DATABASE IF EXISTS ${dbName} WITH (FORCE);"`, {
      stdio: 'inherit',
      env: { ...process.env, PGPASSWORD: dbPassword }
    });
    console.log('Test database teardown complete!');
  } catch (error) {
    console.error('Error dropping test database:', error);
    throw error;
  }
}
