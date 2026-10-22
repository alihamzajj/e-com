// Mirror of public.compute_unit_price for display (product cards, variant
// pickers). Checkout totals are always recomputed by the database; a test keeps
// both implementations in agreement.
import { toNumber } from "@/lib/utils/format";

type Num = number | string | null | undefined;

export function computeUnitPrice(productPrice: Num, productSale: Num, variantPrice: Num, variantSale: Num): number {
  const pPrice = toNumber(productPrice);
  const pSale = productSale === null || productSale === undefined ? null : toNumber(productSale);
  const vPrice = variantPrice === null || variantPrice === undefined ? null : toNumber(variantPrice);
  const vSale = variantSale === null || variantSale === undefined ? null : toNumber(variantSale);

  if (vPrice !== null) {
    return vSale !== null && vSale < vPrice ? vSale : vPrice;
  }
  const sale = vSale ?? pSale;
  return sale !== null && sale < pPrice ? sale : pPrice;
}

export function compareAtPrice(productPrice: Num, variantPrice: Num): number {
  return variantPrice === null || variantPrice === undefined ? toNumber(productPrice) : toNumber(variantPrice);
}

/** Whole-percent discount for a badge; 0 when there is no discount. */
export function discountPercent(price: number, compareAt: number): number {
  if (!(compareAt > 0) || !(price < compareAt)) return 0;
  return Math.round(((compareAt - price) / compareAt) * 100);
}

export type StockState = "in_stock" | "low_stock" | "out_of_stock";

export function stockState(quantity: number, lowThreshold: number): StockState {
  if (quantity <= 0) return "out_of_stock";
  if (quantity <= lowThreshold) return "low_stock";
  return "in_stock";
}
