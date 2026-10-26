// Starter catalog data, shared by demo mode (demo-catalog.ts) and the script that
// writes the matching SQL for a live database (scripts/generate-catalog-sql.ts).
// Keep this file free of imports so plain Node can load it.

export const IMG = "/demo/fashion";

export type DemoCategory = {
  id: string;
  slug: string;
  name: string;
  description: string;
  image: string; // image key in /demo/fashion
  parent?: string; // parent category slug
};

export type DemoProduct = {
  n: number;
  name: string;
  slug: string;
  category: string;
  short: string;
  description: string;
  price: number;
  sale?: number;
  featured?: boolean;
  colors: string[]; // image key suffix per colour, e.g. "tee-white"
  sizes?: string[];
  /** Option name for `sizes`, e.g. "Fits" for the phone model a case is made for. */
  sizeLabel?: string;
  stock: number[]; // cycled across variants
  rating?: [number, number];
  sold: number;
  specs: [string, string][];
  daysOld: number;
};

const hex = (n: number, width = 12) => n.toString(16).padStart(width, "0");
const cid = (n: number) => `00000000-0000-4000-8000-${hex(n)}`;

// Top-level categories first (in menu order), then their subcategories.
export const CATEGORY_DEFS: DemoCategory[] = [
  { id: cid(0xc1), slug: "clothing", name: "Clothing", description: "Leather jackets and everyday essentials.", image: "category-clothing" },
  { id: cid(0xd01), slug: "leather-goods", name: "Leather Goods", description: "Bags, belts and wallets in real leather.", image: "category-leather-goods" },
  { id: cid(0xc3), slug: "shoes", name: "Shoes", description: "Sneakers, formal shoes and boots.", image: "category-shoes" },
  { id: cid(0xd02), slug: "watches", name: "Watches", description: "Classic, dress and smart watches.", image: "category-watches" },
  { id: cid(0xd03), slug: "mobile-accessories", name: "Mobile Accessories", description: "Cases, chargers, earbuds and power banks.", image: "category-mobile-accessories" },
  { id: cid(0xc4), slug: "accessories", name: "Accessories", description: "Scarves and caps.", image: "category-accessories" },

  { id: cid(0xd05), slug: "leather-jackets", name: "Leather Jackets", description: "Biker, bomber and suede jackets.", image: "category-leather-jackets", parent: "clothing" },
  { id: cid(0xd04), slug: "everyday-wear", name: "Everyday Wear", description: "Tees, hoodies, dresses and trousers.", image: "tee-sage", parent: "clothing" },
  { id: cid(0xc2), slug: "handbags", name: "Handbags", description: "Totes, crossbody and evening bags.", image: "category-handbags", parent: "leather-goods" },
  { id: cid(0xd06), slug: "belts", name: "Belts", description: "Dress and casual leather belts.", image: "belt-brown", parent: "leather-goods" },
  { id: cid(0xd07), slug: "wallets", name: "Wallets", description: "Bifold wallets and card holders.", image: "wallet-brown", parent: "leather-goods" },
  { id: cid(0xd08), slug: "sneakers", name: "Sneakers", description: "Leather sneakers for every day.", image: "sneaker-white", parent: "shoes" },
  { id: cid(0xd09), slug: "formal-shoes", name: "Formal Shoes", description: "Oxfords and loafers.", image: "oxford-brown", parent: "shoes" },
  { id: cid(0xd0a), slug: "boots", name: "Boots", description: "Chelsea boots in suede and leather.", image: "boot-brown", parent: "shoes" },
  { id: cid(0xd0b), slug: "mens-watches", name: "Men's Watches", description: "Chronographs and classic dials.", image: "watch-brown", parent: "watches" },
  { id: cid(0xd0c), slug: "womens-watches", name: "Women's Watches", description: "Slim dress watches.", image: "watchgold-gold", parent: "watches" },
  { id: cid(0xd0d), slug: "smart-watches", name: "Smart Watches", description: "Fitness tracking and notifications.", image: "smartwatch-black", parent: "watches" },
  { id: cid(0xd0e), slug: "phone-cases", name: "Phone Cases", description: "Leather and clear cases for iPhone and Galaxy.", image: "phonecase-brown", parent: "mobile-accessories" },
  { id: cid(0xd0f), slug: "chargers-cables", name: "Chargers & Cables", description: "Fast chargers and USB-C cables.", image: "charger-white", parent: "mobile-accessories" },
  { id: cid(0xd10), slug: "earbuds", name: "Earbuds", description: "Wireless earbuds with charging cases.", image: "earbuds-white", parent: "mobile-accessories" },
  { id: cid(0xd11), slug: "power-banks", name: "Power Banks", description: "Portable chargers for long days out.", image: "powerbank-black", parent: "mobile-accessories" },
];

