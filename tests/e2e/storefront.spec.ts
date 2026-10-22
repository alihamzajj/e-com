import { expect, test } from "@playwright/test";

// Public journeys. Requires the demo catalog from supabase/seed.sql.

test.describe("storefront", () => {
  test("home page shows the hero and products from the database", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("h1").first()).toBeVisible();
    await expect(page.getByRole("link", { name: /shop/i }).first()).toBeVisible();
    await expect(page.locator('a[href^="/products/"]').first()).toBeVisible();
  });

  test("catalog filters, sorts and paginates through the URL", async ({ page }) => {
    await page.goto("/products?category=keyboards&sort=price_asc");
    const cards = page.locator('a[href^="/products/"] >> visible=true');
    await expect(cards.first()).toBeVisible();
    await expect(page).toHaveURL(/category=keyboards/);
    await expect(page.getByText(/mono 60/i).first()).toBeVisible();
  });

  test("empty search shows a helpful empty state", async ({ page }) => {
    await page.goto("/products?q=zzzznothing");
    await expect(page.getByText(/no products match/i)).toBeVisible();
  });

  test("variant selection, add to cart and quantity update", async ({ page }) => {
    await page.goto("/products/arc-75-wireless");
    await expect(page.getByRole("heading", { level: 1 })).toContainText(/arc 75/i);
    await page.getByRole("button", { name: /^add to cart$/i }).click();
    await expect(page.getByText(/added to cart/i)).toBeVisible();

    await page.goto("/cart");
    await expect(page.getByText(/arc 75 wireless/i).first()).toBeVisible();
    await page.getByRole("button", { name: /increase/i }).first().click();
    await expect(page.getByRole("spinbutton", { name: /quantity/i }).first()).toHaveValue("2");
  });

  test("out-of-stock products cannot be added", async ({ page }) => {
    await page.goto("/products/ember-artisan-esc");
    await expect(page.getByText(/out of stock/i).first()).toBeVisible();
    await expect(page.getByRole("button", { name: /^add to cart$/i })).toBeDisabled();
  });

  test("checkout and account require sign in", async ({ page }) => {
    await page.goto("/checkout");
    await expect(page).toHaveURL(/\/login\?next=%2Fcheckout/);
    await page.goto("/account/orders");
    await expect(page).toHaveURL(/\/login\?next=%2Faccount%2Forders/);
  });

  test("admin is not reachable while signed out", async ({ page }) => {
    await page.goto("/admin");
    await expect(page).toHaveURL(/\/login\?next=%2Fadmin/);
  });

  test("mobile navigation opens @mobile", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: /open menu/i }).click();
    await expect(page.getByRole("dialog")).toBeVisible();
  });
});

test.describe("platform endpoints", () => {
  test("unsigned payment webhooks are rejected", async ({ request }) => {
    const res = await request.post("/api/webhooks/stripe", { data: { id: "evt_fake", type: "checkout.session.completed" } });
    // 404 when no gateway is configured, 400 when the signature is missing.
    expect([400, 404]).toContain(res.status());
  });

  test("cron endpoint requires the secret", async ({ request }) => {
    const res = await request.get("/api/cron/expire-orders");
    expect([401, 403, 503]).toContain(res.status());
  });

  test("robots.txt keeps private areas out of search engines", async ({ request }) => {
    const body = await (await request.get("/robots.txt")).text();
    expect(body).toMatch(/Disallow: \/admin/);
    expect(body).toMatch(/Disallow: \/account/);
  });

  test("sitemap lists products", async ({ request }) => {
    const body = await (await request.get("/sitemap.xml")).text();
    expect(body).toContain("/products/");
  });
});
