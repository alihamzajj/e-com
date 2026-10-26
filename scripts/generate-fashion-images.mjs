// Generates demo fashion artwork (clothing, handbags, shoes, accessories) into
// public/demo/fashion/*.webp. Run: node scripts/generate-fashion-images.mjs
import sharp from "sharp";
import { mkdirSync } from "node:fs";
import path from "node:path";

const OUT = path.join(process.cwd(), "public", "demo", "fashion");
mkdirSync(OUT, { recursive: true });

export const COLORS = {
  white: "#F4F2EE",
  black: "#26262A",
  sage: "#9AA88E",
  grey: "#A6A9AD",
  sand: "#D9C7A7",
  terracotta: "#C0643F",
  indigo: "#3E5480",
  beige: "#D6C5AB",
  cream: "#EFE6D2",
  natural: "#E2D6BE",
  tan: "#B07A4F",
  ember: "#FF5A1F",
  gold: "#C9A45A",
  brown: "#6B4630",
  camel: "#B98B5A",
  silver: "#C9CCD1",
  navy: "#2F3B55",
  olive: "#6F7553",
  clear: "#DCE4EA",
  rose: "#D7A79A",
};

function shade(hex, amount) {
  const n = parseInt(hex.slice(1), 16);
  const f = (c) => Math.max(0, Math.min(255, Math.round(c + amount * 255)));
  const r = f(n >> 16), g = f((n >> 8) & 255), b = f(n & 255);
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, "0")}`;
}

const frame = (inner, w = 1200, h = 1200, bg = "#ECEBE7") => `
<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
  <defs>
    <radialGradient id="bg" cx="50%" cy="40%" r="75%"><stop offset="0%" stop-color="#F8F7F4"/><stop offset="100%" stop-color="${bg}"/></radialGradient>
    <linearGradient id="shade" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#fff" stop-opacity="0.18"/><stop offset="55%" stop-color="#fff" stop-opacity="0"/><stop offset="100%" stop-color="#000" stop-opacity="0.16"/>
    </linearGradient>
    <filter id="drop" x="-20%" y="-20%" width="140%" height="150%"><feDropShadow dx="0" dy="22" stdDeviation="24" flood-color="#000" flood-opacity="0.16"/></filter>
  </defs>
  <rect width="100%" height="100%" fill="url(#bg)"/>
  ${inner}
