import { test, expect } from '@playwright/test';

test.describe('Eyedropper', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should render the test playground', async ({ page }) => {
    await expect(page.locator('h1')).toContainText('ya-react-eyedropper');
    // Ensure test subjects are rendered
    await expect(page.locator('.color-box').first()).toBeVisible();
  });

  test('should open picker and allow picking color using native strategy', async ({ page }) => {
    // Select native strategy
    await page.locator('select').selectOption('native');

    // We can't actually interact with the real native EyeDropper UI in Playwright seamlessly yet 
    // across all OSes, so we'll just check that the status updates and it handles graceful failure
    // or if we can mock it, we mock it. But for E2E, we can just verify the button triggers the open call.
    
    // Check if Native is supported in this browser engine
    const isNativeSupported = await page.evaluate(() => 'EyeDropper' in window);
    
    if (isNativeSupported) {
      // Mock the native EyeDropper for the E2E test to simulate a user picking a color
      await page.evaluate(() => {
        (window as any).EyeDropper = class {
          open() {
            return Promise.resolve({ sRGBHex: '#00ff00' });
          }
        };
      });

      await page.locator('text=Pick with Hook').click();
      
      // Since it's mocked to return #00ff00 instantly, check if the UI updated
      const lastColorContainer = page.locator('div', { hasText: 'Last Picked Color:' }).last();
      await expect(lastColorContainer.locator('code')).toContainText('#00ff00');
    }
  });

  test('should open canvas magnifier when canvas strategy is selected', async ({ page }) => {
    // Select canvas strategy
    await page.locator('select').selectOption('canvas');

    await page.locator('text=Pick with Hook').click();

    // Wait for the invisible overlay to appear
    const overlay = page.locator('div[style*="z-index: 2147483647"]');
    await expect(overlay).toBeVisible({ timeout: 5000 });

    // Simulate a mouse move to render the magnifier
    await overlay.dispatchEvent('mousemove', { clientX: 200, clientY: 200 });

    // The magnifier canvas should be visible (appended directly to body with z-index 2147483647)
    const magnifierCanvas = page.locator('canvas[style*="z-index: 2147483647"]');
    await expect(magnifierCanvas).toBeVisible();

    // Click to pick the color
    await overlay.dispatchEvent('click', { clientX: 200, clientY: 200 });

    // Overlay should disappear
    await expect(overlay).not.toBeVisible();
    
    // We expect some hex code to be printed under "Last Picked Color:"
    const lastColorContainer = page.locator('div', { hasText: 'Last Picked Color:' }).last();
    await expect(lastColorContainer.locator('code')).toContainText('#');
  });
});
