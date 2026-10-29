// Shared Zod schemas. Used by forms (React Hook Form) and re-checked in Server
// Actions; the database enforces its own constraints as a final layer.
import { z } from "zod";
import { PERMISSIONS } from "@/types/domain";

const trimmed = (min: number, max: number, label: string) =>
  z
    .string()
    .trim()
    .min(min, min === 1 ? `${label} is required.` : `${label} must be at least ${min} characters.`)
    .max(max, `${label} must be at most ${max} characters.`);

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((v) => (v ? v : undefined));

export const phoneSchema = z
  .string()
  .trim()
  .min(7, "Enter a valid phone number.")
  .max(20, "Enter a valid phone number.")
  .regex(/^\+?[0-9 ()-]{7,20}$/, "Enter a valid phone number.");

export const emailSchema = z.string().trim().toLowerCase().max(254).email("Enter a valid email address.");

export const slugSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(1, "Slug is required.")
  .max(80)
  .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "Use lowercase letters, numbers and single hyphens.");

const money = (label: string) =>
  z.coerce
    .number({ message: `${label} must be a number.` })
    .min(0, `${label} cannot be negative.`)
    .max(99_999_999, `${label} is too large.`)
    .refine((v) => Math.abs(v * 100 - Math.round(v * 100)) < 1e-6, `${label} can have at most 2 decimals.`);

const optionalMoney = (label: string) =>
  z.preprocess((v) => (v === "" || v === null || v === undefined ? undefined : v), money(label).optional());

// ---------------------------------------------------------------------------
// Auth & account
// ---------------------------------------------------------------------------
export const signInSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Enter your password.").max(128),
});

export const passwordSchema = z
  .string()
  .min(8, "Use at least 8 characters.")
  .max(128)
  .regex(/[A-Za-z]/, "Include at least one letter.")
  .regex(/[0-9]/, "Include at least one number.");

export const signUpSchema = z.object({
  fullName: trimmed(1, 120, "Name"),
  email: emailSchema,
  password: passwordSchema,
});

export const forgotPasswordSchema = z.object({ email: emailSchema });

export const resetPasswordSchema = z
  .object({ password: passwordSchema, confirm: z.string() })
  .refine((v) => v.password === v.confirm, { path: ["confirm"], message: "Passwords do not match." });

export const profileSchema = z.object({
  fullName: trimmed(1, 120, "Name"),
  phone: z.union([phoneSchema, z.literal("")]).optional(),
  marketingOptIn: z.boolean().optional(),
});

export const addressSchema = z.object({
  label: optionalText(40),
  fullName: trimmed(1, 120, "Full name"),
  phone: phoneSchema,
  line1: trimmed(1, 200, "Address"),
  line2: optionalText(200),
  city: trimmed(1, 80, "City"),
  state: optionalText(80),
  postalCode: optionalText(20),
  country: z.string().trim().toUpperCase().regex(/^[A-Z]{2}$/, "Use a 2-letter country code.").default("PK"),
  isDefault: z.boolean().optional(),
});
export type AddressInput = z.infer<typeof addressSchema>;

// ---------------------------------------------------------------------------
// Checkout
// ---------------------------------------------------------------------------
export const checkoutSchema = z.object({
  idempotencyKey: z.string().min(8).max(100),
  contact: z.object({ name: trimmed(1, 120, "Name"), email: emailSchema, phone: phoneSchema }),
  address: addressSchema.omit({ label: true, isDefault: true }),
  saveAddress: z.boolean().optional(),
  shippingMethod: z.string().trim().min(1, "Choose a shipping method.").max(40),
  paymentMethod: z.enum(["cod", "online"], { message: "Choose a payment method." }),
  couponCode: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z0-9_-]{3,32}$/)
    .optional()
    .or(z.literal("").transform(() => undefined)),
  note: optionalText(500),
});
export type CheckoutInput = z.infer<typeof checkoutSchema>;

// ---------------------------------------------------------------------------
// Customer content
// ---------------------------------------------------------------------------
export const questionSchema = z.object({
  productId: z.uuid(),
  body: trimmed(5, 1000, "Question"),
  parentId: z.uuid().optional(),
});