</svg>`;

/** Filled shape with shading overlay and a slightly darker outline. */
const piece = (d, color, extra = "") =>
  `<g filter="url(#drop)"><path d="${d}" fill="${color}" stroke="${shade(color, -0.12)}" stroke-width="3" stroke-linejoin="round" ${extra}/></g>
   <path d="${d}" fill="url(#shade)"/>`;
const line = (d, color, w = 4, extra = "") =>
  `<path d="${d}" fill="none" stroke="${color}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round" ${extra}/>`;

const ITEMS = {
  tee: (c) =>
    piece("M 430 330 L 525 300 Q 600 350 675 300 L 770 330 L 900 450 L 830 530 L 770 490 L 770 920 L 430 920 L 430 490 L 370 530 L 300 450 Z", c) +
    line("M 525 300 Q 600 370 675 300", shade(c, -0.18), 6) +
    line("M 430 490 L 430 470", shade(c, -0.1), 3),

  hoodie: (c) =>
    piece("M 430 350 L 770 350 L 860 430 L 930 820 L 855 840 L 780 540 L 780 930 L 420 930 L 420 540 L 345 840 L 270 820 L 340 430 Z", c) +
    piece("M 490 360 Q 600 200 710 360 Q 600 420 490 360 Z", shade(c, -0.08)) +
    piece("M 480 730 L 720 730 L 750 850 L 450 850 Z", shade(c, -0.05)) +
    line("M 570 390 L 565 520", shade(c, -0.3), 5) + line("M 630 390 L 635 520", shade(c, -0.3), 5) +
    `<rect x="420" y="905" width="360" height="25" fill="${shade(c, -0.08)}"/>`,

  jacket: (c) =>
    piece("M 430 330 L 770 330 L 865 420 L 935 860 L 860 875 L 785 540 L 785 930 L 415 930 L 415 540 L 340 875 L 265 860 L 335 420 Z", c) +
    piece("M 520 330 L 600 470 L 560 520 L 470 360 Z", shade(c, -0.1)) +
    piece("M 680 330 L 600 470 L 640 520 L 730 360 Z", shade(c, -0.1)) +
    line("M 600 470 L 600 930", shade(c, -0.25), 4) +
    [520, 600, 680, 760, 840].map((y) => `<circle cx="618" cy="${y}" r="9" fill="${shade(c, -0.35)}"/>`).join("") +
    `<rect x="460" y="560" width="100" height="80" rx="8" fill="none" stroke="${shade(c, -0.22)}" stroke-width="4" stroke-dasharray="8 6"/>
     <rect x="640" y="560" width="100" height="80" rx="8" fill="none" stroke="${shade(c, -0.22)}" stroke-width="4" stroke-dasharray="8 6"/>`,

  cardigan: (c) =>
    piece("M 440 330 L 760 330 L 850 420 L 915 860 L 845 875 L 775 540 L 775 930 L 425 930 L 425 540 L 355 875 L 285 860 L 350 420 Z", c) +
    piece("M 530 330 L 600 600 L 670 330 Z", "#EFEDE8") +
    line("M 600 600 L 600 930", shade(c, -0.22), 4) +
    [650, 730, 810].map((y) => `<circle cx="615" cy="${y}" r="10" fill="${shade(c, -0.4)}"/>`).join("") +
    Array.from({ length: 9 }, (_, i) => line(`M ${440 + i * 40} 900 L ${440 + i * 40} 930`, shade(c, -0.12), 3)).join(""),

  dress: (c) =>
    line("M 530 260 L 545 200", shade(c, -0.2), 8) + line("M 670 260 L 655 200", shade(c, -0.2), 8) +
    piece("M 515 260 Q 600 320 685 260 L 705 490 Q 600 525 495 490 Z", c) +
    piece("M 495 490 Q 600 525 705 490 L 880 960 Q 600 1015 320 960 Z", c) +
    line("M 495 490 Q 600 525 705 490", shade(c, -0.2), 6) +
    line("M 560 520 L 470 960", shade(c, -0.08), 3) + line("M 640 520 L 730 960", shade(c, -0.08), 3),

  trousers: (c) =>
    piece("M 440 260 L 760 260 L 805 960 L 645 960 L 600 470 L 555 960 L 395 960 Z", c) +
    `<rect x="440" y="260" width="320" height="42" fill="${shade(c, -0.1)}"/>` +
    line("M 600 302 L 600 470", shade(c, -0.25), 3) + line("M 500 320 Q 520 380 470 400", shade(c, -0.2), 3) +
    line("M 700 320 Q 680 380 730 400", shade(c, -0.2), 3),

  tote: (c) =>
    line("M 470 520 C 470 330, 610 330, 610 520", shade(c, -0.25), 22) +
    line("M 590 520 C 590 330, 730 330, 730 520", shade(c, -0.25), 22) +
    piece("M 370 520 L 830 520 L 870 930 L 330 930 Z", c) +
    `<rect x="520" y="660" width="160" height="110" rx="6" fill="${shade(c, -0.08)}"/>`,

  crossbody: (c) =>
    line("M 420 560 C 380 160, 820 160, 780 560", shade(c, -0.3), 14) +
    `<g filter="url(#drop)"><rect x="390" y="520" width="420" height="320" rx="46" fill="${c}"/></g>
     <rect x="390" y="520" width="420" height="320" rx="46" fill="url(#shade)"/>` +
    piece("M 390 570 Q 390 520 440 520 L 760 520 Q 810 520 810 570 L 810 660 Q 600 740 390 660 Z", shade(c, -0.08)) +
    `<circle cx="600" cy="690" r="18" fill="${COLORS.gold}"/><circle cx="600" cy="690" r="9" fill="${shade(COLORS.gold, -0.2)}"/>`,

  quilted: (c) =>
    Array.from({ length: 26 }, (_, i) => {
      const t = i / 25;
      const x = 380 + 440 * t;
      const y = 520 - Math.sin(Math.PI * t) * 360;
      return `<circle cx="${x}" cy="${y}" r="10" fill="none" stroke="${COLORS.gold}" stroke-width="5"/>`;
    }).join("") +
    `<defs><clipPath id="bagclip"><rect x="360" y="510" width="480" height="340" rx="34"/></clipPath></defs>
     <g filter="url(#drop)"><rect x="360" y="510" width="480" height="340" rx="34" fill="${c}"/></g>
     <g clip-path="url(#bagclip)" stroke="${shade(c, -0.14)}" stroke-width="3">
       ${Array.from({ length: 12 }, (_, i) => `<line x1="${200 + i * 70}" y1="510" x2="${540 + i * 70}" y2="850"/><line x1="${540 + i * 70 - 340}" y1="850" x2="${880 + i * 70 - 340}" y2="510"/>`).join("")}
     </g>
     <rect x="360" y="510" width="480" height="340" rx="34" fill="url(#shade)"/>
     <rect x="565" y="600" width="70" height="44" rx="8" fill="${COLORS.gold}"/>`,

  clutch: (c) =>
    `<g filter="url(#drop)"><rect x="330" y="500" width="540" height="290" rx="24" fill="${c}"/></g>
     <rect x="330" y="500" width="540" height="290" rx="24" fill="url(#shade)"/>` +
    piece("M 330 520 Q 330 500 354 500 L 846 500 Q 870 500 870 520 L 600 690 Z", shade(c, -0.1)) +
    `<circle cx="600" cy="680" r="16" fill="${COLORS.gold}"/>`,

  bucket: (c) =>
    line("M 470 470 C 470 270, 730 270, 730 470", shade(c, -0.3), 18) +
    piece("M 430 470 L 770 470 L 815 900 Q 600 950 385 900 Z", c) +
    `<ellipse cx="600" cy="470" rx="170" ry="34" fill="${shade(c, -0.25)}"/>` +
    line("M 450 510 Q 600 545 750 510", shade(c, -0.3), 6) +
    line("M 600 528 L 590 620", shade(c, -0.3), 5) + `<circle cx="588" cy="630" r="10" fill="${shade(c, -0.35)}"/>`,

  sneaker: (c) =>
    piece("M 270 770 Q 270 610 400 570 L 560 520 Q 640 610 770 650 L 890 690 Q 945 715 945 770 L 945 800 L 270 800 Z", c) +
    `<rect x="255" y="790" width="705" height="48" rx="22" fill="#F7F6F2" stroke="#D8D6D0" stroke-width="3"/>` +
    line("M 520 560 L 600 640", shade(c, -0.3), 5) + line("M 560 545 L 640 625", shade(c, -0.3), 5) +
    line("M 600 535 L 680 615", shade(c, -0.3), 5) +
    `<path d="M 340 700 Q 470 660 560 720" fill="none" stroke="${COLORS.ember}" stroke-width="10" stroke-linecap="round"/>`,

  loafer: (c) =>
    piece("M 260 780 Q 260 680 360 660 L 640 640 Q 760 640 860 690 Q 950 730 950 790 L 950 805 L 260 805 Z", c) +
    `<rect x="250" y="795" width="710" height="34" rx="12" fill="${shade(c, -0.3)}"/>` +
    piece("M 600 660 Q 700 640 790 680 Q 700 720 600 700 Z", shade(c, -0.12)) +
    `<rect x="650" y="668" width="90" height="16" rx="6" fill="${COLORS.gold}"/>`,

  scarf: (c) =>
    piece("M 380 260 Q 600 220 820 260 L 760 420 Q 600 380 440 420 Z", c) +
    piece("M 440 420 L 560 420 L 520 900 L 400 900 Z", shade(c, -0.05)) +
    piece("M 640 420 L 760 420 L 800 820 L 680 820 Z", shade(c, 0.03)) +
    Array.from({ length: 7 }, (_, i) => line(`M ${408 + i * 17} 900 L ${405 + i * 17} 950`, shade(c, -0.2), 4)).join("") +
    Array.from({ length: 7 }, (_, i) => line(`M ${688 + i * 17} 820 L ${690 + i * 17} 870`, shade(c, -0.2), 4)).join("") +
    Array.from({ length: 6 }, (_, i) => line(`M 400 ${300 + i * 22} L 800 ${300 + i * 22}`, shade(c, -0.08), 3, 'opacity="0.6"')).join(""),

  cap: (c) =>
    piece("M 330 700 Q 330 420 600 410 Q 870 420 870 700 Z", c) +
    piece("M 720 690 Q 900 690 990 760 Q 900 790 700 740 Z", shade(c, -0.1)) +
    line("M 600 410 L 600 700", shade(c, -0.2), 4) + line("M 470 440 Q 450 560 460 700", shade(c, -0.2), 3) +
    line("M 730 440 Q 750 560 740 700", shade(c, -0.2), 3) + `<circle cx="600" cy="414" r="14" fill="${shade(c, -0.25)}"/>`,

  belt: (c) =>
    piece("M 220 560 L 900 560 Q 960 560 960 600 Q 960 640 900 640 L 220 640 Z", c) +
    Array.from({ length: 5 }, (_, i) => `<circle cx="${720 + i * 40}" cy="600" r="7" fill="${shade(c, -0.35)}"/>`).join("") +
    `<rect x="250" y="530" width="140" height="140" rx="16" fill="none" stroke="${COLORS.gold}" stroke-width="16"/>
     <rect x="312" y="560" width="14" height="80" rx="6" fill="${COLORS.gold}"/>`,

  biker: (c) =>
    piece("M 430 330 L 770 330 L 865 420 L 935 860 L 860 875 L 785 560 L 785 900 L 415 900 L 415 560 L 340 875 L 265 860 L 335 420 Z", c) +
    piece("M 470 330 L 560 330 L 640 520 L 520 600 L 430 420 Z", shade(c, 0.06)) +
    piece("M 730 330 L 660 330 L 700 470 L 770 420 Z", shade(c, 0.06)) +
    line("M 560 330 L 640 520 L 700 900", COLORS.silver, 6) +
    `<rect x="415" y="850" width="370" height="50" fill="${shade(c, -0.1)}"/><rect x="560" y="855" width="54" height="40" rx="6" fill="none" stroke="${COLORS.silver}" stroke-width="6"/>` +
    line("M 460 700 L 540 680", COLORS.silver, 5) + line("M 690 640 L 760 620", COLORS.silver, 5) +
    [430, 790].map((x) => `<circle cx="${x}" cy="370" r="8" fill="${COLORS.silver}"/>`).join(""),

  bomber: (c) =>
    piece("M 440 330 L 760 330 L 860 430 L 920 820 L 850 840 L 780 560 L 780 880 L 420 880 L 420 560 L 350 840 L 280 820 L 340 430 Z", c) +
    `<rect x="420" y="850" width="360" height="48" rx="10" fill="${shade(c, -0.15)}"/>` +
    `<rect x="275" y="800" width="80" height="44" rx="10" fill="${shade(c, -0.15)}" transform="rotate(-8 315 822)"/>` +
    `<rect x="845" y="800" width="80" height="44" rx="10" fill="${shade(c, -0.15)}" transform="rotate(8 885 822)"/>` +
    piece("M 500 330 Q 600 380 700 330 L 700 300 Q 600 350 500 300 Z", shade(c, -0.15)) +
    line("M 600 360 L 600 850", COLORS.silver, 5) + line("M 470 600 L 530 520", shade(c, -0.25), 5) + line("M 730 600 L 670 520", shade(c, -0.25), 5),

  oxford: (c) =>
    piece("M 250 780 Q 250 690 350 670 L 600 640 Q 760 630 870 690 Q 955 735 955 790 L 955 805 L 250 805 Z", c) +
    `<rect x="240" y="795" width="725" height="30" rx="10" fill="${shade(c, -0.35)}"/><rect x="250" y="805" width="150" height="40" rx="8" fill="${shade(c, -0.35)}"/>` +
    piece("M 430 665 L 640 645 Q 600 700 460 712 Z", shade(c, -0.1)) +
    [0, 1, 2, 3].map((i) => line(`M ${470 + i * 40} ${700 - i * 12} L ${510 + i * 40} ${660 - i * 6}`, COLORS.white, 4)).join("") +
    line("M 760 700 Q 850 720 900 760", shade(c, -0.2), 3, 'stroke-dasharray="6 6"'),

  boot: (c) =>
    piece("M 330 800 L 330 420 Q 330 380 370 380 L 560 380 Q 600 380 600 420 L 600 610 Q 760 630 880 700 Q 950 740 950 790 L 950 805 L 330 805 Z", c) +
    piece("M 410 390 L 520 390 L 520 600 Q 465 640 410 600 Z", shade(c, -0.3)) +
    `<rect x="320" y="795" width="645" height="40" rx="12" fill="${shade(c, -0.4)}"/>` +
    `<rect x="560" y="360" width="34" height="70" rx="8" fill="${shade(c, -0.2)}"/>`,

  wallet: (c) =>
    `<g filter="url(#drop)"><rect x="330" y="430" width="540" height="380" rx="34" fill="${c}"/></g><rect x="330" y="430" width="540" height="380" rx="34" fill="url(#shade)"/>` +
    `<rect x="352" y="452" width="496" height="336" rx="24" fill="none" stroke="${shade(c, 0.12)}" stroke-width="4" stroke-dasharray="10 8"/>` +
    piece("M 330 470 Q 330 430 370 430 L 830 430 Q 870 430 870 470 L 870 560 L 330 560 Z", shade(c, -0.08)) +
    `<rect x="560" y="540" width="80" height="40" rx="10" fill="${COLORS.gold}"/>`,

  cardholder: (c) =>
    `<rect x="440" y="380" width="320" height="60" rx="10" fill="${COLORS.white}" stroke="#D8D6D0" stroke-width="3"/>` +
    `<g filter="url(#drop)"><rect x="390" y="420" width="420" height="300" rx="26" fill="${c}"/></g><rect x="390" y="420" width="420" height="300" rx="26" fill="url(#shade)"/>` +
    [0, 1, 2].map((i) => `<path d="M 390 ${500 + i * 60} Q 600 ${540 + i * 60} 810 ${500 + i * 60}" fill="none" stroke="${shade(c, -0.22)}" stroke-width="5"/>`).join("") +
    `<rect x="412" y="442" width="376" height="256" rx="18" fill="none" stroke="${shade(c, 0.12)}" stroke-width="4" stroke-dasharray="10 8"/>`,

  watch: (c) =>
    piece("M 540 180 L 660 180 L 670 470 L 530 470 Z", c) + piece("M 530 730 L 670 730 L 660 1000 L 540 1000 Z", c) +
    [260, 330, 400, 820, 890].map((y) => `<circle cx="600" cy="${y}" r="7" fill="${shade(c, -0.3)}"/>`).join("") +
    `<g filter="url(#drop)"><circle cx="600" cy="600" r="175" fill="${COLORS.silver}"/></g>` +
    `<rect x="772" y="580" width="34" height="40" rx="8" fill="${shade(COLORS.silver, -0.15)}"/>` +
    `<circle cx="600" cy="600" r="148" fill="#1F2430"/><circle cx="600" cy="600" r="148" fill="url(#shade)"/>` +
    Array.from({ length: 12 }, (_, i) => {
      const a = (i * Math.PI) / 6;
      return line(`M ${600 + Math.sin(a) * 126} ${600 - Math.cos(a) * 126} L ${600 + Math.sin(a) * 110} ${600 - Math.cos(a) * 110}`, "#E8E6E1", i % 3 ? 4 : 8);
    }).join("") +
    `<circle cx="560" cy="640" r="30" fill="none" stroke="#5A6070" stroke-width="3"/><circle cx="640" cy="600" r="30" fill="none" stroke="#5A6070" stroke-width="3"/>` +
    line("M 600 600 L 600 500", COLORS.white, 8) + line("M 600 600 L 680 640", COLORS.white, 6) + line("M 600 620 L 600 470", COLORS.ember, 3) +
    `<circle cx="600" cy="600" r="12" fill="${COLORS.ember}"/>`,

  watchgold: (c) =>
    piece("M 555 200 L 645 200 L 652 480 L 548 480 Z", c) + piece("M 548 720 L 652 720 L 645 990 L 555 990 Z", c) +
    Array.from({ length: 14 }, (_, i) => line(`M 556 ${215 + i * 19} L 644 ${215 + i * 19}`, shade(c, -0.12), 2)).join("") +
    Array.from({ length: 14 }, (_, i) => line(`M 556 ${735 + i * 18} L 644 ${735 + i * 18}`, shade(c, -0.12), 2)).join("") +
    `<g filter="url(#drop)"><circle cx="600" cy="600" r="140" fill="${COLORS.gold}"/></g>` +
    `<circle cx="600" cy="600" r="118" fill="#F6EFE6"/><circle cx="600" cy="600" r="118" fill="url(#shade)"/>` +
    [0, 3, 6, 9].map((i) => {
      const a = (i * Math.PI) / 6;
      return `<circle cx="${600 + Math.sin(a) * 96}" cy="${600 - Math.cos(a) * 96}" r="6" fill="${COLORS.gold}"/>`;
    }).join("") +
    line("M 600 600 L 600 520", "#3A3A3C", 6) + line("M 600 600 L 660 620", "#3A3A3C", 5) + `<circle cx="600" cy="600" r="9" fill="${COLORS.gold}"/>`,

  smartwatch: (c) =>
    piece("M 530 170 L 670 170 L 680 440 L 520 440 Z", c) + piece("M 520 760 L 680 760 L 670 1010 L 530 1010 Z", c) +
    `<g filter="url(#drop)"><rect x="440" y="410" width="320" height="380" rx="80" fill="#2B2E35"/></g>` +
    `<rect x="764" y="520" width="26" height="70" rx="10" fill="${shade(c, -0.2)}"/>` +
    `<rect x="466" y="436" width="268" height="328" rx="62" fill="#0E1015"/>` +
    `<text x="600" y="610" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-weight="700" font-size="76" fill="${COLORS.white}">10:09</text>` +
    `<path d="M 520 680 A 80 80 0 0 1 680 680" fill="none" stroke="${COLORS.ember}" stroke-width="12" stroke-linecap="round"/>` +
    `<rect x="440" y="410" width="320" height="380" rx="80" fill="url(#shade)"/>`,

  phonecase: (c) =>
    `<g filter="url(#drop)"><rect x="420" y="220" width="360" height="740" rx="64" fill="${c}"/></g><rect x="420" y="220" width="360" height="740" rx="64" fill="url(#shade)"/>` +
    `<rect x="458" y="258" width="150" height="170" rx="40" fill="${shade(c, -0.18)}"/>` +
    [[500, 300], [566, 300], [500, 380]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="24" fill="#1F2430" stroke="${shade(c, -0.3)}" stroke-width="5"/>`).join("") +
    `<circle cx="566" cy="380" r="9" fill="${COLORS.white}"/>` +
    `<rect x="444" y="244" width="312" height="692" rx="48" fill="none" stroke="${shade(c, 0.12)}" stroke-width="4" stroke-dasharray="10 8"/>` +
    `<circle cx="600" cy="640" r="34" fill="none" stroke="${shade(c, -0.2)}" stroke-width="5"/>`,

  clearcase: (c) =>
    `<g filter="url(#drop)"><rect x="420" y="220" width="360" height="740" rx="64" fill="${c}" fill-opacity="0.55" stroke="#B8C3CB" stroke-width="6"/></g>` +
    `<rect x="440" y="240" width="320" height="700" rx="50" fill="#26262A" opacity="0.12"/>` +
    `<rect x="458" y="258" width="150" height="170" rx="40" fill="#3A3D45"/>` +
    [[500, 300], [566, 300], [500, 380]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="24" fill="#14161B" stroke="#6A707C" stroke-width="5"/>`).join("") +
    [[420, 300], [780, 300], [420, 880], [780, 880]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="20" fill="${c}" stroke="#B8C3CB" stroke-width="5"/>`).join("") +
    line("M 520 520 L 700 380", "#FFFFFF", 10, 'opacity="0.6"') + line("M 540 600 L 720 460", "#FFFFFF", 5, 'opacity="0.5"'),

  charger: (c) =>
    `<g filter="url(#drop)"><rect x="300" y="420" width="290" height="290" rx="54" fill="${c}"/></g><rect x="300" y="420" width="290" height="290" rx="54" fill="url(#shade)"/>` +
    `<rect x="345" y="360" width="34" height="70" rx="8" fill="${COLORS.silver}"/><rect x="510" y="360" width="34" height="70" rx="8" fill="${COLORS.silver}"/>` +
    `<rect x="410" y="560" width="70" height="26" rx="10" fill="${shade(c, -0.3)}"/>` +
    line("M 680 700 C 680 520, 900 520, 900 640 C 900 760, 700 760, 700 860 C 700 930, 820 940, 860 900", shade(c, -0.06), 18) +
    `<rect x="640" y="660" width="80" height="120" rx="20" fill="${c}" stroke="${shade(c, -0.12)}" stroke-width="3"/><rect x="662" y="620" width="36" height="50" rx="6" fill="${COLORS.silver}"/>` +
    `<rect x="830" y="860" width="80" height="110" rx="20" fill="${c}" stroke="${shade(c, -0.12)}" stroke-width="3" transform="rotate(-40 870 915)"/>`,

  earbuds: (c) =>
    `<g filter="url(#drop)"><rect x="380" y="560" width="440" height="300" rx="140" fill="${c}"/></g><rect x="380" y="560" width="440" height="300" rx="140" fill="url(#shade)"/>` +
    line("M 400 650 L 800 650", shade(c, -0.15), 4) + `<circle cx="600" cy="760" r="10" fill="${COLORS.ember}"/>` +
    [470, 730]
      .map(
        (x, i) =>
          `<g transform="rotate(${i ? 18 : -18} ${x} 420)"><ellipse cx="${x}" cy="400" rx="72" ry="80" fill="${c}" stroke="${shade(c, -0.15)}" stroke-width="3"/><ellipse cx="${x}" cy="400" rx="72" ry="80" fill="url(#shade)"/><rect x="${x - 22}" y="440" width="44" height="130" rx="22" fill="${c}" stroke="${shade(c, -0.15)}" stroke-width="3"/><circle cx="${x - 14}" cy="380" r="22" fill="${shade(c, -0.25)}"/></g>`,
      )
      .join(""),

  powerbank: (c) =>
    `<rect x="540" y="230" width="120" height="40" rx="10" fill="${shade(c, -0.25)}"/>` +
    `<g filter="url(#drop)"><rect x="380" y="260" width="440" height="680" rx="60" fill="${c}"/></g><rect x="380" y="260" width="440" height="680" rx="60" fill="url(#shade)"/>` +
    [0, 1, 2, 3].map((i) => `<circle cx="${540 + i * 40}" cy="840" r="10" fill="${i < 3 ? COLORS.ember : shade(c, 0.2)}"/>`).join("") +
    `<text x="600" y="610" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-weight="700" font-size="58" fill="${shade(c, 0.35)}">10000</text>` +
    `<text x="600" y="660" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="32" letter-spacing="6" fill="${shade(c, 0.3)}">mAh</text>`,
};

