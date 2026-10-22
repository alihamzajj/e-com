-- =============================================================================
-- DEMO CATALOG — for local development and staging only.
-- Contains products, categories and one coupon. It contains NO orders, sales,
-- customers or reviews: dashboards only ever show real records.
-- Do not run this against a production store that already has a catalog.
-- =============================================================================

update public.store_settings set
  store_name = 'NORTHKEY',
  tagline = 'Keyboards engineered around the way you work.',
  contact_email = 'support@example.com',
  contact_phone = '+92 300 0000000',
  contact_address = 'Lahore, Pakistan',
  free_shipping_threshold = 25000,
  hero = jsonb_build_object(
    'title', 'Every keystroke made remarkable.',
    'subtitle', 'A thoughtfully engineered keyboard designed around the way you work, create, play, and move through your day.',
    'cta_label', 'Shop collection',
    'cta_href', '/products',
    'image_url', '/demo/hero-keyboard.webp'
  ),
  promo = jsonb_build_object(
    'eyebrow', 'Limited run',
    'title', 'Graphite edition is back.',
    'body', 'Anodised aluminium case, gasket mount, hot-swap PCB. Restocked in small batches.',
    'cta_label', 'Shop Graphite',
    'cta_href', '/products/arc-75-wireless',
    'image_url', '/demo/promo-banner.webp'
  ),
  policies = jsonb_build_object(
    'shipping', 'Orders are dispatched within 2 business days. Delivery times are estimates and may vary by city.',
    'returns', 'Unused items in original packaging can be returned within 7 days of delivery.',
    'privacy', 'We only use your details to process orders and support requests.',
    'terms', 'Prices are listed in the store currency and include applicable taxes.'
  )
where id = 1;

insert into public.categories (id, name, slug, description, image_url, sort_order) values
  ('11111111-0000-4000-8000-000000000001', 'Keyboards', 'keyboards', 'Wireless and wired mechanical keyboards.', '/demo/category-keyboards.webp', 1),
  ('11111111-0000-4000-8000-000000000002', 'Keycaps', 'keycaps', 'PBT keycap sets in house colourways.', '/demo/category-keycaps.webp', 2),
  ('11111111-0000-4000-8000-000000000003', 'Switches', 'switches', 'Factory-lubed linear and tactile switches.', '/demo/category-switches.webp', 3),
  ('11111111-0000-4000-8000-000000000004', 'Accessories', 'accessories', 'Cables, desk mats and tools.', '/demo/category-accessories.webp', 4)
on conflict (slug) do nothing;

-- Products ---------------------------------------------------------------------
insert into public.products (id, category_id, name, slug, short_description, description, specifications,
                             option_names, price, sale_price, cost_price, status, is_featured, low_stock_threshold)
