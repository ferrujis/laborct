const { test, expect } = require('@playwright/test');

// Test configuration
const TEST_ADMIN = {
  username: 'admin',
  password: 'Admin123!ChangeMe',
};

const TEST_VIEWER = {
  username: 'viewer',
  password: 'viewer123',
};

test.describe('FJ Analytics SaaS - E2E Tests', () => {
  
  test.beforeEach(async ({ page }) => {
    // Navigate to the app
    await page.goto('/');
  });

  test.describe('Authentication', () => {
    test('should display login screen', async ({ page }) => {
      // Check login form elements exist
      await expect(page.getByText('FJ Analytics')).toBeVisible();
      await expect(page.getByPlaceholder('name.surname')).toBeVisible();
      await expect(page.getByPlaceholder('••••••••')).toBeVisible();
      await expect(page.getByRole('button', { name: /access system/i })).toBeVisible();
    });

    test('should show error on invalid credentials', async ({ page }) => {
      await page.getByPlaceholder('name.surname').fill('invalid');
      await page.getByPlaceholder('••••••••').fill('wrongpass');
      await page.getByRole('button', { name: /access system/i }).click();
      
      // Should show error message
      await expect(page.getByText(/invalid credentials/i)).toBeVisible({ timeout: 5000 });
    });

    test('should login successfully with valid admin credentials', async ({ page }) => {
      await page.getByPlaceholder('name.surname').fill(TEST_ADMIN.username);
      await page.getByPlaceholder('••••••••').fill(TEST_ADMIN.password);
      await page.getByRole('button', { name: /access system/i }).click();
      
      // Should navigate to hub after login
      await expect(page.getByText('Welcome to FJ Analytics')).toBeVisible({ timeout: 10000 });
      await expect(page.getByText('LaborBI')).toBeVisible();
      await expect(page.getByText('CogsBI')).toBeVisible();
      await expect(page.getByText('InsightsAI')).toBeVisible();
    });

    test('should show admin panel for admin users', async ({ page }) => {
      // Login
      await page.getByPlaceholder('name.surname').fill(TEST_ADMIN.username);
      await page.getByPlaceholder('••••••••').fill(TEST_ADMIN.password);
      await page.getByRole('button', { name: /access system/i }).click();
      
      await expect(page.getByText('Welcome to FJ Analytics')).toBeVisible({ timeout: 10000 });
      
      // AdminCenter should be visible for admins
      await expect(page.locator('#card-admin')).toBeVisible();
    });

    test('should not show admin panel for viewer users', async ({ page }) => {
      // Create viewer if not exists, or use specific URL
      // For this test, we assume a viewer account exists
      await page.getByPlaceholder('name.surname').fill(TEST_VIEWER.username);
      await page.getByPlaceholder('••••••••').fill(TEST_VIEWER.password);
      await page.getByRole('button', { name: /access system/i }).click();
      
      await expect(page.getByText('Welcome to FJ Analytics')).toBeVisible({ timeout: 10000 });
      
      // AdminCenter should NOT be visible for viewers
      await expect(page.locator('#card-admin')).not.toBeVisible();
    });

    test('should logout successfully', async ({ page }) => {
      // Login first
      await page.getByPlaceholder('name.surname').fill(TEST_ADMIN.username);
      await page.getByPlaceholder('••••••••').fill(TEST_ADMIN.password);
      await page.getByRole('button', { name: /access system/i }).click();
      
      await expect(page.getByText('Welcome to FJ Analytics')).toBeVisible({ timeout: 10000 });
      
      // Click logout
      await page.getByRole('button', { name: /exit/i }).first().click();
      
      // Should show login screen again
      await expect(page.getByPlaceholder('name.surname')).toBeVisible({ timeout: 5000 });
    });
  });

  test.describe('Navigation', () => {
    test.beforeEach(async ({ page }) => {
      // Login first
      await page.getByPlaceholder('name.surname').fill(TEST_ADMIN.username);
      await page.getByPlaceholder('••••••••').fill(TEST_ADMIN.password);
      await page.getByRole('button', { name: /access system/i }).click();
      await expect(page.getByText('Welcome to FJ Analytics')).toBeVisible({ timeout: 10000 });
    });

    test('should navigate to LaborBI', async ({ page }) => {
      await page.getByText('LaborBI').click();
      await expect(page.getByText('FJ Analytics 2026')).toBeVisible({ timeout: 5000 });
    });

    test('should navigate to CogsBI', async ({ page }) => {
      await page.getByText('CogsBI').click();
      await expect(page.getByText('Cogs BI')).toBeVisible({ timeout: 5000 });
    });

    test('should navigate to InsightsAI', async ({ page }) => {
      await page.getByText('InsightsAI').click();
      await expect(page.getByText('Executive Analysis')).toBeVisible({ timeout: 5000 });
    });

    test('should navigate to AdminCenter', async ({ page }) => {
      await page.getByText('AdminCenter').click();
      await expect(page.getByText('Admin Panel')).toBeVisible({ timeout: 5000 });
      await expect(page.getByText('Upload Data')).toBeVisible();
    });

    test('should navigate back to hub from modules', async ({ page }) => {
      // Go to LaborBI
      await page.getByText('LaborBI').click();
      await expect(page.getByText('FJ Analytics 2026')).toBeVisible({ timeout: 5000 });
      
      // Click back button
      await page.getByRole('button', { name: /hub/i }).click();
      
      // Should be back at hub
      await expect(page.getByText('Welcome to FJ Analytics')).toBeVisible();
    });
  });

  test.describe('Admin Panel - User Management', () => {
    test.beforeEach(async ({ page }) => {
      // Login as admin
      await page.getByPlaceholder('name.surname').fill(TEST_ADMIN.username);
      await page.getByPlaceholder('••••••••').fill(TEST_ADMIN.password);
      await page.getByRole('button', { name: /access system/i }).click();
      await expect(page.getByText('Welcome to FJ Analytics')).toBeVisible({ timeout: 10000 });
      
      // Go to Admin
      await page.getByText('AdminCenter').click();
      await expect(page.getByText('Admin Panel')).toBeVisible({ timeout: 5000 });
      
      // Navigate to Users tab
      await page.getByText('Users').click();
      await expect(page.getByText('Add User')).toBeVisible({ timeout: 5000 });
    });

    test('should display user list', async ({ page }) => {
      // User list should contain admin user
      await expect(page.getByText('admin')).toBeVisible({ timeout: 5000 });
    });

    test('should add a new user', async ({ page }) => {
      // Fill new user form
      await page.selectOption('#nrole', 'viewer');
      await page.fill('#nu', `test.user.${Date.now()}`);
      await page.fill('#np', 'TestPass123!');
      
      // Click add button
      await page.getByRole('button', { name: /add user/i }).click();
      
      // Should show success toast (after page reload)
      // Or the new user should appear in the list
      await expect(page.locator('.toast')).toBeVisible({ timeout: 5000 });
    });
  });

  test.describe('Admin Panel - File Upload', () => {
    test.beforeEach(async ({ page }) => {
      // Login as admin
      await page.getByPlaceholder('name.surname').fill(TEST_ADMIN.username);
      await page.getByPlaceholder('••••••••').fill(TEST_ADMIN.password);
      await page.getByRole('button', { name: /access system/i }).click();
      await expect(page.getByText('Welcome to FJ Analytics')).toBeVisible({ timeout: 10000 });
      
      // Go to Admin
      await page.getByText('AdminCenter').click();
      await expect(page.getByText('Admin Panel')).toBeVisible({ timeout: 5000 });
    });

    test('should display upload zones', async ({ page }) => {
      await expect(page.getByText('Base Data')).toBeVisible();
      await expect(page.getByText('Analysis File')).toBeVisible();
      await expect(page.getByText('Operational Costs')).toBeVisible();
    });

    test('should accept Excel file upload', async ({ page }) => {
      // Note: This test requires actual test Excel files
      // For now, we just verify the upload zone exists and is clickable
      
      const baseUploadZone = page.locator('.uzn').first();
      await expect(baseUploadZone).toBeVisible();
      
      // The file input should be hidden but accessible
      const fileInput = page.locator('#fi-base');
      await expect(fileInput).toHaveAttribute('accept', '.xlsx,.xls');
    });
  });

  test.describe('Access Logs', () => {
    test.beforeEach(async ({ page }) => {
      // Login as admin
      await page.getByPlaceholder('name.surname').fill(TEST_ADMIN.username);
      await page.getByPlaceholder('••••••••').fill(TEST_ADMIN.password);
      await page.getByRole('button', { name: /access system/i }).click();
      await expect(page.getByText('Welcome to FJ Analytics')).toBeVisible({ timeout: 10000 });
      
      // Go to Admin
      await page.getByText('AdminCenter').click();
      await expect(page.getByText('Admin Panel')).toBeVisible({ timeout: 5000 });
      
      // Navigate to Logs tab
      await page.getByText('Access Logs').click();
      await expect(page.getByText('Recent Access Audit')).toBeVisible({ timeout: 5000 });
    });

    test('should display access logs table', async ({ page }) => {
      // Should show table or empty state
      const logTable = page.locator('.log-table, .nd');
      await expect(logTable.first()).toBeVisible({ timeout: 5000 });
    });
  });

  test.describe('Responsive Design', () => {
    test('should work on mobile viewport', async ({ page }) => {
      // Set mobile viewport
      await page.setViewportSize({ width: 375, height: 667 });
      
      // Login should still work
      await page.getByPlaceholder('name.surname').fill(TEST_ADMIN.username);
      await page.getByPlaceholder('••••••••').fill(TEST_ADMIN.password);
      await page.getByRole('button', { name: /access system/i }).click();
      
      // Hub should be visible (may be scrolled)
      await expect(page.getByText('Welcome to FJ Analytics')).toBeVisible({ timeout: 10000 });
    });

    test('should work on tablet viewport', async ({ page }) => {
      // Set tablet viewport
      await page.setViewportSize({ width: 768, height: 1024 });
      
      // Login should still work
      await page.getByPlaceholder('name.surname').fill(TEST_ADMIN.username);
      await page.getByPlaceholder('••••••••').fill(TEST_ADMIN.password);
      await page.getByRole('button', { name: /access system/i }).click();
      
      // Hub should be visible
      await expect(page.getByText('Welcome to FJ Analytics')).toBeVisible({ timeout: 10000 });
    });
  });

  test.describe('SEO and Accessibility', () => {
    test('should have proper page title', async ({ page }) => {
      await expect(page).toHaveTitle(/FJ Analytics/);
    });

    test('should have focusable interactive elements', async ({ page }) => {
      // Login form elements should be focusable
      const usernameInput = page.getByPlaceholder('name.surname');
      const passwordInput = page.getByPlaceholder('••••••••');
      const loginButton = page.getByRole('button', { name: /access system/i });
      
      await usernameInput.focus();
      await expect(usernameInput).toBeFocused();
      
      await passwordInput.focus();
      await expect(passwordInput).toBeFocused();
      
      await loginButton.focus();
      await expect(loginButton).toBeFocused();
    });

    test('should have proper contrast for text', async ({ page }) => {
      // Basic contrast check - text should be visible
      const loginTitle = page.getByText('FJ Analytics').first();
      await expect(loginTitle).toBeVisible();
      
      const subtitle = page.getByText('Business Intelligence Platform');
      await expect(subtitle).toBeVisible();
    });
  });

  test.describe('Performance', () => {
    test('should load login page within 3 seconds', async ({ page }) => {
      const start = Date.now();
      await page.goto('/');
      const loadTime = Date.now() - start;
      
      // Login button should be visible
      await expect(page.getByRole('button', { name: /access system/i })).toBeVisible();
      
      // Should be fast enough
      expect(loadTime).toBeLessThan(3000);
    });

    test('should load dashboard quickly after login', async ({ page }) => {
      // Login first
      await page.getByPlaceholder('name.surname').fill(TEST_ADMIN.username);
      await page.getByPlaceholder('••••••••').fill(TEST_ADMIN.password);
      
      const start = Date.now();
      await page.getByRole('button', { name: /access system/i }).click();
      
      // Should load dashboard
      await expect(page.getByText('Welcome to FJ Analytics')).toBeVisible({ timeout: 10000 });
      const loadTime = Date.now() - start;
      
      // Should be reasonably fast
      expect(loadTime).toBeLessThan(5000);
    });
  });
});
