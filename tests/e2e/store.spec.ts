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

    // Verify dark mobile menu drawer (#0B0B0B bg + white link text) and WCAG AA compliance
    await page.getByRole('button', { name: /Open navigation menu/i }).click();
    const mobileNav = page.locator('#mobile-store-nav');
    await expect(mobileNav).toBeVisible();
    const menuColors = await mobileNav.evaluate((nav) => {
      const link = nav.querySelector('a');
      return {
        bg: getComputedStyle(nav).backgroundColor,
        text: link ? getComputedStyle(link).color : '',
      };
    });
    expect(menuColors.bg).toBe('rgb(11, 11, 11)');
    expect(menuColors.text).toBe('rgb(255, 255, 255)');
    await assertNoAxeViolations(page, 'mobile-menu-open');
    await page.getByRole('button', { name: /Close navigation menu/i }).click();
    await expect(mobileNav).toBeHidden();

    await expect(page.getByRole('heading', { name: /Ladies Rings/i })).toBeVisible();
    await expect(page.getByRole('heading', { name: /Gents Rings/i })).toBeVisible();

    const moreTile = page.getByRole('link', { name: /More\+: browse all/i }).first();
    await expect(moreTile).toBeVisible();
    await moreTile.click();
    await expect(page).toHaveURL(/\/collections\/ladies/);
    await expect(page.getByRole('heading', { level: 1, name: /Ladies Rings/i })).toBeVisible();

    await page.goto('/collections/all');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    // Filter by Garnet so Crimson Halo Ring stays on page 1 even when seed DB exceeds 12 products.
    await page.getByRole('link', { name: 'Garnet', exact: true }).click();
    await expect(page).toHaveURL(/\/collections\/all\?stone=garnet/);
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

  test('admin protection, login, order status transition, and inventory save feedback', async ({ page }, testInfo) => {
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

    // 5. Homepage Hero picture + text configuration persists live on '/' and restores cleanly
    await page.goto('/admin/settings');
    await assertNoHorizontalOverflow(page, '/admin/settings');
    await assertNoAxeViolations(page, '/admin/settings');

    await page.route('**/api/upload', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          url: '/images/products/emerald-halo-oval-ring-0.jpg',
        }),
      });
    });

    await page.locator('#st-hero-upload').setInputFiles({
      name: 'hero-banner.png',
      mimeType: 'image/png',
      buffer: Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    });
    await expect(page.getByRole('button', { name: /Use Default Ring/i })).toBeVisible();
    await page.unroute('**/api/upload');

    await page.getByLabel(/Eyebrow Line/i).fill('Atelier Signature Showcase');
    await page.getByLabel(/Main Headline/i).fill('Custom Silver Jewellery Live Test');
    await page.getByLabel(/Description Text/i).fill('Crafted with earth-mined stones.');
    await page.getByRole('button', { name: /Save Settings/i }).click();
    await expect(page.getByText(/Settings saved/i)).toBeVisible();

    await page.goto('/');
    await expect(page.getByText('Atelier Signature Showcase')).toBeVisible();
    await expect(
      page.getByRole('heading', { level: 1, name: 'Custom Silver Jewellery Live Test' })
    ).toBeVisible();
    await expect(page.getByText('Crafted with earth-mined stones.')).toBeVisible();
    const heroImg = page.locator('section.bg-ink img').first();
    await expect(heroImg).toBeVisible();
    await assertNoHorizontalOverflow(page, '/');
    await assertNoAxeViolations(page, '/');

    // Restore original hero text + spotlight fallback so subsequent mobile runs remain deterministic
    await page.goto('/admin/settings');
    await page.getByRole('button', { name: /Use Default Ring/i }).click();
    await page.getByRole('button', { name: /Restore Default Copy/i }).click();
    await page.getByRole('button', { name: /Save Settings/i }).click();
    await expect(page.getByText(/Settings saved/i)).toBeVisible();

    // 6. Dynamic Admin Categories -> Create article in category -> Verify live URL -> Hide category cleanly
    const projSlug = testInfo.project.name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    const customCatName = `Cuffs ${testInfo.project.name}`;
    const customCatSlug = `cuffs-${projSlug}`;
    const customArticleTitle = `Hammered Cuff ${testInfo.project.name}`;

    await page.goto('/admin/categories');
    await assertNoHorizontalOverflow(page, '/admin/categories');
    await assertNoAxeViolations(page, '/admin/categories');

    await page.getByRole('button', { name: /Add category/i }).click();
    await page.getByLabel(/Category Name/i).fill(customCatName);
    await page.getByLabel(/Short Eyebrow Label/i).fill('Wristwear');
    await page.getByLabel(/Collection Description/i).fill('Custom silver cuffs category.');
    await page.getByLabel(/Default Article Type/i).selectOption('bracelet');
    await page.getByRole('button', { name: /Create Category/i }).click();
    await expect(page.getByText(new RegExp(`/collections/${customCatSlug}`))).toBeVisible();

    // Jump directly to New Article pre-scoped to the new category
    await page.locator(`a[href="/admin/products/new?cat=${customCatSlug}"]`).click();
    await expect(page).toHaveURL(new RegExp(`/admin/products/new\\?cat=${customCatSlug}`));
    await expect(page.locator('#pf-cat')).toHaveValue(customCatSlug);

    await page.route('**/api/upload', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          url: '/images/products/natural-turquoise-stone-9-7g-0.jpg',
        }),
      });
    });

    await page.getByLabel(/^Title \*/i).fill(customArticleTitle);
    await page.getByLabel(/^Description \*/i).fill('Handcrafted custom category silver bracelet.');
    await page.getByLabel(/Base price \(PKR\)/i).fill('14000');
    await page.getByRole('button', { name: 'Turquoise', exact: true }).click();
    await page.locator('#pf-photos').setInputFiles({
      name: 'cuff.png',
      mimeType: 'image/png',
      buffer: Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    });
    await expect(page.locator('img[alt="Product photo 1"]')).toBeVisible();
    await page.unroute('**/api/upload');

    await page.getByLabel(/Stock for Turquoise/i).fill('2');
    await page.getByLabel(/Visibility/i).selectOption('active');
    await page.getByRole('button', { name: /Create product/i }).click();
    await expect(page).toHaveURL(/\/admin\/products$/);

    // Visit live custom collection URL and verify article appears cleanly
    await page.goto(`/collections/${customCatSlug}`);
    await expect(page.getByRole('heading', { level: 1, name: customCatName })).toBeVisible();
    await expect(page.getByText(customArticleTitle)).toBeVisible();
    await assertNoHorizontalOverflow(page, `/collections/${customCatSlug}`);
    await assertNoAxeViolations(page, `/collections/${customCatSlug}`);

    // Hide temporary test category so subsequent test assertions keep clean navigation state
    await page.goto('/admin/categories');
    await page.getByRole('button', { name: new RegExp(customCatName, 'i') }).click();
    await page.getByLabel(/Active on store/i).uncheck();
    await page.getByRole('button', { name: /Save Changes/i }).click();
    await expect(page.getByText(/Category updated/i)).toBeVisible();

    // 7. Page-backed Category (Size Guide) -> Mobile Menu opens /pages/size-guide -> /collections redirect -> Delete cleanly
    const sizeCatName = `Size Guide ${testInfo.project.name}`;
    const sizeCatSlug = `size-guide-${projSlug}`;

    await page.getByRole('button', { name: /Add category/i }).click();
    await page.getByLabel(/Category Type/i).selectOption('page');
    await page.getByLabel(/Linked CMS Page/i).selectOption('size-guide');
    await page.getByLabel(/Category Name/i).fill(sizeCatName);
    await page.getByLabel(/Web Address \(Slug\)/i).fill(sizeCatSlug);
    await page.getByRole('button', { name: /Create Category/i }).click();
    await expect(page.getByText(/Storefront link: \/pages\/size-guide/i)).toBeVisible();

    // Open mobile drawer menu on '/' and tap the Page-type category
    await page.goto('/');
    await page.getByRole('button', { name: /Open navigation menu/i }).click();
    const sizeNavLink = page.locator('#mobile-store-nav').getByRole('link', { name: sizeCatName });
    await expect(sizeNavLink).toBeVisible();
    await expect(sizeNavLink).toHaveAttribute('href', '/pages/size-guide');
    await sizeNavLink.click();
    await expect(page).toHaveURL(/\/pages\/size-guide/);
    await expect(
      page.getByRole('heading', { level: 1, name: /Ring Siz(?:e|ing) Guide/i })
    ).toBeVisible();

    // Direct /collections/<page-category-slug> cleanly redirects to /pages/size-guide
    await page.goto(`/collections/${sizeCatSlug}`);
    await expect(page).toHaveURL(/\/pages\/size-guide/);

    // Clean up temporary page category (has 0 products, so DELETE succeeds)
    await page.goto('/admin/categories');
    await page.getByRole('button', { name: new RegExp(sizeCatName, 'i') }).click();
    await page.getByRole('button', { name: /^Delete$/i }).click();
    await page.getByRole('button', { name: /Delete Category/i }).click();
    await expect(page.getByText(/Category deleted/i)).toBeVisible();

    // 8. Admin edits Size Guide photos + Ladies/Gents ring sizes -> renders live on /pages/size-guide & product modal
    await page.goto('/admin/pages');
    await assertNoHorizontalOverflow(page, '/admin/pages');
    await page.getByRole('button', { name: /Ring Siz(?:e|ing) Guide/i }).click();

    await page.route('**/api/upload', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          url: '/images/products/crimson-halo-ring-0.jpg',
        }),
      });
    });

    await page.locator('#pg-photo-upload').setInputFiles({
      name: 'size-chart.png',
      mimeType: 'image/png',
      buffer: Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    });
    await expect(page.locator('#pg-img-cap-0')).toBeVisible();
    await page.locator('#pg-img-cap-0').fill('Ruler measurement example');
    await page.unroute('**/api/upload');

    // Add size 13 to Gents Rings chart inside Size Guide editor
    const addBtns = page.getByRole('button', { name: /\+ Add Size/i });
    await addBtns.nth(1).click();
    const gentsRows = page.locator('input[id^="sz-gents-label-"]');
    const lastIdx = (await gentsRows.count()) - 1;
    await page.locator(`#sz-gents-label-${lastIdx}`).fill('13');
    await page.getByRole('button', { name: /Save changes/i }).click();
    await expect(page.getByText(/Changes saved/i)).toBeVisible();

    await page.goto('/pages/size-guide');
    await expect(page.getByText('Ruler measurement example')).toBeVisible();
    await expect(page.getByRole('heading', { name: /Ladies Rings Sizing/i })).toBeVisible();
    await expect(page.getByRole('heading', { name: /Gents Rings Sizing/i })).toBeVisible();
    await expect(
      page.getByRole('list', { name: /Gents Rings Sizing sizes/i }).getByText('13', { exact: true })
    ).toBeVisible();
    await assertNoHorizontalOverflow(page, '/pages/size-guide');
    await assertNoAxeViolations(page, '/pages/size-guide');

    // Product Size Guide modal picks up updated Gents chart & uploaded visual
    await page.goto('/products/crimson-halo-ring');
    await page.getByRole('button', { name: /^Size Guide$/i }).click();
    const modal = page.getByRole('dialog');
    await expect(modal).toBeVisible();
    await expect(modal.getByRole('tab', { name: /Ladies Rings/i })).toHaveAttribute('aria-selected', 'true');
    await modal.getByRole('tab', { name: /Gents Rings/i }).click();
    await expect(
      modal.getByRole('list', { name: /Gents rings sizes/i }).getByText('13', { exact: true })
    ).toBeVisible();
    await expect(modal.getByText('Ruler measurement example')).toBeVisible();
    await modal.getByRole('button', { name: /Close size guide/i }).first().click();

    // Clean up temporary photo & size 13 row so subsequent browser runs start fresh
    await page.goto('/admin/pages');
    await page.getByRole('button', { name: /Ring Siz(?:e|ing) Guide/i }).click();
    await page.getByRole('button', { name: /^Remove$/i }).first().click();
    await page.getByRole('button', { name: /Remove size row/i }).last().click();
    await page.getByRole('button', { name: /Save changes/i }).click();
    await expect(page.getByText(/Changes saved/i)).toBeVisible();
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
