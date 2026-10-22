# Dashboard metrics: definitions

All figures are computed in Postgres by `public.admin_sales_report(from, to)`
(`supabase/migrations/20261022000004_content_and_reporting.sql`) from real order
records. Nothing on the dashboard is hard-coded or sampled.

## Date ranges and time zone

- A range is a half-open interval `[from, to)` of timestamps.
- Presets (Today, Last 7 days, Last 30 days, This month, Last month) are computed
  in the **store time zone** (`store_settings.timezone`, default `Asia/Karachi`),
  so "Today" means midnight-to-midnight in the store's local time.
- Orders are attributed to the day they were **placed** (`orders.placed_at`).
- Daily and monthly buckets also use the store time zone.

## Which orders count towards sales

An order is a **counted order** when all of these are true:

1. It was placed inside the range.
2. Its status is not `cancelled`.
3. It is cash on delivery, **or** it is an online order whose payment was
   verified by the payment gateway (`payment_status` is `paid`,
   `partially_refunded` or `refunded`).

Online orders that are still awaiting payment, or whose payment failed, are not
sales. They are shown separately as **Awaiting payment**.

Returned orders still count as sales; the money given back is recorded as a
refund (below), so it is subtracted exactly once.

## Formulas

| Metric | Formula |
| --- | --- |
| Gross sales | `sum(subtotal)` of counted orders — item revenue at the price paid, before coupon discounts; excludes shipping and tax. |
| Discounts | `sum(discount_total)` of counted orders. |
| Refunds | `sum(refunded_total)` of counted orders, attributed to the order's placement date. |
| **Net sales** | `gross sales − discounts − refunds`. |
| Shipping collected | `sum(shipping_total)` of counted orders (reported separately, not part of net sales). |
| Revenue (chart) | `sum(total − refunded_total)` of counted orders — net sales plus shipping. |
| Average order value | `(gross sales − discounts) / counted orders`. |
| Total orders | All orders placed in the range, whatever their status. |
| Pending orders | Orders in the range with status `pending`, `confirmed`, `processing` or `shipped` (not yet complete). |
| Completed orders | Orders in the range with status `delivered`. |
| Cancelled orders | Orders in the range with status `cancelled`. |
| Units sold | `sum(quantity)` of order items on counted orders. |
| Total customers | All accounts with the `customer` role (all time). New customers = accounts created in the range. |
| Low stock | Active variants whose stock is at or below the product's low-stock threshold (current, not range-based). |
| Best sellers | Products ranked by units sold on counted orders, then by item revenue. |
| Category sales | Item revenue on counted orders grouped by the category the product was in **when it was ordered** (snapshotted on the order item). |

## Revenue vs. profit

Revenue is not profit. **Gross profit** is only shown when every counted order
line has a recorded unit cost (`products.cost_price`, snapshotted onto
`order_items.unit_cost` when the order is placed):

```
gross profit = sum((unit_price − unit_cost) × quantity) − discounts
```

If any line is missing a cost, the dashboard shows how many lines have costs
instead of a misleading number. Gross profit excludes shipping costs, payment
fees, refunds of returned goods that were restocked, and operating expenses — the
store does not record those, so net profit is not calculated.

## Refund and cancellation handling

- **Cancelling** an order (staff, customer, or an expired online payment) restocks
  its items, releases any coupon use, and removes it from sales. A cancelled order
  never had money recorded, so there is nothing to refund.
- **Refunds** are recorded against paid orders only and can never exceed what was
  paid (`refunded_total ≤ paid_total`, enforced by a database constraint). Partial
  refunds set `payment_status = partially_refunded`; full refunds set `refunded`.
- Online refunds are issued through the gateway first and only recorded once the
  gateway accepts them. Cash-on-delivery refunds are recorded manually by staff.

These rules are covered by `tests/db/commerce.test.ts` (see "dashboard metrics").