values
  ('22222222-0000-4000-8000-000000000001', '11111111-0000-4000-8000-000000000001',
   'Arc 75 Wireless', 'arc-75-wireless',
   'Gasket-mounted 75% keyboard with tri-mode wireless and a status display.',
   'The Arc 75 pairs a gasket-mounted aluminium case with a hot-swap PCB, two programmable knobs and a small status display for battery and connection. Tri-mode: Bluetooth 5.3, 2.4 GHz and USB-C.',
   '[{"label":"Layout","value":"75%, 84 keys"},{"label":"Connectivity","value":"Bluetooth 5.3, 2.4 GHz, USB-C"},{"label":"Battery","value":"4000 mAh"},{"label":"Mount","value":"Gasket"},{"label":"Weight","value":"1.6 kg"}]',
   '{Color,Switch}', 32000, 28500, 17500, 'active', true, 5),
  ('22222222-0000-4000-8000-000000000002', '11111111-0000-4000-8000-000000000001',
   'Arc 65 Compact', 'arc-65-compact',
   'Compact 65% layout with a volume knob and dedicated arrows.',
   'Everything you need and nothing you do not. The Arc 65 keeps arrows and navigation keys in a footprint that leaves room for your mouse.',
   '[{"label":"Layout","value":"65%, 68 keys"},{"label":"Connectivity","value":"Bluetooth 5.3, USB-C"},{"label":"Mount","value":"Gasket"}]',
   '{Color}', 26000, null, 14000, 'active', true, 5),
  ('22222222-0000-4000-8000-000000000003', '11111111-0000-4000-8000-000000000001',
   'Slate TKL Pro', 'slate-tkl-pro',
   'Tenkeyless board with full function row and navigation cluster.',
   'A full-size feel without the number pad. Slate TKL Pro ships with south-facing RGB, PBT keycaps and a detachable coiled cable.',
   '[{"label":"Layout","value":"TKL, 87 keys"},{"label":"Connectivity","value":"USB-C"},{"label":"Polling rate","value":"1000 Hz"}]',
   '{Color}', 38000, null, 21000, 'active', true, 3),
  ('22222222-0000-4000-8000-000000000004', '11111111-0000-4000-8000-000000000001',
   'Mono 60', 'mono-60',
   'Minimal 60% board for travel and tidy desks.',
   'A compact 60% with layered shortcuts, PBT keycaps and a soft-touch case.',
   '[{"label":"Layout","value":"60%, 61 keys"},{"label":"Connectivity","value":"USB-C"}]',
   '{}', 18500, 16000, 9000, 'active', false, 5),
  ('22222222-0000-4000-8000-000000000005', '11111111-0000-4000-8000-000000000002',
   'Ember Keycap Set', 'ember-keycap-set',
   'Chalk white PBT set with ember accents.',
   'Double-shot PBT keycaps in our signature chalk and ember colourway. Covers 60% to full-size layouts.',
   '[{"label":"Material","value":"Double-shot PBT"},{"label":"Keys","value":"142"}]',
   '{Profile}', 9500, null, 4200, 'active', true, 5),
  ('22222222-0000-4000-8000-000000000006', '11111111-0000-4000-8000-000000000002',
   'Fog Keycap Set', 'fog-keycap-set',
   'Soft grey PBT set for a quieter desk.',
   'Dye-sublimated PBT in two tones of grey.',
   '[{"label":"Material","value":"Dye-sub PBT"},{"label":"Keys","value":"130"}]',
   '{}', 8800, null, 3900, 'active', false, 5),
  ('22222222-0000-4000-8000-000000000007', '11111111-0000-4000-8000-000000000003',
   'Ember Linear Switches', 'ember-linear-switches',
   'Smooth, factory-lubed linear switches.',
   'Five-pin linear switches with a 45 g actuation force, long-pole stem and factory lube.',
   '[{"label":"Type","value":"Linear"},{"label":"Actuation","value":"45 g"},{"label":"Travel","value":"3.8 mm"}]',
   '{Pack}', 3200, null, 1400, 'active', false, 10),
  ('22222222-0000-4000-8000-000000000008', '11111111-0000-4000-8000-000000000003',
   'Walnut Tactile Switches', 'walnut-tactile-switches',
   'Rounded tactile bump with a muted bottom-out.',
   'Five-pin tactile switches with a 55 g bump and nylon housing.',
   '[{"label":"Type","value":"Tactile"},{"label":"Actuation","value":"55 g"}]',
   '{Pack}', 3400, null, 1500, 'active', false, 10),
  ('22222222-0000-4000-8000-000000000009', '11111111-0000-4000-8000-000000000004',
   'Coiled Aviator Cable', 'coiled-aviator-cable',
   'USB-C coiled cable with a detachable aviator connector.',
   'Double-sleeved coiled cable, 1.8 m total length, with a GX16 aviator connector.',
   '[{"label":"Length","value":"1.8 m"},{"label":"Connector","value":"USB-C to USB-A"}]',
   '{Color}', 4200, 3600, 1600, 'active', true, 5),
  ('22222222-0000-4000-8000-000000000010', '11111111-0000-4000-8000-000000000004',
   'Felt Desk Mat', 'felt-desk-mat',
   'Wool felt desk mat with stitched edges.',
   'Dense merino felt with a natural rubber base.',
   '[{"label":"Material","value":"Merino felt"}]',
   '{Size}', 5500, null, 2100, 'active', false, 5),
  ('22222222-0000-4000-8000-000000000011', '11111111-0000-4000-8000-000000000004',
   'Walnut Wrist Rest', 'walnut-wrist-rest',
   'Solid walnut wrist rest with a cork base.',
   'Hand-finished solid walnut. Sized to match each layout.',
   '[{"label":"Material","value":"Solid walnut, cork base"}]',
   '{Size}', 6200, null, 2600, 'active', false, 5),
  ('22222222-0000-4000-8000-000000000012', '11111111-0000-4000-8000-000000000004',
   'Switch & Keycap Tool Kit', 'switch-keycap-tool-kit',
   'Wire keycap puller and switch puller.',
   'Everything needed to swap switches and keycaps without scratching your board.',
   '[]', '{}', 1800, null, 600, 'active', false, 5),
  ('22222222-0000-4000-8000-000000000013', '11111111-0000-4000-8000-000000000002',
   'Ember Artisan Esc', 'ember-artisan-esc',
   'Hand-poured resin escape key.',
   'A single hand-poured resin keycap in ember orange. Cherry profile, R1.',
   '[]', '{}', 2400, null, 900, 'active', false, 2)