const floor = `<ellipse cx="600" cy="1010" rx="330" ry="26" fill="#000" opacity="0.05"/>`;

export const PRODUCT_IMAGES = {
  "tee-white": ["tee", "white"], "tee-black": ["tee", "black"], "tee-sage": ["tee", "sage"],
  "hoodie-grey": ["hoodie", "grey"], "hoodie-black": ["hoodie", "black"],
  "dress-sand": ["dress", "sand"], "dress-terracotta": ["dress", "terracotta"],
  "jacket-indigo": ["jacket", "indigo"],
  "trousers-black": ["trousers", "black"], "trousers-beige": ["trousers", "beige"],
  "cardigan-cream": ["cardigan", "cream"],
  "tote-natural": ["tote", "natural"], "tote-black": ["tote", "black"],
  "crossbody-tan": ["crossbody", "tan"], "crossbody-black": ["crossbody", "black"], "crossbody-ember": ["crossbody", "ember"],
  "quilted-black": ["quilted", "black"], "quilted-cream": ["quilted", "cream"],
  "clutch-gold": ["clutch", "gold"], "clutch-black": ["clutch", "black"],
  "bucket-ember": ["bucket", "ember"],
  "sneaker-white": ["sneaker", "white"], "sneaker-black": ["sneaker", "black"],
  "loafer-brown": ["loafer", "brown"],
  "scarf-camel": ["scarf", "camel"], "scarf-grey": ["scarf", "grey"],
  "cap-black": ["cap", "black"], "cap-ember": ["cap", "ember"],
  "belt-brown": ["belt", "brown"], "belt-black": ["belt", "black"], "belt-tan": ["belt", "tan"],
  "biker-black": ["biker", "black"], "biker-brown": ["biker", "brown"],
  "bomber-olive": ["bomber", "olive"], "bomber-black": ["bomber", "black"],
  "suede-tan": ["jacket", "tan"],
  "oxford-black": ["oxford", "black"], "oxford-brown": ["oxford", "brown"],
  "boot-brown": ["boot", "brown"], "boot-black": ["boot", "black"],
  "wallet-brown": ["wallet", "brown"], "wallet-black": ["wallet", "black"],
  "cardholder-tan": ["cardholder", "tan"], "cardholder-navy": ["cardholder", "navy"],
  "watch-black": ["watch", "black"], "watch-brown": ["watch", "brown"],
  "watchgold-gold": ["watchgold", "gold"], "watchgold-rose": ["watchgold", "rose"],
  "smartwatch-black": ["smartwatch", "black"], "smartwatch-silver": ["smartwatch", "silver"],
  "phonecase-brown": ["phonecase", "brown"], "phonecase-black": ["phonecase", "black"],
  "clearcase-clear": ["clearcase", "clear"],
  "charger-white": ["charger", "white"],
  "earbuds-white": ["earbuds", "white"], "earbuds-black": ["earbuds", "black"],
  "powerbank-black": ["powerbank", "black"],
};

