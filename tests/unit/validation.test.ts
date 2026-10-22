import { describe, expect, it } from "vitest";
import { checkoutSchema, couponSchema, productSchema, signUpSchema, supportSchema } from "@/lib/validation/schemas";
import { errorCode, userMessage } from "@/lib/errors";

const validCheckout = {
  idempotencyKey: "0d6f2c3e-7f0a-4b8e-9e0f-1234567890ab",
  contact: { name: "Ayesha Khan", email: "AYESHA@Example.com ", phone: "+92 300 1234567" },
  address: { fullName: "Ayesha Khan", phone: "03001234567", line1: "12 Mall Road", city: "Lahore", country: "pk" },
  shippingMethod: "standard",
  paymentMethod: "cod",
  couponCode: "",
};

describe("checkout validation", () => {
  it("accepts a complete checkout and normalises values", () => {
    const parsed = checkoutSchema.parse(validCheckout);
    expect(parsed.contact.email).toBe("ayesha@example.com");
    expect(parsed.address.country).toBe("PK");
    expect(parsed.couponCode).toBeUndefined();
  });

  it("rejects missing address fields and bad phone numbers", () => {
    const result = checkoutSchema.safeParse({
      ...validCheckout,
      address: { ...validCheckout.address, line1: "  ", city: "" },
      contact: { ...validCheckout.contact, phone: "abc" },
    });
    expect(result.success).toBe(false);
    const paths = result.error!.issues.map((i) => i.path.join("."));
    expect(paths).toEqual(expect.arrayContaining(["address.line1", "address.city", "contact.phone"]));
  });

  it("rejects unknown payment methods", () => {
    expect(checkoutSchema.safeParse({ ...validCheckout, paymentMethod: "crypto" }).success).toBe(false);
  });

  it("does not accept client totals as part of the payload", () => {
    const parsed = checkoutSchema.parse({ ...validCheckout, total: 1 });
    expect(parsed).not.toHaveProperty("total");
  });
});

describe("product validation", () => {
  const base = {
    name: "Arc 75",
    slug: "arc-75",
    price: 1000,
    status: "active",
    lowStockThreshold: 5,
    variants: [{ sku: "arc-1", title: "Default", options: {}, stockQuantity: 3 }],
  };

  it("uppercases SKUs and accepts a valid product", () => {
    const p = productSchema.parse(base);
    expect(p.variants[0].sku).toBe("ARC-1");
  });

  it("requires the sale price to be below the price", () => {
    expect(productSchema.safeParse({ ...base, salePrice: 1000 }).success).toBe(false);
    expect(productSchema.safeParse({ ...base, salePrice: 900 }).success).toBe(true);
  });

  it("rejects duplicate SKUs, duplicate option sets and negative stock", () => {
    const dupSku = productSchema.safeParse({ ...base, variants: [base.variants[0], { ...base.variants[0], title: "B", options: { Color: "B" } }] });
    expect(dupSku.success).toBe(false);
    const dupOptions = productSchema.safeParse({
      ...base,
      variants: [
        { sku: "A", title: "Black", options: { Color: "Black" }, stockQuantity: 1 },
        { sku: "B", title: "Black", options: { Color: "Black" }, stockQuantity: 1 },
      ],
    });
    expect(dupOptions.success).toBe(false);
    expect(productSchema.safeParse({ ...base, variants: [{ ...base.variants[0], stockQuantity: -1 }] }).success).toBe(false);
  });

  it("rejects bad slugs and more than two decimals", () => {
    expect(productSchema.safeParse({ ...base, slug: "Arc 75!" }).success).toBe(false);
    expect(productSchema.safeParse({ ...base, price: 10.123 }).success).toBe(false);
  });
});

describe("other forms", () => {
  it("caps percentage coupons at 100 and orders dates", () => {
    expect(couponSchema.safeParse({ code: "SAVE", discountType: "percentage", value: 120 }).success).toBe(false);
    expect(
      couponSchema.safeParse({ code: "SAVE", discountType: "fixed", value: 100, startsAt: "2026-02-01", endsAt: "2026-01-01" }).success,
    ).toBe(false);
  });

  it("enforces password strength on sign up", () => {
    expect(signUpSchema.safeParse({ fullName: "A", email: "a@b.co", password: "password" }).success).toBe(false);
    expect(signUpSchema.safeParse({ fullName: "A", email: "a@b.co", password: "passw0rd!" }).success).toBe(true);
  });

  it("rejects the support honeypot", () => {
    const msg = { name: "A", email: "a@b.co", subject: "Hi", message: "Hello there, a question." };
    expect(supportSchema.safeParse(msg).success).toBe(true);
    expect(supportSchema.safeParse({ ...msg, website: "spam.example" }).success).toBe(false);
  });
});

describe("error mapping", () => {
  it("maps known database codes to friendly text", () => {
    expect(errorCode({ message: "STOCK_UNAVAILABLE" })).toBe("STOCK_UNAVAILABLE");
    expect(errorCode({ message: "INVALID_STATUS_TRANSITION: pending -> delivered" })).toBe("INVALID_STATUS_TRANSITION");
    expect(userMessage({ message: "COUPON_EXPIRED" })).toBe("That coupon has expired.");
  });

  it("never echoes raw database errors", () => {
    const raw = { message: 'duplicate key value violates unique constraint "orders_pkey"', code: "XX000" };
    expect(userMessage(raw)).toBe("Something went wrong. Please try again.");
    expect(userMessage({ message: "new row violates row-level security policy", code: "42501" })).toBe(
      "You do not have permission to do that.",
    );
  });
});