export const APPAREL = ["S", "M", "L", "XL"];
const SHOE = ["40", "41", "42", "43", "44"];
const PHONES = ["iPhone 15", "iPhone 15 Pro", "iPhone 16", "Galaxy S24"];

export const PRODUCTS: DemoProduct[] = [
  { n: 1, name: "Essential Cotton Tee", slug: "essential-cotton-tee", category: "everyday-wear", short: "Heavyweight organic cotton tee with a relaxed fit.", description: "Cut from 240 gsm organic cotton with a soft enzyme wash. Dropped shoulders, ribbed collar and a boxy, relaxed fit that keeps its shape after every wash.", price: 2490, featured: true, colors: ["tee-white", "tee-black", "tee-sage"], sizes: APPAREL, stock: [24, 18, 9, 4], rating: [4.7, 38], sold: 212, specs: [["Material", "100% organic cotton, 240 gsm"], ["Fit", "Relaxed"], ["Care", "Machine wash cold"]], daysOld: 40 },
  { n: 2, name: "Oversized Fleece Hoodie", slug: "oversized-fleece-hoodie", category: "everyday-wear", short: "Brushed-back fleece hoodie with a double-layer hood.", description: "A cosy oversized hoodie in brushed-back cotton fleece with a kangaroo pocket, flat drawcords and a double-layer hood.", price: 6990, sale: 5490, featured: true, colors: ["hoodie-grey", "hoodie-black"], sizes: APPAREL, stock: [12, 7, 3, 0], rating: [4.8, 51], sold: 164, specs: [["Material", "80% cotton, 20% polyester"], ["Weight", "380 gsm"], ["Fit", "Oversized"]], daysOld: 25 },
  { n: 3, name: "Linen Summer Dress", slug: "linen-summer-dress", category: "everyday-wear", short: "Breathable linen midi dress with adjustable straps.", description: "Washed European linen in a flowing A-line midi. Adjustable straps, a fitted bodice and side pockets.", price: 8900, featured: true, colors: ["dress-sand", "dress-terracotta"], sizes: ["S", "M", "L"], stock: [6, 10, 2], rating: [4.6, 22], sold: 98, specs: [["Material", "100% linen"], ["Length", "Midi"], ["Care", "Hand wash"]], daysOld: 6 },
  { n: 4, name: "Denim Trucker Jacket", slug: "denim-trucker-jacket", category: "everyday-wear", short: "Classic rigid denim jacket with chest pockets.", description: "A timeless trucker jacket in 13 oz rigid denim that softens with wear. Button front, two chest pockets, adjustable waist tabs.", price: 11500, colors: ["jacket-indigo"], sizes: ["M", "L", "XL"], stock: [5, 8, 3], rating: [4.5, 17], sold: 61, specs: [["Material", "13 oz cotton denim"], ["Fit", "Regular"]], daysOld: 70 },
  { n: 5, name: "Wide-Leg Trousers", slug: "wide-leg-trousers", category: "everyday-wear", short: "High-rise tailored trousers with a fluid drape.", description: "Tailored wide-leg trousers with a high rise, front pleats and a soft drape that works from office to evening.", price: 5990, colors: ["trousers-black", "trousers-beige"], sizes: ["S", "M", "L"], stock: [9, 11, 6], rating: [4.4, 12], sold: 47, specs: [["Material", "Viscose blend"], ["Rise", "High"]], daysOld: 3 },
  { n: 6, name: "Chunky Knit Cardigan", slug: "chunky-knit-cardigan", category: "everyday-wear", short: "Soft wool-blend cardigan with horn-effect buttons.", description: "A slouchy V-neck cardigan knitted from a soft wool blend, finished with horn-effect buttons and ribbed cuffs.", price: 7400, sale: 6200, colors: ["cardigan-cream"], sizes: APPAREL, stock: [4, 6, 2, 1], rating: [4.9, 14], sold: 39, specs: [["Material", "50% wool, 50% acrylic"]], daysOld: 12 },
  { n: 7, name: "Canvas Market Tote", slug: "canvas-market-tote", category: "handbags", short: "Sturdy waxed-canvas tote with an inner pocket.", description: "Roomy enough for a laptop and the day's shopping. Waxed cotton canvas, reinforced handles and an inner zip pocket.", price: 3200, featured: true, colors: ["tote-natural", "tote-black"], stock: [30, 22], rating: [4.6, 44], sold: 230, specs: [["Material", "Waxed cotton canvas"], ["Size", "42 × 38 × 12 cm"]], daysOld: 55 },
  { n: 8, name: "Leather Crossbody Bag", slug: "leather-crossbody-bag", category: "handbags", short: "Full-grain leather crossbody with a brass clasp.", description: "A compact crossbody in full-grain leather with an adjustable strap, magnetic brass clasp and two inner compartments.", price: 12900, sale: 10900, featured: true, colors: ["crossbody-tan", "crossbody-black", "crossbody-ember"], stock: [8, 5, 3], rating: [4.8, 63], sold: 187, specs: [["Material", "Full-grain leather"], ["Strap", "Adjustable, 110–130 cm"]], daysOld: 18 },
  { n: 9, name: "Quilted Chain Shoulder Bag", slug: "quilted-chain-shoulder-bag", category: "handbags", short: "Diamond-quilted shoulder bag on a gold-tone chain.", description: "Soft diamond-quilted lambskin-effect leather with a gold-tone chain strap and turn-lock closure.", price: 15500, colors: ["quilted-black", "quilted-cream"], stock: [4, 6], rating: [4.7, 29], sold: 76, specs: [["Material", "Quilted vegan leather"], ["Closure", "Turn-lock"]], daysOld: 2 },
  { n: 10, name: "Evening Clutch", slug: "evening-clutch", category: "handbags", short: "Slim envelope clutch for evenings out.", description: "A slim envelope clutch with a satin lining and a detachable wrist strap.", price: 6800, colors: ["clutch-gold", "clutch-black"], stock: [2, 3], rating: [4.5, 9], sold: 31, specs: [["Size", "28 × 15 cm"]], daysOld: 30 },
  { n: 11, name: "Mini Bucket Bag", slug: "mini-bucket-bag", category: "handbags", short: "Drawstring bucket bag in ember leather.", description: "A playful mini bucket bag with a drawstring top and top handle. Restocking soon.", price: 9200, colors: ["bucket-ember"], stock: [0], rating: [4.9, 11], sold: 54, specs: [["Material", "Pebbled leather"]], daysOld: 15 },
  { n: 12, name: "Everyday Leather Sneakers", slug: "everyday-leather-sneakers", category: "sneakers", short: "Minimal leather sneakers on a cushioned sole.", description: "Clean leather uppers, a padded collar and a cushioned rubber cupsole built for all-day wear.", price: 13900, featured: true, colors: ["sneaker-white", "sneaker-black"], sizes: SHOE, stock: [5, 8, 10, 6, 2], rating: [4.7, 58], sold: 143, specs: [["Upper", "Full-grain leather"], ["Sole", "Rubber cupsole"]], daysOld: 8 },
  { n: 13, name: "Suede Penny Loafers", slug: "suede-penny-loafers", category: "formal-shoes", short: "Soft suede loafers with a hand-stitched apron.", description: "Unlined suede loafers with a hand-stitched apron toe and a flexible leather sole.", price: 11200, colors: ["loafer-brown"], sizes: ["40", "41", "42", "43"], stock: [3, 4, 4, 1], rating: [4.4, 16], sold: 40, specs: [["Upper", "Suede"]], daysOld: 90 },
  { n: 14, name: "Wool Blend Scarf", slug: "wool-blend-scarf", category: "accessories", short: "Oversized brushed scarf with fringed ends.", description: "An oversized brushed wool-blend scarf, soft enough to wear all winter.", price: 3900, sale: 3200, colors: ["scarf-camel", "scarf-grey"], stock: [14, 9], rating: [4.6, 21], sold: 88, specs: [["Size", "200 × 60 cm"]], daysOld: 20 },
  { n: 15, name: "Classic Baseball Cap", slug: "classic-baseball-cap", category: "accessories", short: "Six-panel cotton twill cap with an adjustable strap.", description: "Washed cotton twill, curved brim and an adjustable brass buckle strap.", price: 2200, colors: ["cap-black", "cap-ember"], stock: [25, 12], rating: [4.3, 19], sold: 120, specs: [["Material", "Cotton twill"]], daysOld: 1 },
  { n: 16, name: "Leather Dress Belt", slug: "leather-dress-belt", category: "belts", short: "Vegetable-tanned leather belt with a brass buckle.", description: "A 3 cm vegetable-tanned leather belt with a solid brass buckle that ages beautifully.", price: 3400, colors: ["belt-brown", "belt-black"], sizes: ["30", "32", "34", "36"], stock: [6, 8, 7, 3], rating: [4.5, 13], sold: 66, specs: [["Width", "3 cm"], ["Material", "Vegetable-tanned leather"]], daysOld: 48 },

  // Leather jackets
  { n: 17, name: "Classic Leather Biker Jacket", slug: "classic-leather-biker-jacket", category: "leather-jackets", short: "Full-grain leather biker with an asymmetric zip.", description: "Cut from soft full-grain cowhide with an asymmetric front zip, snap-down lapels, zipped cuffs and a buckled waist belt. Quilted lining for cooler months.", price: 24900, sale: 21900, featured: true, colors: ["biker-black", "biker-brown"], sizes: APPAREL, stock: [4, 6, 5, 2], rating: [4.8, 34], sold: 96, specs: [["Material", "Full-grain cowhide"], ["Lining", "Quilted polyester"], ["Fit", "Regular"]], daysOld: 4 },
  { n: 18, name: "Lambskin Bomber Jacket", slug: "lambskin-bomber-jacket", category: "leather-jackets", short: "Lightweight lambskin bomber with ribbed trims.", description: "A soft lambskin bomber with a centre zip, ribbed collar, cuffs and hem, and two angled welt pockets.", price: 22500, colors: ["bomber-black", "bomber-olive"], sizes: APPAREL, stock: [3, 5, 4, 2], rating: [4.6, 18], sold: 52, specs: [["Material", "Lambskin leather"], ["Trims", "Ribbed knit"]], daysOld: 9 },
  { n: 19, name: "Suede Trucker Jacket", slug: "suede-trucker-jacket", category: "leather-jackets", short: "Goat suede jacket with button-flap pockets.", description: "A trucker-style jacket in brushed goat suede with a button front, two flap chest pockets and adjustable waist tabs.", price: 19900, colors: ["suede-tan"], sizes: ["M", "L", "XL"], stock: [3, 4, 2], rating: [4.5, 11], sold: 28, specs: [["Material", "Goat suede"], ["Fit", "Regular"]], daysOld: 14 },

  // Belts and wallets
  { n: 20, name: "Reversible Leather Belt", slug: "reversible-leather-belt", category: "belts", short: "Black on one side, brown on the other.", description: "Two belts in one: a reversible full-grain leather strap with a turning silver-tone buckle.", price: 2900, colors: ["belt-black", "belt-brown"], sizes: ["30", "32", "34", "36", "38"], stock: [8, 10, 9, 5, 3], rating: [4.4, 22], sold: 104, specs: [["Width", "3.5 cm"], ["Buckle", "Rotating, silver-tone"]], daysOld: 22 },
  { n: 21, name: "Casual Tan Belt", slug: "casual-tan-belt", category: "belts", short: "Thick tan leather belt for jeans and chinos.", description: "A 4 cm tan leather belt with a brass roller buckle, made for jeans and casual trousers.", price: 3600, colors: ["belt-tan"], sizes: ["30", "32", "34", "36"], stock: [5, 7, 6, 2], rating: [4.6, 9], sold: 37, specs: [["Width", "4 cm"], ["Buckle", "Brass roller"]], daysOld: 33 },
  { n: 22, name: "Slim Bifold Wallet", slug: "slim-bifold-wallet", category: "wallets", short: "Slim leather wallet with six card slots.", description: "A slim bifold in vegetable-tanned leather with six card slots, a full-length note pocket and RFID-blocking lining.", price: 3900, sale: 3400, featured: true, colors: ["wallet-brown", "wallet-black"], stock: [12, 9], rating: [4.7, 41], sold: 158, specs: [["Material", "Vegetable-tanned leather"], ["Cards", "6 slots"], ["RFID", "Blocking lining"]], daysOld: 16 },
  { n: 23, name: "Leather Card Holder", slug: "leather-card-holder", category: "wallets", short: "Minimal card holder for four cards and notes.", description: "A pocket-sized card holder with three slots on the outside and a centre pocket for folded notes.", price: 1900, colors: ["cardholder-tan", "cardholder-navy"], stock: [20, 15], rating: [4.5, 26], sold: 131, specs: [["Cards", "4–6"], ["Size", "10 × 7 cm"]], daysOld: 5 },

  // Shoes
  { n: 24, name: "Leather Oxford Shoes", slug: "leather-oxford-shoes", category: "formal-shoes", short: "Polished calf-leather Oxfords for the office.", description: "Classic closed-lace Oxfords in polished calf leather on a stitched leather sole with a rubber heel.", price: 15900, featured: true, colors: ["oxford-black", "oxford-brown"], sizes: SHOE, stock: [4, 6, 7, 5, 2], rating: [4.7, 24], sold: 69, specs: [["Upper", "Calf leather"], ["Sole", "Leather with rubber heel"]], daysOld: 11 },
  { n: 25, name: "Suede Chelsea Boots", slug: "suede-chelsea-boots", category: "boots", short: "Pull-on suede Chelsea boots with elastic sides.", description: "Water-resistant suede Chelsea boots with elastic side panels, a pull tab and a cushioned rubber sole.", price: 17500, colors: ["boot-brown", "boot-black"], sizes: SHOE, stock: [3, 5, 5, 4, 1], rating: [4.6, 19], sold: 44, specs: [["Upper", "Water-resistant suede"], ["Sole", "Rubber"]], daysOld: 27 },

  // Watches
  { n: 26, name: "Classic Chronograph Watch", slug: "classic-chronograph-watch", category: "mens-watches", short: "42 mm steel chronograph on a leather strap.", description: "A 42 mm stainless-steel chronograph with a sapphire-coated crystal, 50 m water resistance and a quick-release leather strap.", price: 18900, sale: 16500, featured: true, colors: ["watch-brown", "watch-black"], stock: [6, 4], rating: [4.8, 37], sold: 88, specs: [["Case", "42 mm stainless steel"], ["Movement", "Quartz chronograph"], ["Water resistance", "50 m"]], daysOld: 7 },
  { n: 27, name: "Petite Mesh Watch", slug: "petite-mesh-watch", category: "womens-watches", short: "Slim 32 mm watch on a fine mesh bracelet.", description: "A slim 32 mm dress watch with a soft cream dial and a fine Milanese mesh bracelet with a magnetic clasp.", price: 14500, colors: ["watchgold-gold", "watchgold-rose"], stock: [5, 4], rating: [4.7, 21], sold: 63, specs: [["Case", "32 mm"], ["Bracelet", "Milanese mesh"], ["Water resistance", "30 m"]], daysOld: 19 },
  { n: 28, name: "Active Smart Watch", slug: "active-smart-watch", category: "smart-watches", short: "AMOLED smart watch with heart-rate and GPS.", description: "A bright 1.8\" AMOLED display, heart-rate and sleep tracking, built-in GPS, call and message alerts, and up to 7 days of battery.", price: 21900, featured: true, colors: ["smartwatch-black", "smartwatch-silver"], stock: [9, 6], rating: [4.5, 46], sold: 121, specs: [["Display", "1.8\" AMOLED"], ["Battery", "Up to 7 days"], ["Works with", "Android and iPhone"]], daysOld: 2 },

  // Mobile accessories
  { n: 29, name: "Leather Phone Case", slug: "leather-phone-case", category: "phone-cases", short: "Slim full-grain leather case with MagSafe magnets.", description: "A slim case in full-grain leather with a soft microfibre lining, raised camera edge and built-in magnets for MagSafe chargers.", price: 2400, featured: true, colors: ["phonecase-brown", "phonecase-black"], sizes: PHONES, sizeLabel: "Fits", stock: [8, 6, 10, 5], rating: [4.6, 33], sold: 142, specs: [["Material", "Full-grain leather"], ["Wireless charging", "Yes"]], daysOld: 6 },
  { n: 30, name: "Clear Shockproof Case", slug: "clear-shockproof-case", category: "phone-cases", short: "Crystal-clear case with reinforced corners.", description: "A clear case that resists yellowing, with air-cushioned corners and raised edges to protect the screen and camera.", price: 1200, colors: ["clearcase-clear"], sizes: [...PHONES, "Galaxy A55"], sizeLabel: "Fits", stock: [20, 15, 18, 12, 9], rating: [4.4, 58], sold: 260, specs: [["Material", "TPU and polycarbonate"], ["Drop tested", "2 m"]], daysOld: 12 },
  { n: 31, name: "20W Fast Charger with USB-C Cable", slug: "20w-fast-charger", category: "chargers-cables", short: "Compact 20W USB-C charger with a braided cable.", description: "A compact 20W USB-C power adapter with a braided USB-C cable. Charges a phone to 50% in about 30 minutes.", price: 2800, colors: ["charger-white"], sizes: ["1 m", "2 m"], sizeLabel: "Cable", stock: [25, 14], rating: [4.5, 29], sold: 175, specs: [["Output", "20W USB-C PD"], ["Cable", "Braided USB-C to USB-C"]], daysOld: 10 },
  { n: 32, name: "Wireless Earbuds Pro", slug: "wireless-earbuds-pro", category: "earbuds", short: "Noise-cancelling earbuds with 30-hour battery.", description: "Active noise cancelling, transparency mode, touch controls and up to 30 hours of listening with the charging case.", price: 7900, sale: 6900, featured: true, colors: ["earbuds-white", "earbuds-black"], stock: [11, 8], rating: [4.6, 52], sold: 198, specs: [["Battery", "Up to 30 hours with case"], ["Noise cancelling", "Active"], ["Bluetooth", "5.3"]], daysOld: 3 },
  { n: 33, name: "10000mAh Power Bank", slug: "10000mah-power-bank", category: "power-banks", short: "Slim power bank with USB-C fast charging.", description: "A slim 10000mAh power bank with 20W USB-C fast charging in and out. Charges most phones about twice.", price: 4500, colors: ["powerbank-black"], stock: [16], rating: [4.4, 24], sold: 93, specs: [["Capacity", "10000 mAh"], ["Output", "20W USB-C"]], daysOld: 17 },
];