on conflict (slug) do nothing;

-- Variants ---------------------------------------------------------------------
insert into public.product_variants (product_id, sku, title, options, price, sale_price, stock_quantity, position) values
  ('22222222-0000-4000-8000-000000000001', 'ARC75-CHK-LIN', 'Chalk / Linear', '{"Color":"Chalk","Switch":"Linear"}', null, null, 14, 1),
  ('22222222-0000-4000-8000-000000000001', 'ARC75-CHK-TAC', 'Chalk / Tactile', '{"Color":"Chalk","Switch":"Tactile"}', null, null, 9, 2),
  ('22222222-0000-4000-8000-000000000001', 'ARC75-GRA-LIN', 'Graphite / Linear', '{"Color":"Graphite","Switch":"Linear"}', 34000, 30500, 4, 3),
  ('22222222-0000-4000-8000-000000000001', 'ARC75-GRA-TAC', 'Graphite / Tactile', '{"Color":"Graphite","Switch":"Tactile"}', 34000, 30500, 0, 4),
  ('22222222-0000-4000-8000-000000000002', 'ARC65-CHK', 'Chalk', '{"Color":"Chalk"}', null, null, 18, 1),
  ('22222222-0000-4000-8000-000000000002', 'ARC65-GRA', 'Graphite', '{"Color":"Graphite"}', null, null, 11, 2),
  ('22222222-0000-4000-8000-000000000003', 'SLATE-GRA', 'Graphite', '{"Color":"Graphite"}', null, null, 7, 1),
  ('22222222-0000-4000-8000-000000000003', 'SLATE-FOG', 'Fog', '{"Color":"Fog"}', null, null, 2, 2),
  ('22222222-0000-4000-8000-000000000004', 'MONO60', 'Default', '{}', null, null, 25, 1),
  ('22222222-0000-4000-8000-000000000005', 'KC-EMBER-CHY', 'Cherry', '{"Profile":"Cherry"}', null, null, 30, 1),
  ('22222222-0000-4000-8000-000000000005', 'KC-EMBER-OEM', 'OEM', '{"Profile":"OEM"}', null, null, 12, 2),
  ('22222222-0000-4000-8000-000000000006', 'KC-FOG', 'Default', '{}', null, null, 20, 1),
  ('22222222-0000-4000-8000-000000000007', 'SW-LIN-35', '35 switches', '{"Pack":"35 switches"}', 3200, null, 60, 1),
  ('22222222-0000-4000-8000-000000000007', 'SW-LIN-70', '70 switches', '{"Pack":"70 switches"}', 5800, null, 40, 2),
  ('22222222-0000-4000-8000-000000000007', 'SW-LIN-110', '110 switches', '{"Pack":"110 switches"}', 8600, 7900, 25, 3),
  ('22222222-0000-4000-8000-000000000008', 'SW-TAC-35', '35 switches', '{"Pack":"35 switches"}', 3400, null, 50, 1),
  ('22222222-0000-4000-8000-000000000008', 'SW-TAC-70', '70 switches', '{"Pack":"70 switches"}', 6200, null, 30, 2),
  ('22222222-0000-4000-8000-000000000009', 'CBL-EMBER', 'Ember', '{"Color":"Ember"}', null, null, 22, 1),
  ('22222222-0000-4000-8000-000000000009', 'CBL-GRAPHITE', 'Graphite', '{"Color":"Graphite"}', null, null, 16, 2),
  ('22222222-0000-4000-8000-000000000010', 'MAT-M', 'Medium (60 × 30 cm)', '{"Size":"Medium (60 × 30 cm)"}', 5500, null, 20, 1),
  ('22222222-0000-4000-8000-000000000010', 'MAT-L', 'Large (90 × 40 cm)', '{"Size":"Large (90 × 40 cm)"}', 6900, null, 14, 2),
  ('22222222-0000-4000-8000-000000000011', 'WR-75', '75% / 65%', '{"Size":"75% / 65%"}', null, null, 10, 1),
  ('22222222-0000-4000-8000-000000000011', 'WR-TKL', 'TKL', '{"Size":"TKL"}', 6800, null, 6, 2),
  ('22222222-0000-4000-8000-000000000012', 'TOOLKIT', 'Default', '{}', null, null, 3, 1),
  ('22222222-0000-4000-8000-000000000013', 'ART-ESC-EMBER', 'Default', '{}', null, null, 0, 1)