const images = Object.fromEntries(
  Object.entries(PRODUCT_IMAGES).map(([name, [item, color]]) => [name, frame(floor + ITEMS[item](COLORS[color]))]),
);

// Category, hero and promo compositions.
const group = (item, color, x, y, s) => `<g transform="translate(${x} ${y}) scale(${s})">${ITEMS[item](COLORS[color])}</g>`;
images["category-clothing"] = frame(group("dress", "terracotta", -120, -60, 1) + group("tee", "sage", 380, 80, 0.75), 1200, 900);
images["category-handbags"] = frame(group("crossbody", "tan", -150, -150, 1) + group("tote", "black", 430, -40, 0.7), 1200, 900);
images["category-shoes"] = frame(group("sneaker", "white", -40, -250, 1) + group("loafer", "brown", 100, 30, 0.8), 1200, 900);
images["category-accessories"] = frame(group("cap", "ember", -80, -220, 0.9) + group("belt", "brown", 200, 150, 0.7), 1200, 900);
images["category-leather-goods"] = frame(group("wallet", "brown", -130, -150, 0.95) + group("belt", "black", 230, 170, 0.7), 1200, 900);
images["category-watches"] = frame(group("watch", "brown", -170, -150, 0.85) + group("watchgold", "gold", 360, -40, 0.7), 1200, 900);
images["category-mobile-accessories"] = frame(group("phonecase", "brown", -170, -160, 0.85) + group("earbuds", "white", 380, 30, 0.6), 1200, 900);
images["category-leather-jackets"] = frame(group("biker", "black", -140, -150, 0.95) + group("bomber", "olive", 400, 40, 0.65), 1200, 900);
images["hero"] = frame(
  group("dress", "sand", 180, 40, 0.95) + group("crossbody", "ember", 620, 260, 0.75) + group("tote", "black", 1050, 210, 0.7) +
    group("sneaker", "white", 1180, 560, 0.55),
  1800, 1100,
);
images["promo"] = frame(group("quilted", "black", 650, 0, 0.9) + group("clutch", "gold", 1050, 230, 0.6), 1800, 900, "#E4E2DD");

