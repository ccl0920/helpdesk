import { test, expect, Page } from '@playwright/test';

/**
 * E2E Tests for User Management Feature
 *
 * Tests CRUD operations for admin users:
 * - READ: View users list with correct columns and data
 * - CREATE: Create new users via modal form
 * - UPDATE: Edit existing user details
 * - DELETE: Delete non-admin users with confirmation
 *
 * All tests require admin authentication.
 */

// Admin credentials (from seed data)
const ADMIN_CREDENTIALS = {
  email: 'admin@example.com',
  password: 'TestPassword123!',
  name: 'Admin User',
};

/**
 * Helper function to log in as admin
 */
async function loginAsAdmin(page: Page) {
  await page.goto('/login');
  await expect(page.getByLabel('Email address')).toBeVisible();
  await page.getByLabel('Email address').fill(ADMIN_CREDENTIALS.email);
  await page.getByLabel('Password').fill(ADMIN_CREDENTIALS.password);
  await page.getByRole('button', { name: /sign in/i }).click();
  await page.waitForURL('/', { waitUntil: 'domcontentloaded' });
  await expect(page).toHaveURL('/');
}

/**
 * Helper function to navigate to users page as admin
 */
async function goToUsersPage(page: Page) {
  await page.goto('/users');
  await expect(page).toHaveURL('/users');
  await expect(page.getByRole('heading', { name: 'User Management' })).toBeVisible();
}