export const reviewSchema = z.object({
  productId: z.uuid(),
  rating: z.coerce.number().int().min(1, "Choose a rating.").max(5),
  title: optionalText(120),
  body: optionalText(3000),
});

export const reportSchema = z.object({
  targetType: z.enum(["question", "review"]),
  targetId: z.uuid(),
  reason: trimmed(3, 300, "Reason"),
});

export const supportSchema = z.object({
  name: trimmed(1, 120, "Name"),
  email: emailSchema,
  subject: trimmed(1, 160, "Subject"),
  message: trimmed(10, 5000, "Message"),
  orderNumber: optionalText(40),
  // Honeypot: real users never fill this in.
  website: z.string().max(0).optional(),
});

export const newsletterSchema = z.object({ email: emailSchema, website: z.string().max(0).optional() });

// ---------------------------------------------------------------------------
// Admin
// ---------------------------------------------------------------------------
export const specificationSchema = z.object({ label: trimmed(1, 60, "Label"), value: trimmed(1, 200, "Value") });

export const variantSchema = z
  .object({
    id: z.uuid().optional(),
    sku: z
      .string()
      .trim()
      .toUpperCase()
      .min(1, "SKU is required.")
      .max(64)
      .regex(/^[A-Z0-9._-]+$/, "Use letters, numbers, dot, dash or underscore."),
    title: trimmed(1, 120, "Variant title"),
    options: z.record(z.string().trim().min(1).max(40), z.string().trim().min(1).max(60)).default({}),
    price: optionalMoney("Variant price"),
    salePrice: optionalMoney("Variant sale price"),
    stockQuantity: z.coerce.number().int().min(0, "Stock cannot be negative.").max(1_000_000),
    isActive: z.boolean().default(true),
  })
  .refine((v) => v.salePrice === undefined || v.price === undefined || v.salePrice < v.price, {
    path: ["salePrice"],
    message: "Sale price must be lower than the variant price.",
  });

export const productSchema = z
  .object({
    name: trimmed(1, 160, "Name"),
    slug: slugSchema,
    categoryId: z.uuid({ message: "Choose a category so the product shows in that section of the shop." }),
    shortDescription: optionalText(300),
    description: optionalText(10000),
    specifications: z.array(specificationSchema).max(40).default([]),
    optionNames: z.array(z.string().trim().min(1).max(40)).max(3).default([]),
    price: money("Price"),
    salePrice: optionalMoney("Sale price"),
    costPrice: optionalMoney("Cost price"),
    status: z.enum(["draft", "active", "archived"]),
    isFeatured: z.boolean().default(false),
    lowStockThreshold: z.coerce.number().int().min(0).max(100_000),
    variants: z.array(variantSchema).min(1, "Add at least one variant.").max(100),
  })
  .refine((p) => p.salePrice === undefined || p.salePrice < p.price, {
    path: ["salePrice"],
    message: "Sale price must be lower than the price.",
  })
  .refine((p) => new Set(p.variants.map((v) => v.sku)).size === p.variants.length, {
    path: ["variants"],
    message: "Each variant needs a unique SKU.",
  })
  .refine(
    (p) => new Set(p.variants.map((v) => JSON.stringify(Object.entries(v.options).sort()))).size === p.variants.length,
    { path: ["variants"], message: "Two variants have the same options." },
  );
export type ProductInput = z.infer<typeof productSchema>;

export const categorySchema = z.object({
  name: trimmed(1, 80, "Name"),
  slug: slugSchema,
  description: optionalText(1000),
  parentId: z.uuid().optional().or(z.literal("").transform(() => undefined)),
  isVisible: z.boolean().default(true),
  sortOrder: z.coerce.number().int().min(-1000).max(1000).default(0),
  imageUrl: z.string().trim().max(500).optional().or(z.literal("").transform(() => undefined)),
});