on conflict (sku) do nothing;

-- Images -----------------------------------------------------------------------
insert into public.product_images (product_id, url, alt, position) values
  ('22222222-0000-4000-8000-000000000001', '/demo/arc75-chalk.webp', 'Arc 75 Wireless in Chalk', 0),
  ('22222222-0000-4000-8000-000000000001', '/demo/arc75-graphite.webp', 'Arc 75 Wireless in Graphite', 1),
  ('22222222-0000-4000-8000-000000000001', '/demo/arc75-detail.webp', 'Arc 75 knobs and status display', 2),
  ('22222222-0000-4000-8000-000000000002', '/demo/arc65-chalk.webp', 'Arc 65 Compact in Chalk', 0),
  ('22222222-0000-4000-8000-000000000002', '/demo/arc65-graphite.webp', 'Arc 65 Compact in Graphite', 1),
  ('22222222-0000-4000-8000-000000000003', '/demo/slate-tkl.webp', 'Slate TKL Pro in Graphite', 0),
  ('22222222-0000-4000-8000-000000000003', '/demo/slate-tkl-fog.webp', 'Slate TKL Pro in Fog', 1),
  ('22222222-0000-4000-8000-000000000004', '/demo/mono60.webp', 'Mono 60 keyboard', 0),
  ('22222222-0000-4000-8000-000000000005', '/demo/keycaps-ember.webp', 'Ember keycap set', 0),
  ('22222222-0000-4000-8000-000000000006', '/demo/keycaps-fog.webp', 'Fog keycap set', 0),
  ('22222222-0000-4000-8000-000000000007', '/demo/switch-linear.webp', 'Ember linear switches', 0),
  ('22222222-0000-4000-8000-000000000008', '/demo/switch-tactile.webp', 'Walnut tactile switches', 0),
  ('22222222-0000-4000-8000-000000000009', '/demo/cable-ember.webp', 'Coiled cable in Ember', 0),
  ('22222222-0000-4000-8000-000000000009', '/demo/cable-graphite.webp', 'Coiled cable in Graphite', 1),
  ('22222222-0000-4000-8000-000000000010', '/demo/deskmat.webp', 'Felt desk mat', 0),
  ('22222222-0000-4000-8000-000000000011', '/demo/wrist-rest.webp', 'Walnut wrist rest', 0),
  ('22222222-0000-4000-8000-000000000012', '/demo/tool-kit.webp', 'Switch and keycap tool kit', 0),
  ('22222222-0000-4000-8000-000000000013', '/demo/artisan-ember.webp', 'Ember artisan escape keycap', 0);

insert into public.coupons (code, description, discount_type, value, max_discount, min_order_total, per_customer_limit)
values ('WELCOME10', '10% off your first order (max 3,000)', 'percentage', 10, 3000, 5000, 1)
on conflict (code) do nothing;
