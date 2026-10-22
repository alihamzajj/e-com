import { expect, test, type Page } from "@playwright/test";

// Signed-in journeys. Skipped unless staging credentials are provided.
const customer = { email: process.env.E2E_CUSTOMER_EMAIL, password: process.env.E2E_CUSTOMER_PASSWORD };
const admin = { email: process.env.E2E_ADMIN_EMAIL, password: process.env.E2E_ADMIN_PASSWORD };

async function signIn(page: Page, email: string, password: string, next = "/account") {
  await page.goto(`/login?next=${encodeURIComponent(next)}`);
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: /^sign in$/i }).click();
  await page.waitForURL((url) => url.pathname.startsWith(next));
}

test.describe("customer", () => {
  test.skip(!customer.email || !customer.password, "E2E_CUSTOMER_EMAIL / E2E_CUSTOMER_PASSWORD not set");

  test("places a cash-on-delivery order and sees it in order history", async ({ page }) => {
    await signIn(page, customer.email!, customer.password!);

    await page.goto("/products/mono-60");
    await page.getByRole("button", { name: /buy now/i }).click();
    await page.waitForURL(/\/checkout/);

    await page.getByLabel(/cash on delivery/i).check();
    const placeOrder = page.getByRole("button", { name: /place order/i });
    await placeOrder.click();
    // The button locks while submitting, so a double click cannot create two orders.
    await page.waitForURL(/\/checkout\/success/);
    const orderNumber = (await page.getByText(/NK-\d+/).first().textContent())?.match(/NK-\d+/)?.[0];
    expect(orderNumber).toBeTruthy();

    await page.goto("/account/orders");
    await expect(page.getByText(orderNumber!)).toBeVisible();
  });

  test("customers cannot open the admin", async ({ page }) => {
    await signIn(page, customer.email!, customer.password!);
    await page.goto("/admin");
    await expect(page).not.toHaveURL(/\/admin/);
  });
});

test.describe("admin", () => {
  test.skip(!admin.email || !admin.password, "E2E_ADMIN_EMAIL / E2E_ADMIN_PASSWORD not set");

  test("dashboard metrics follow the selected date range", async ({ page }) => {
    await signIn(page, admin.email!, admin.password!, "/admin");
    await expect(page.getByText(/gross sales/i).first()).toBeVisible();
    await page.goto("/admin?range=7d");
    await expect(page.getByText(/last 7 days/i).first()).toBeVisible();
    await page.goto("/admin?range=custom&from=2026-01-01&to=2026-01-31");
    await expect(page.getByText(/net sales/i).first()).toBeVisible();
  });

  test("orders and products are listed", async ({ page }) => {
    await signIn(page, admin.email!, admin.password!, "/admin");
    await page.goto("/admin/products");
    await expect(page.getByText(/arc 75 wireless/i).first()).toBeVisible();
    await page.goto("/admin/orders");
    await expect(page.getByRole("heading", { name: /orders/i }).first()).toBeVisible();
  });
});
