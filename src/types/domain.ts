// Hand-maintained row shapes for the tables the app reads. Regenerate full
// database types with `npm run db:types` once the Supabase CLI is linked.

export const PERMISSIONS = ["products", "orders", "customers", "support", "coupons", "reports", "settings"] as const;
export type Permission = (typeof PERMISSIONS)[number];
export type Role = "customer" | "staff" | "admin";

export type Profile = {
  id: string;
  email: string | null;
  full_name: string | null;
  phone: string | null;
  role: Role;
  permissions: Permission[];
  marketing_opt_in: boolean;
  created_at: string;
};

export type ShippingMethod = { id: string; label: string; price: number; eta?: string };

export type HeroContent = {
  title?: string;
  subtitle?: string;
  cta_label?: string;
  cta_href?: string;
  image_url?: string;
};

export type PromoContent = HeroContent & { eyebrow?: string; body?: string };

export type StoreSettings = {
  storeName: string;
  tagline: string;
  logoUrl: string | null;
  currency: string;
  locale: string;
  timezone: string;
  contactEmail: string | null;
  contactPhone: string | null;
  contactAddress: string | null;
  socialLinks: Record<string, string>;
  shippingMethods: ShippingMethod[];
  freeShippingThreshold: number | null;
  codEnabled: boolean;
  onlinePaymentsEnabled: boolean;
  newsletterEnabled: boolean;
  lowStockAlertEmail: string | null;
  hero: HeroContent;
  promo: PromoContent;
  policies: Record<string, string>;
};

export type Category = {
  id: string;
  parent_id: string | null;
  name: string;
  slug: string;
  description: string | null;
  image_url: string | null;
  is_visible: boolean;
  sort_order: number;
};

export type ProductStatus = "draft" | "active" | "archived";

export type CatalogProduct = {
  id: string;
  name: string;
  slug: string;
  short_description: string | null;
  price: number;
  sale_price: number | null;
  effective_price: number;
  min_variant_price: number;
  max_variant_price: number;
  rating_avg: number;
  rating_count: number;
  sold_count: number;
  published_at: string | null;
  category_name: string | null;
  category_slug: string | null;
  image_url: string | null;
  image_alt: string | null;
  total_stock: number;
  low_stock_threshold: number;
  variant_count: number;
  default_variant_id: string | null;
  total_count: number;
};

export type ProductVariant = {
  id: string;
  product_id: string;
  sku: string;
  title: string;
  options: Record<string, string>;
  price: number | null;
  sale_price: number | null;
  stock_quantity: number;
  is_active: boolean;
  position: number;
};

export type ProductImage = { id: string; url: string; alt: string | null; position: number; storage_path?: string | null };

export type Specification = { label: string; value: string };

export type ProductDetail = {
  id: string;
  name: string;
  slug: string;
  short_description: string | null;
  description: string | null;
  specifications: Specification[];
  option_names: string[];
  price: number;
  sale_price: number | null;
  status: ProductStatus;
  is_featured: boolean;
  low_stock_threshold: number;
  rating_avg: number;
  rating_count: number;
  category: Pick<Category, "id" | "name" | "slug"> | null;
  images: ProductImage[];
  variants: Omit<ProductVariant, "stock_quantity">[];
};

export type QuoteLine = {
  variant_id: string;
  product_id: string | null;
  product_name: string;
  product_slug: string | null;
  variant_title: string | null;
  options: Record<string, string>;
  sku: string | null;
  image_url: string | null;
  unit_price: number | null;
  compare_at_price: number | null;
  quantity: number;
  line_total: number;
  available_quantity: number;
  issue: null | "unavailable" | "out_of_stock" | "insufficient_stock";
};

export type CartQuote = {
  currency: string;
  lines: QuoteLine[];
  item_count: number;
  issue_count: number;
  subtotal: number;
  discount_total: number;
  shipping_total: number;
  tax_total: number;
  total: number;
  shipping_method: ShippingMethod | null;
  shipping_methods: ShippingMethod[];
  free_shipping_threshold: number | null;
  coupon: null | { id: string | null; code: string; discount: number; valid: boolean; error: string | null };
};

export type OrderStatus = "pending" | "confirmed" | "processing" | "shipped" | "delivered" | "cancelled" | "returned";
export type PaymentStatus = "unpaid" | "pending" | "paid" | "failed" | "partially_refunded" | "refunded";

export type Address = {
  id: string;
  label: string | null;
  full_name: string;
  phone: string;
  line1: string;
  line2: string | null;
  city: string;
  state: string | null;
  postal_code: string | null;
  country: string;
  is_default: boolean;
};

export type ShippingAddressSnapshot = Omit<Address, "id" | "label" | "is_default">;

export type Order = {
  id: string;
  order_number: string;
  user_id: string | null;
  email: string;
  phone: string;
  customer_name: string;
  shipping_address: ShippingAddressSnapshot;
  shipping_method: string;
  shipping_method_label: string;
  status: OrderStatus;
  payment_method: "cod" | "online";
  payment_status: PaymentStatus;
  currency: string;
  subtotal: number;
  discount_total: number;
  shipping_total: number;
  tax_total: number;
  total: number;
  paid_total: number;
  refunded_total: number;
  coupon_code: string | null;
  customer_note: string | null;
  tracking_number: string | null;
  tracking_url: string | null;
  cancelled_reason: string | null;
  placed_at: string;
};

export type OrderItem = {
  id: string;
  product_id: string | null;
  variant_id: string | null;
  product_name: string;
  product_slug: string | null;
  variant_title: string | null;
  options: Record<string, string>;
  sku: string;
  image_url: string | null;
  unit_price: number;
  unit_cost?: number | null;
  quantity: number;
  line_total: number;
};

export type OrderStatusEvent = {
  id: string;
  from_status: OrderStatus | null;
  to_status: OrderStatus;
  note: string | null;
  created_at: string;
};

export type Review = {
  id: string;
  author_name: string;
  rating: number;
  title: string | null;
  body: string | null;
  created_at: string;
};

export type ProductQuestion = {
  id: string;
  parent_id: string | null;
  author_name: string;
  body: string;
  status: "pending" | "answered" | "hidden" | "spam";
  created_at: string;
  answers: { id: string; author_name: string; body: string; created_at: string }[];
};
