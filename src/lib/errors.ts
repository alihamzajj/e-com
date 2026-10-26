// Turns database / provider failures into messages that are safe to show to
// customers. Raw errors are logged on the server only.

export type ActionResult<T = undefined> =
  | { ok: true; data: T; message?: string }
  | { ok: false; error: string; fieldErrors?: Record<string, string[] | undefined> };

const MESSAGES: Record<string, string> = {
  AUTH_REQUIRED: "Please sign in to continue.",
  FORBIDDEN: "You do not have permission to do that.",
  RATE_LIMITED: "Too many attempts. Please wait a little and try again.",
  CART_EMPTY: "Your cart is empty.",
  STOCK_UNAVAILABLE: "Some items in your cart are no longer available in the quantity requested. Please review your cart.",
  TOO_MANY_ITEMS: "Your cart has too many different items.",
  INVALID_ITEMS: "Your cart could not be read. Please refresh and try again.",
  INVALID_SHIPPING_METHOD: "Please choose a shipping method.",
  INVALID_CONTACT: "Please check your contact details.",
  INVALID_ADDRESS: "Please check your delivery address.",
  INVALID_IDEMPOTENCY_KEY: "Your checkout session expired. Please refresh the page.",
  PAYMENT_METHOD_UNAVAILABLE: "That payment method is not available right now.",
  COUPON_INVALID: "That coupon code is not valid.",
  COUPON_NOT_STARTED: "That coupon is not active yet.",
  COUPON_EXPIRED: "That coupon has expired.",
  COUPON_USAGE_LIMIT: "That coupon has reached its usage limit.",
  COUPON_ALREADY_USED: "You have already used this coupon.",
  COUPON_MIN_ORDER: "Your order does not meet the minimum for this coupon.",
  ORDER_NOT_FOUND: "Order not found.",
  ORDER_NOT_CANCELLABLE: "This order can no longer be cancelled online. Please contact support.",
  ORDER_NOT_PAYABLE: "This order cannot accept a payment.",
  INVALID_STATUS_TRANSITION: "That status change is not allowed for this order.",
  PAYMENT_NOT_VERIFIED: "This online order has no verified payment yet.",
  ONLINE_PAYMENT_REQUIRES_GATEWAY_VERIFICATION: "Online payments can only be marked paid by the payment gateway.",
  ONLINE_REFUNDS_GO_THROUGH_GATEWAY: "Refunds for online payments must be issued through the payment gateway.",
  ALREADY_PAID: "This order is already marked as paid.",
  AMOUNT_MISMATCH: "The amount must equal the order total.",
  INVALID_REFUND_AMOUNT: "The refund amount is more than what can be refunded.",
  STOCK_CANNOT_GO_NEGATIVE: "Stock cannot go below zero.",
  INVALID_ADJUSTMENT: "Enter a non-zero stock change.",
  VARIANT_NOT_FOUND: "Variant not found.",
  REVIEW_NOT_ELIGIBLE: "You can review products from delivered orders.",
  INVALID_RATING: "Choose a rating between 1 and 5.",
  TOO_MANY_PHOTOS: "You can add up to 4 photos.",
  INVALID_PHOTO: "One of the photos could not be saved. Please try again.",
  PRODUCT_NOT_FOUND: "Product not found.",
  INVALID_PARENT_QUESTION: "You can only follow up on answered questions.",
  INVALID_QUESTION: "Questions must be between 5 and 1000 characters.",
  INVALID_ANSWER: "Write an answer first.",
  NOT_FOUND: "Not found.",
  USER_NOT_FOUND: "User not found.",
  INVALID_ROLE: "Unknown role.",
  INVALID_RANGE: "The end date must be after the start date.",
  RANGE_TOO_LARGE: "Choose a range of 400 days or less.",
};

type ErrorLike = { message?: string; code?: string; details?: string | null; hint?: string | null } | null | undefined;

export function errorCode(error: ErrorLike): string | null {
  const message = error?.message ?? "";
  const match = message.match(/^([A-Z][A-Z_]+)(?::|$)/);
  return match ? match[1] : null;
}

export function userMessage(error: ErrorLike, fallback = "Something went wrong. Please try again."): string {
  const code = errorCode(error);
  if (code && MESSAGES[code]) return MESSAGES[code];
  if (error?.code === "23505") return "That value is already in use.";
  if (error?.code === "23514") return "Some values are outside the allowed range.";
  if (error?.code === "42501") return MESSAGES.FORBIDDEN;
  return fallback;
}

export function logServerError(context: string, error: unknown) {
  // Never log request bodies, tokens or payment secrets — only the failure.
  const e = error as ErrorLike & { name?: string };
  console.error(`[${context}]`, { name: e?.name, code: e?.code, message: e?.message, details: e?.details });
}

export function fail(error: ErrorLike, context: string, fallback?: string): { ok: false; error: string } {
  if (!errorCode(error)) logServerError(context, error);
  return { ok: false, error: userMessage(error, fallback) };
}