export const COLOR_LABELS: Record<string, string> = {
  white: "White", black: "Black", sage: "Sage", grey: "Grey", sand: "Sand", terracotta: "Terracotta", indigo: "Indigo",
  beige: "Beige", cream: "Cream", natural: "Natural", tan: "Tan", ember: "Ember", gold: "Gold", brown: "Brown", camel: "Camel",
  silver: "Silver", navy: "Navy", olive: "Olive", clear: "Clear", rose: "Rose gold",
};

export const colorOf = (key: string) => COLOR_LABELS[key.split("-")[1]] ?? key;
export const productId = (n: number) => `00000000-0000-4000-8000-${hex(n)}`;
export const variantId = (n: number, i: number) => `00000000-0000-4000-9000-${hex(n * 100 + i)}`;

export type DemoVariant = { id: string; title: string; options: Record<string, string>; stock: number; position: number; image: string; color: string };

/** One variant per colour × size, with options keyed by "Color" and the product's size label. */
export function variantsOf(p: DemoProduct): DemoVariant[] {
  const out: DemoVariant[] = [];
  let i = 0;
  for (const c of p.colors) {
    for (const size of p.sizes ?? [null]) {
      const options: Record<string, string> = {};
      if (p.colors.length > 1) options.Color = colorOf(c);
      if (size) options[p.sizeLabel ?? "Size"] = size;
      out.push({
        id: variantId(p.n, i),
        title: Object.values(options).join(" / ") || "Default",
        options,
        stock: p.stock[i % p.stock.length],
        position: i,
        image: `${IMG}/${c}.webp`,
        color: c,
      });
      i++;
    }
  }
  return out;
}

export function optionNamesOf(p: DemoProduct): string[] {
  return [...(p.colors.length > 1 ? ["Color"] : []), ...(p.sizes ? [p.sizeLabel ?? "Size"] : [])];
}

/** The category and all of its descendants. */
export function categoryTree(slug: string): Set<string> {
  const out = new Set([slug]);
  let grew = true;
  while (grew) {
    grew = false;
    for (const c of CATEGORY_DEFS) {
      if (c.parent && out.has(c.parent) && !out.has(c.slug)) {
        out.add(c.slug);
        grew = true;
      }
    }
  }
  return out;
}
