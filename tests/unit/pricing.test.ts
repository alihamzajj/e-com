import { describe, expect, it } from "vitest";
import { compareAtPrice, computeUnitPrice, discountPercent, stockState } from "@/lib/pricing";
import { formatMoney, slugify, toNumber } from "@/lib/utils/format";

describe("computeUnitPrice", () => {
  it("uses the product price when there is no sale or override", () => {
    expect(computeUnitPrice(1000, null, null, null)).toBe(1000);
  });

  it("applies the product sale price to inheriting variants", () => {
    expect(computeUnitPrice(1000, 800, null, null)).toBe(800);
  });

  it("ignores a sale price that is not lower than the price", () => {
    expect(computeUnitPrice(1000, 1000, null, null)).toBe(1000);
    expect(computeUnitPrice(1000, 1200, null, null)).toBe(1000);
  });

  it("does not apply the product sale price to a variant with its own price", () => {
    expect(computeUnitPrice(1000, 800, 1500, null)).toBe(1500);
    expect(computeUnitPrice(1000, 800, 1500, 1300)).toBe(1300);
  });

  it("lets a variant sale override the product sale", () => {
    expect(computeUnitPrice(1000, 800, null, 700)).toBe(700);
  });

  it("accepts numeric strings from the API", () => {
    expect(computeUnitPrice("28500.00", "26000.50", null, null)).toBe(26000.5);
  });
});

describe("discount helpers", () => {
  it("computes compare-at from the variant override", () => {
    expect(compareAtPrice(1000, null)).toBe(1000);
    expect(compareAtPrice(1000, 1500)).toBe(1500);
  });

  it("rounds discount percentages and returns 0 without a discount", () => {
    expect(discountPercent(28500, 32000)).toBe(11);
    expect(discountPercent(1000, 1000)).toBe(0);
    expect(discountPercent(1000, 0)).toBe(0);
  });

  it("classifies stock levels", () => {
    expect(stockState(0, 5)).toBe("out_of_stock");
    expect(stockState(5, 5)).toBe("low_stock");
    expect(stockState(6, 5)).toBe("in_stock");
  });
});

describe("formatting", () => {
  it("formats whole and fractional amounts", () => {
    expect(formatMoney(28500, "PKR", "en-PK")).toMatch(/28,500$/);
    expect(formatMoney("10.5", "USD", "en-US")).toBe("$10.50");
  });

  it("parses loose numeric values safely", () => {
    expect(toNumber(null)).toBe(0);
    expect(toNumber("abc")).toBe(0);
    expect(toNumber("12.30")).toBe(12.3);
  });

  it("slugifies names", () => {
    expect(slugify("Arc 75 — Wireless (Chalk)")).toBe("arc-75-wireless-chalk");
    expect(slugify("Crème brûlée")).toBe("creme-brulee");
  });
});