export const couponSchema = z
  .object({
    code: z.string().trim().toUpperCase().regex(/^[A-Z0-9_-]{3,32}$/, "3–32 letters, numbers, dash or underscore."),
    description: optionalText(200),
    discountType: z.enum(["percentage", "fixed"]),
    value: z.coerce.number().positive("Value must be greater than 0."),
    maxDiscount: optionalMoney("Maximum discount"),
    minOrderTotal: money("Minimum order").default(0),
    startsAt: z.string().optional().or(z.literal("").transform(() => undefined)),
    endsAt: z.string().optional().or(z.literal("").transform(() => undefined)),
    usageLimit: z.preprocess((v) => (v === "" || v == null ? undefined : v), z.coerce.number().int().positive().optional()),
    perCustomerLimit: z.coerce.number().int().positive().default(1),
    isActive: z.boolean().default(true),
  })
  .refine((c) => c.discountType !== "percentage" || c.value <= 100, { path: ["value"], message: "Percentage cannot exceed 100." })
  .refine((c) => !c.startsAt || !c.endsAt || new Date(c.endsAt) > new Date(c.startsAt), {
    path: ["endsAt"],
    message: "End must be after start.",
  });

export const orderStatusSchema = z.object({
  orderId: z.uuid(),
  status: z.enum(["confirmed", "processing", "shipped", "delivered", "cancelled", "returned"]),
  note: optionalText(500),
  trackingNumber: optionalText(100),
  trackingUrl: z.url().max(500).optional().or(z.literal("").transform(() => undefined)),
});

export const refundSchema = z.object({
  orderId: z.uuid(),
  amount: z.coerce.number().positive("Enter an amount greater than 0."),
  reason: trimmed(3, 300, "Reason"),
});

export const roleSchema = z.object({
  userId: z.uuid(),
  role: z.enum(["customer", "staff", "admin"]),
  permissions: z.array(z.enum(PERMISSIONS)).default([]),
});

export const shippingMethodSchema = z.object({
  id: z.string().trim().regex(/^[a-z0-9-]{2,30}$/, "Lowercase id, e.g. standard"),
  label: trimmed(1, 60, "Label"),
  price: money("Price"),
  eta: optionalText(60),
});

export const settingsSchema = z.object({
  storeName: trimmed(1, 60, "Store name"),
  tagline: z.string().trim().max(160).default(""),
  logoUrl: z.string().trim().max(500).optional().or(z.literal("").transform(() => undefined)),
  currency: z.string().trim().toUpperCase().regex(/^[A-Z]{3}$/, "Use a 3-letter ISO code."),
  locale: z.string().trim().min(2).max(20),
  timezone: z.string().trim().min(3).max(60).refine((tz) => {
    try {
      new Intl.DateTimeFormat("en", { timeZone: tz });
      return true;
    } catch {
      return false;
    }
  }, "Unknown time zone."),
  contactEmail: z.union([emailSchema, z.literal("")]).optional(),
  contactPhone: z.string().trim().max(40).optional(),
  contactAddress: z.string().trim().max(300).optional(),
  shippingMethods: z.array(shippingMethodSchema).min(1, "Add at least one shipping method.").max(10),
  freeShippingThreshold: optionalMoney("Free shipping threshold"),
  codEnabled: z.boolean(),
  onlinePaymentsEnabled: z.boolean(),
  newsletterEnabled: z.boolean(),
  lowStockAlertEmail: z.union([emailSchema, z.literal("")]).optional(),
  hero: z.object({
    title: z.string().trim().max(120).optional(),
    subtitle: z.string().trim().max(300).optional(),
    cta_label: z.string().trim().max(40).optional(),
    cta_href: z.string().trim().max(200).optional(),
    image_url: z.string().trim().max(500).optional(),
  }),
  promo: z.object({
    eyebrow: z.string().trim().max(40).optional(),
    title: z.string().trim().max(120).optional(),
    body: z.string().trim().max(300).optional(),
    cta_label: z.string().trim().max(40).optional(),
    cta_href: z.string().trim().max(200).optional(),
    image_url: z.string().trim().max(500).optional(),
  }),
  policies: z.object({
    shipping: z.string().trim().max(5000).optional(),
    returns: z.string().trim().max(5000).optional(),
    privacy: z.string().trim().max(10000).optional(),
    terms: z.string().trim().max(10000).optional(),
  }),
});
export type SettingsInput = z.infer<typeof settingsSchema>;
