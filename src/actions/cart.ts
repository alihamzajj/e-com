"use server";

import { refresh } from "next/cache";
import { z } from "zod";
import {
  getCouponCode,
  quoteEntries,
  readCart,
  setCartQuantity,
  setCouponCode,
  MAX_QTY,
} from "@/features/cart/server";
import { fail, userMessage, type ActionResult } from "@/lib/errors";

const variantInput = z.object({
  variantId: z.uuid(),
  quantity: z.number().int().min(0).max(MAX_QTY),
});

type CartChange = { count: number; quantity: number };

async function availableFor(variantId: string) {
  const { quote } = await quoteEntries([{ variantId, quantity: 1 }], null, null);
  const line = quote.lines[0];
  if (!line || line.issue === "unavailable") return { available: 0, sellable: false };
  return { available: line.available_quantity, sellable: true };
}

export async function addToCartAction(input: { variantId: string; quantity: number }): Promise<ActionResult<CartChange>> {
  const parsed = variantInput.safeParse(input);
  if (!parsed.success || parsed.data.quantity < 1) return { ok: false, error: "Choose a valid option and quantity." };
  const { variantId, quantity } = parsed.data;
  try {
    const { available, sellable } = await availableFor(variantId);
    if (!sellable) return { ok: false, error: "This item is no longer available." };
    if (available <= 0) return { ok: false, error: "This option is out of stock." };

    const entries = await readCart();
    const current = entries.find((e) => e.variantId === variantId)?.quantity ?? 0;
    const next = Math.min(current + quantity, available, MAX_QTY);
    if (next === current) {
      return { ok: false, error: `Only ${available} available — they are already in your cart.` };
    }
    await setCartQuantity(variantId, next);
    refresh();
    const count = entries.reduce((s, e) => s + (e.variantId === variantId ? 0 : e.quantity), 0) + next;
    return {
      ok: true,
      data: { count, quantity: next },
      message: next < current + quantity ? `Added — limited to ${available} available.` : "Added to cart.",
    };
  } catch (error) {
    return fail(error as Error, "cart.add");
  }
}

export async function updateCartQuantityAction(input: { variantId: string; quantity: number }): Promise<ActionResult<CartChange>> {
  const parsed = variantInput.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid quantity." };
  const { variantId, quantity } = parsed.data;
  try {
    let next = quantity;
    let message: string | undefined;
    if (quantity > 0) {
      const { available } = await availableFor(variantId);
      if (available <= 0) return { ok: false, error: "This option is out of stock. Remove it to continue." };
      if (quantity > available) {
        next = available;
        message = `Only ${available} available.`;
      }
    }
    await setCartQuantity(variantId, next);
    refresh();
    const entries = await readCart();
    return { ok: true, data: { count: entries.reduce((s, e) => s + e.quantity, 0), quantity: next }, message };
  } catch (error) {
    return fail(error as Error, "cart.update");
  }
}

export async function removeFromCartAction(variantId: string): Promise<ActionResult<CartChange>> {
  return updateCartQuantityAction({ variantId, quantity: 0 });
}

const couponInput = z.string().trim().toUpperCase().regex(/^[A-Z0-9_-]{3,32}$/, "Enter a valid coupon code.");

export async function applyCouponAction(code: string): Promise<ActionResult<{ discount: number }>> {
  const parsed = couponInput.safeParse(code);
  if (!parsed.success) return { ok: false, error: "Enter a valid coupon code." };
  try {
    const entries = await readCart();
    const { quote } = await quoteEntries(entries, null, parsed.data);
    if (!quote.coupon?.valid) {
      return { ok: false, error: userMessage({ message: quote.coupon?.error ?? "COUPON_INVALID" }) };
    }
    await setCouponCode(parsed.data);
    return { ok: true, data: { discount: quote.coupon.discount }, message: "Coupon applied." };
  } catch (error) {
    return fail(error as Error, "cart.coupon");
  }
}

export async function removeCouponAction(): Promise<ActionResult> {
  await setCouponCode(null);
  return { ok: true, data: undefined };
}

export async function currentCouponAction() {
  return getCouponCode();
}