for (const [name, svg] of Object.entries(images)) {
  await sharp(Buffer.from(svg)).webp({ quality: 86 }).toFile(path.join(OUT, `${name}.webp`));
}
console.log(`wrote ${Object.keys(images).length} images to public/demo/fashion`);

// Transparent, tightly-trimmed cut-outs for the homepage hero product row.
const cutout = (inner) => `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="1200" viewBox="0 0 1200 1200">
  <defs>
    <linearGradient id="shade" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#fff" stop-opacity="0.18"/><stop offset="55%" stop-color="#fff" stop-opacity="0"/><stop offset="100%" stop-color="#000" stop-opacity="0.16"/>
    </linearGradient>
    <filter id="drop" x="-20%" y="-20%" width="140%" height="150%"><feDropShadow dx="0" dy="18" stdDeviation="18" flood-color="#000" flood-opacity="0.14"/></filter>
  </defs>${inner}</svg>`;
for (const [name, item, color] of [
  ["cutout-dress-sand", "dress", "sand"],
  ["cutout-crossbody-ember", "crossbody", "ember"],
  ["cutout-tote-black", "tote", "black"],
  ["cutout-sneaker-white", "sneaker", "white"],
  ["cutout-biker-black", "biker", "black"],
  ["cutout-watch-brown", "watch", "brown"],
  ["cutout-phonecase-brown", "phonecase", "brown"],
]) {
  await sharp(Buffer.from(cutout(ITEMS[item](COLORS[color])))).trim({ threshold: 1 }).webp({ quality: 90, alphaQuality: 100 }).toFile(path.join(OUT, `${name}.webp`));
}
console.log("wrote hero cut-outs");
