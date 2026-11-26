import { expect, test, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const ADMIN_EMAIL = process.env.E2E_ADMIN_EMAIL || process.env.ADMIN_EMAIL || 'admin@gsscollection.pk';
const ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD || process.env.ADMIN_PASSWORD || 'TestAdmin123!';

async function assertNoHorizontalOverflow(page: Page, route: string) {
  const overflow = await page.evaluate(() => {
    const doc = document.documentElement;
    const offendingElements = Array.from(document.querySelectorAll('body *'))
      .filter((el) => {
        if (el.closest('[class*="overflow-x-auto"]')) return false;
        const rect = el.getBoundingClientRect();
        return rect.width > 0 && rect.height > 0 && rect.right > window.innerWidth + 1;
      })
      .map((el) => `${el.tagName}.${String((el as HTMLElement).className || '').slice(0, 40)}`)
      .slice(0, 10);

    return {
      scrollWidth: doc.scrollWidth,
      clientWidth: doc.clientWidth,
      offendingElements,
    };
  });
  expect(
    overflow.scrollWidth,
    `Horizontal overflow detected on ${route}: scrollWidth=${overflow.scrollWidth} > clientWidth=${overflow.clientWidth}`
  ).toBeLessThanOrEqual(overflow.clientWidth);
  expect(
    overflow.offendingElements,
    `Elements overflow right viewport edge on ${route}: ${overflow.offendingElements.join(', ')}`
  ).toEqual([]);
}

async function assertNoAxeViolations(page: Page, route: string) {
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa'])
    .analyze();
  expect(
    results.violations,
    `Axe accessibility violations on ${route}: ${JSON.stringify(results.violations, null, 2)}`
  ).toEqual([]);
}

test.describe('GSS Collection Mobile Storefront & Admin E2E', () => {
  test('mobile purchase flow, sticky bar toggle, confirmation receipt, and real WhatsApp link', async ({ page }) => {
    // 1. Home displays category rows with More+ collage tile -> navigates to Collections -> Product
    await page.goto('/');
    await assertNoHorizontalOverflow(page, '/');
    await expect(page.getByRole('heading', { name: /Ladies Rings/i })).toBeVisible();
    await expect(page.getByRole('heading', { name: /Gents Rings/i })).toBeVisible();

    const moreTile = page.getByRole('link', { name: /More\+: browse all/i }).first();
    await expect(moreTile).toBeVisible();
    await moreTile.click();
    await expect(page).toHaveURL(/\/collections\/ladies/);

    await page.goto('/collections/all');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await page.getByRole('link', { name: /Crimson Halo Ring/i }).first().click();

    await expect(page).toHaveURL(/\/products\/crimson-halo-ring/);
    await expect(page.getByRole('heading', { name: /Crimson Halo Ring/i })).toBeVisible();

    // Verify product photo renders cleanly
    const heroImg = page.locator('img').first();
    await expect(heroImg).toBeVisible();

    // 2. Sticky mobile Add-to-Bag bar hides when main CTA is visible and appears when scrolled away
    const mainAddBtn = page.getByRole('button', { name: /Add to Shopping Bag/i });
    const stickyAddBtn = page.getByRole('button', { name: /^Add to Bag$/i });

    await mainAddBtn.scrollIntoViewIfNeeded();
    await expect(stickyAddBtn).toBeHidden();

    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await expect(stickyAddBtn).toBeVisible();

    await mainAddBtn.scrollIntoViewIfNeeded();
    await expect(stickyAddBtn).toBeHidden();

    // 3. Pick variant & add to bag
    const peridotBtn = page.getByRole('button', { name: /Peridot/i });
    if ((await peridotBtn.count()) > 0) {
      await peridotBtn.click();
    } else {
      await page.getByRole('button', { name: /Garnet/i }).click();
    }
    await page.getByRole('button', { name: /^7$/ }).click();
    await page.getByRole('button', { name: /Add to Shopping Bag/i }).click();

    const drawer = page.getByRole('dialog');
    await expect(drawer).toBeVisible();
    await expect(drawer.getByText(/Crimson Halo Ring/i)).toBeVisible();
    await assertNoHorizontalOverflow(page, 'cart-drawer-open');
    await assertNoAxeViolations(page, 'cart-drawer-open');

    await drawer.getByRole('link', { name: /Proceed to Checkout/i }).click();
    await expect(page).toHaveURL(/\/checkout/);
    await assertNoHorizontalOverflow(page, '/checkout');
    await assertNoAxeViolations(page, '/checkout');

    // 4. Complete COD checkout
    await page.getByLabel(/Email Address/i).fill('mobile-buyer@example.com');
    await page.getByLabel(/Phone \/ WhatsApp/i).fill('03001234567');
    await page.getByLabel(/Full Recipient Name/i).fill('Ayesha Siddiqui');
    await page.getByLabel(/Street Address/i).fill('House 44, Block H, Gulberg II');
    await page.getByLabel(/^City \*/i).selectOption('Lahore');
    await page.getByRole('radio', { name: /Cash on Delivery/i }).check();

    await page.getByRole('button', { name: /Place Order/i }).click();

    await expect(page).toHaveURL(/\/order\/GSS-\d+/);
    await expect(page.getByRole('heading', { name: /GSS-\d+/ })).toBeVisible();
    await assertNoHorizontalOverflow(page, '/order/[orderNo]');
    await assertNoAxeViolations(page, '/order/[orderNo]');

    // Confirmation page WhatsApp button points to real settings phone, never placeholder
    const waLinks = page.locator('a[href*="wa.me/"]');
    const count = await waLinks.count();
    if (count > 0) {
      const href = await waLinks.first().getAttribute('href');
      expect(href).toContain('https://wa.me/923001234567');
      expect(href).not.toContain('0000000');
    }
  });

  test('loud checkout validation error is immediately visible in viewport without manual scrolling', async ({ page }) => {
    await page.goto('/products/crimson-halo-ring');
    await page.getByRole('button', { name: /^Add to Shopping Bag$/i }).click();
    await page.getByRole('dialog').getByRole('link', { name: /Proceed to Checkout/i }).click();
    await expect(page).toHaveURL(/\/checkout/);

    await page.getByLabel(/Email Address/i).fill('buyer@example.com');
    // Invalid landline fails PK mobile rule
    await page.getByLabel(/Phone \/ WhatsApp/i).fill('04235711223');
    await page.getByLabel(/Full Recipient Name/i).fill('Sara Ali');
    await page.getByLabel(/Street Address/i).fill('Street 9');
    await page.getByLabel(/^City \*/i).selectOption('Karachi');

    const submitBtn = page.getByRole('button', { name: /Place Order/i });
    await submitBtn.scrollIntoViewIfNeeded();
    await submitBtn.click();

    // focusErrorBanner must bring error banner into view cleanly
    const alert = page.locator('div[role="alert"]').first();
    await expect(alert).toBeVisible();
    await expect(alert).toContainText(/Pakistani mobile/i);

    const isInViewport = await alert.evaluate((el) => {
      const rect = el.getBoundingClientRect();
      return rect.top >= 0 && rect.top < window.innerHeight;
    });
    expect(isInViewport).toBe(true);

    // Server error response on submit must also scroll banner into viewport cleanly
    await page.route('**/api/orders', async (route) => {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Temporary server error, please retry.' }),
      });
    });

    await page.getByLabel(/Phone \/ WhatsApp/i).fill('03001234567');
    await submitBtn.scrollIntoViewIfNeeded();
    await submitBtn.click();

    await expect(alert).toContainText(/Temporary server error/i);
    const serverErrInView = await alert.evaluate((el) => {
      const rect = el.getBoundingClientRect();
      return rect.top >= 0 && rect.top < window.innerHeight;
    });
    expect(serverErrInView).toBe(true);
    await page.unroute('**/api/orders');
  });

  test('admin protection, login, order status transition, and inventory save feedback', async ({ page }) => {
    // 1. Logged-out access redirects to login
    await page.context().clearCookies();
    await page.goto('/admin/orders');
    await expect(page).toHaveURL(/\/admin\/login/);

    // 2. Login via credentials and wait for navigation away from /admin/login
    await page.getByLabel(/Administrator Email/i).fill(ADMIN_EMAIL);
    await page.getByLabel(/^Password$/i).fill(ADMIN_PASSWORD);
    await page.getByRole('button', { name: /Sign In|Authenticate|Log In/i }).click();

    await expect(page).toHaveURL(/\/admin(\/(?!login).*)?$/, { timeout: 15000 });
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();

    // 3. Place an order if needed or inspect existing orders, update status cleanly
    await page.goto('/admin/orders');
    const orderLink = page.locator('div.md\\:hidden a[href^="/admin/orders/"]').first();
    if ((await orderLink.count()) > 0) {
      await orderLink.click();
      await expect(page).toHaveURL(/\/admin\/orders\/GSS-/);
      const processingBtn = page.getByRole('button', { name: 'processing', exact: true });
      const targetStatus = (await processingBtn.isDisabled()) ? 'shipped' : 'processing';
      await page.getByRole('button', { name: targetStatus, exact: true }).click();
      await expect(page.getByText(/Saved order changes/i)).toBeVisible();
      await page.reload();
      await expect(page.getByRole('button', { name: targetStatus, exact: true })).toBeDisabled();
    }

    // 4. Inventory stepper + save persists cleanly
    await page.goto('/admin/inventory');
    await assertNoHorizontalOverflow(page, '/admin/inventory');
    const firstCard = page.locator('div.md\\:hidden section').first();
    await firstCard.getByRole('button', { name: /Increase stock/i }).first().click();
    await firstCard.getByRole('button', { name: /^Save$/i }).first().click();
    await expect(firstCard.getByText(/Saved/i).first()).toBeVisible();
  });

  test('zero horizontal overflow and WCAG AA axe compliance across all storefront routes', async ({ page }) => {
    const publicRoutes = [
      '/',
      '/collections/all',
      '/products/crimson-halo-ring',
      '/search?q=halo',
      '/wishlist',
      '/pages/size-guide',
      '/track-order',
      '/cart',
      '/admin/login',
    ];

    for (const route of publicRoutes) {
      await page.goto(route);
      await assertNoHorizontalOverflow(page, route);
      await assertNoAxeViolations(page, route);
    }
  });
});