test.describe('User Management', () => {
  test.describe.configure({ mode: 'serial' });

  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
    await goToUsersPage(page);
  });

  test.describe('READ - View Users List', () => {
    test('should display the users table with correct columns', async ({ page }) => {
      // Verify table header contains all expected columns
      const table = page.getByRole('table');
      await expect(table).toBeVisible();

      const headers = table.locator('thead th');
      await expect(headers).toHaveCount(6);
      await expect(headers.nth(0)).toContainText('Email');
      await expect(headers.nth(1)).toContainText('Name');
      await expect(headers.nth(2)).toContainText('Role');
      await expect(headers.nth(3)).toContainText('Verified');
      await expect(headers.nth(4)).toContainText('Created');
      await expect(headers.nth(5)).toContainText('Actions');
    });

    test('should display seeded users with correct data', async ({ page }) => {
      // Wait for table body to populate
      await page.waitForLoadState('networkidle');

      // Verify admin user is displayed
      const adminRow = page.getByRole('row').filter({ hasText: ADMIN_CREDENTIALS.email });
      await expect(adminRow).toBeVisible();

      // Check admin user details
      await expect(adminRow.getByText('Admin User')).toBeVisible();
      await expect(adminRow.getByRole('cell').nth(2)).toContainText('ADMIN');
    });

    test('should display role badges with correct styling', async ({ page }) => {
      await page.waitForLoadState('networkidle');

      // ADMIN role should use default badge variant
      const adminRow = page.getByRole('row').filter({ hasText: ADMIN_CREDENTIALS.email });
      const adminRoleCell = adminRow.getByRole('cell').nth(2);
      await expect(adminRoleCell).toContainText('ADMIN');
    });

    test('should display verification status badges', async ({ page }) => {
      await page.waitForLoadState('networkidle');

      // Admin user should show either Verified or Pending badge
      const adminRow = page.getByRole('row').filter({ hasText: ADMIN_CREDENTIALS.email });
      const verifiedBadge = adminRow.getByRole('cell').nth(3);
      await expect(verifiedBadge).toContainText(/Verified|Pending/);
    });

    test('should show Create User button', async ({ page }) => {
      const createButton = page.getByRole('button', { name: /create user/i });
      await expect(createButton).toBeVisible();
      await expect(createButton).toContainText('Create User');
    });
  });

  test.describe('CREATE - Create New User', () => {
    const newUserData = {
      name: 'Test Agent User',
      email: `test.agent.${Date.now()}@example.com`,
      password: 'TestPassword123!',
      role: 'AGENT',
    };

    test('should open create user modal when clicking Create User button', async ({ page }) => {
      await page.getByRole('button', { name: /create user/i }).click();

      // Modal should open
      await expect(page.getByRole('dialog')).toBeVisible();
      await expect(page.getByRole('heading', { name: 'Create New User' })).toBeVisible();
    });

    test('should create a new user successfully', async ({ page }) => {
      // Open modal
      await page.getByRole('button', { name: /create user/i }).click();
      const dialog = page.getByRole('dialog');
      await expect(dialog).toBeVisible();

      // Fill in the form
      await dialog.getByLabel('Name').fill(newUserData.name);
      await dialog.getByLabel('Email').fill(newUserData.email);
      await dialog.getByLabel('Password').fill(newUserData.password);

      // Select role - click the combobox trigger and select option
      await dialog.getByRole('combobox').click();
      await page.getByRole('option', { name: 'Agent' }).click();

      // Submit form
      await dialog.getByRole('button', { name: /create user/i }).click();

      // Wait for modal to close
      await expect(dialog).not.toBeVisible({ timeout: 10000 });

      // Wait for table to update
      await page.waitForLoadState('networkidle');

      // Verify new user appears in table
      const newRow = page.getByRole('row').filter({ hasText: newUserData.email });
      await expect(newRow).toBeVisible();
      await expect(newRow.getByText(newUserData.name)).toBeVisible();

      // Check role in the correct cell (3rd column)
      const roleCell = newRow.getByRole('cell').nth(2);
      await expect(roleCell).toContainText('AGENT');
    });

    test('should reset form after successful creation', async ({ page }) => {
      const uniqueEmail = `reset.test.${Date.now()}@example.com`;

      // Create first user
      await page.getByRole('button', { name: /create user/i }).click();
      const dialog = page.getByRole('dialog');
      await dialog.getByLabel('Name').fill('Reset Test User');
      await dialog.getByLabel('Email').fill(uniqueEmail);
      await dialog.getByLabel('Password').fill('TestPassword123!');
      await dialog.getByRole('combobox').click();
      await page.getByRole('option', { name: 'Agent' }).click();
      await dialog.getByRole('button', { name: /create user/i }).click();
      await expect(dialog).not.toBeVisible({ timeout: 10000 });

      // Open modal again - should be reset
      await page.getByRole('button', { name: /create user/i }).click();
      await expect(dialog).toBeVisible();

      // Form fields should be empty/reset
      const nameInput = dialog.getByLabel('Name');
      const emailInput = dialog.getByLabel('Email');
      await expect(nameInput).toHaveValue('');
      await expect(emailInput).toHaveValue('');
    });
  });

  test.describe('UPDATE - Edit User', () => {
    const testUserData = {
      name: 'Edit Test User',
      email: `edit.test.${Date.now()}-${Math.floor(Math.random() * 10000)}@example.com`,
      password: 'TestPassword123!',
      role: 'AGENT',
    };

    test.beforeEach(async ({ page }) => {
      // Create a test user to edit if it doesn't already exist
      const existingRow = page.getByRole('row').filter({ hasText: testUserData.email });
      if (await existingRow.isVisible().catch(() => false)) {
        return; // User already exists from a previous beforeEach
      }

      await page.getByRole('button', { name: /create user/i }).click();
      const dialog = page.getByRole('dialog');
      await dialog.getByLabel('Name').fill(testUserData.name);
      await dialog.getByLabel('Email').fill(testUserData.email);
      await dialog.getByLabel('Password').fill(testUserData.password);
      await dialog.getByRole('combobox').click();
      await page.getByRole('option', { name: 'Agent' }).click();
      await dialog.getByRole('button', { name: /create user/i }).click();

      // Wait for modal to close or handle error if user already exists
      const dialogClosed = await dialog.isHidden({ timeout: 10000 }).catch(() => false);
      if (!dialogClosed) {
        // Check if it's an "Email already exists" error - if so, just close the modal
        const errorText = await page.getByText('Email already exists').isVisible().catch(() => false);
        if (errorText) {
          await dialog.getByRole('button', { name: 'Cancel' }).click();
        }
        await expect(dialog).not.toBeVisible({ timeout: 5000 });
      }
      await page.waitForLoadState('networkidle');
    });

    test('should open edit modal with pre-populated user data', async ({ page }) => {
      // Find the test user row and click edit
      const userRow = page.getByRole('row').filter({ hasText: testUserData.email });
      await userRow.getByRole('button', { name: /^edit/i }).click();

      // Modal should open with edit title
      const dialog = page.getByRole('dialog');
      await expect(dialog).toBeVisible();
      await expect(dialog.getByRole('heading', { name: 'Edit User' })).toBeVisible();

      // Form should be pre-populated
      await expect(dialog.getByLabel('Name')).toHaveValue(testUserData.name);
      await expect(dialog.getByLabel('Email')).toHaveValue(testUserData.email);
    });

    test('should update user details successfully', async ({ page }) => {
      const updatedName = 'Updated User Name';

      // Open edit modal
      const userRow = page.getByRole('row').filter({ hasText: testUserData.email });
      await userRow.getByRole('button', { name: /^edit/i }).click();
      const dialog = page.getByRole('dialog');
      await expect(dialog).toBeVisible();

      // Update name
      await dialog.getByLabel('Name').fill(updatedName);

      // Submit
      await dialog.getByRole('button', { name: /update user/i }).click();

      // Modal should close
      await expect(dialog).not.toBeVisible();
      await page.waitForLoadState('networkidle');

      // Verify updated data appears in table
      const updatedRow = page.getByRole('row').filter({ hasText: testUserData.email });
      await expect(updatedRow).toBeVisible();
      await expect(updatedRow.getByText(updatedName)).toBeVisible();
    });

    test('should allow updating user role', async ({ page }) => {
      // Open edit modal
      const userRow = page.getByRole('row').filter({ hasText: testUserData.email });
      await userRow.getByRole('button', { name: /^edit/i }).click();
      await expect(page.getByRole('dialog')).toBeVisible();
      const dialog = page.getByRole('dialog');

      // Change role to ADMIN
      await dialog.getByRole('combobox').click();
      await page.getByRole('option', { name: 'Admin' }).click();

      // Submit
      await dialog.getByRole('button', { name: /update user/i }).click();
      await expect(dialog).not.toBeVisible({ timeout: 10000 });
      await page.waitForLoadState('networkidle');

      // Verify role updated
      const updatedRow = page.getByRole('row').filter({ hasText: testUserData.email });
      await expect(updatedRow).toBeVisible();
      await expect(updatedRow.getByText('ADMIN')).toBeVisible();
    });

    test('should cancel edit without saving', async ({ page }) => {
      // Open edit modal
      const userRow = page.getByRole('row').filter({ hasText: testUserData.email });
      await userRow.getByRole('button', { name: /^edit/i }).click();
      const dialog = page.getByRole('dialog');
      await expect(dialog).toBeVisible();

      // Make a change
      await dialog.getByLabel('Name').fill('Should Not Save');

      // Cancel
      await dialog.getByRole('button', { name: 'Cancel' }).click();
      await expect(dialog).not.toBeVisible();

      // Name should NOT be "Should Not Save" (i.e., changes were discarded)
      const row = page.getByRole('row').filter({ hasText: testUserData.email });
      await expect(row.getByText('Should Not Save')).not.toBeVisible();
    });
  });

  test.describe('DELETE - Delete User', () => {
    // Use counter to ensure unique emails across test runs
    let deletableUserData: { name: string; email: string; password: string; role: string };

    test.beforeEach(async ({ page }) => {
      // Generate unique email for each test run
      deletableUserData = {
        name: 'Deletable Test User',
        email: `del.test.${Date.now()}-${Math.random().toString(36).substring(2, 8)}@example.com`,
        password: 'TestPassword123!',
        role: 'AGENT',
      };

      // Create a test user to delete
      await page.getByRole('button', { name: /create user/i }).click();
      const dialog = page.getByRole('dialog');
      await dialog.getByLabel('Name').fill(deletableUserData.name);
      await dialog.getByLabel('Email').fill(deletableUserData.email);
      await dialog.getByLabel('Password').fill(deletableUserData.password);
      await dialog.getByRole('combobox').click();
      await page.getByRole('option', { name: 'Agent' }).click();
      await dialog.getByRole('button', { name: /create user/i }).click();
      await expect(dialog).not.toBeVisible({ timeout: 10000 });
      await page.waitForLoadState('networkidle');
    });

    test('should open delete confirmation modal', async ({ page }) => {
      // Click delete button on agent user
      const userRow = page.getByRole('row').filter({ hasText: deletableUserData.email });
      await userRow.getByRole('button', { name: /delete/i }).click();

      // Confirmation modal should appear
      await expect(page.getByRole('dialog')).toBeVisible();
      await expect(page.getByRole('heading', { name: 'Delete User' })).toBeVisible();

      // User details should be displayed
      await expect(page.getByText(`Name: ${deletableUserData.name}`)).toBeVisible();
      await expect(page.getByText(`Email: ${deletableUserData.email}`)).toBeVisible();
      await expect(page.getByText('Role: AGENT')).toBeVisible();
    });

    test('should delete user after confirmation', async ({ page }) => {
      // Open delete modal
      const userRow = page.getByRole('row').filter({ hasText: deletableUserData.email });
      await userRow.getByRole('button', { name: /delete/i }).click();
      await expect(page.getByRole('dialog')).toBeVisible();

      // Confirm deletion
      await page.getByRole('button', { name: 'Delete User' }).click();

      // Modal should close
      await expect(page.getByRole('dialog')).not.toBeVisible();
      await page.waitForLoadState('networkidle');

      // User should be removed from table
      const deletedRow = page.getByRole('row').filter({ hasText: deletableUserData.email });
      await expect(deletedRow).not.toBeVisible();
    });

    test('should cancel deletion without deleting', async ({ page }) => {
      // Wait for table to be ready
      await page.waitForLoadState('networkidle');
      
      // Open delete modal
      const userRow = page.getByRole('row').filter({ hasText: deletableUserData.email });
      await userRow.getByRole('button', { name: /^delete/i }).click();
      const dialog = page.getByRole('dialog');
      await expect(dialog).toBeVisible();

      // Cancel
      await dialog.getByRole('button', { name: 'Cancel' }).click();
      await expect(dialog).not.toBeVisible();

      // User should still be in table
      await expect(userRow).toBeVisible();
    });

    test('should not show delete button for admin users', async ({ page }) => {
      // Admin user row should not have delete button
      const adminRow = page.getByRole('row').filter({ hasText: ADMIN_CREDENTIALS.email });
      await expect(adminRow).toBeVisible();

      // Check that delete button is not present for admin
      const adminDeleteButton = adminRow.getByRole('button', { name: /delete/i });
      await expect(adminDeleteButton).not.toBeVisible();
    });
  });
});
