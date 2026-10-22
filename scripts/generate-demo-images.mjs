// Generates the demo catalog artwork used by supabase/seed.sql (public/demo/*.webp).
// Run: node scripts/generate-demo-images.mjs
import sharp from "sharp";
import { mkdirSync } from "node:fs";
import path from "node:path";

const OUT = path.join(process.cwd(), "public", "demo");
mkdirSync(OUT, { recursive: true });

const C = {
  bg: "#ECECEA",
  ember: "#FF5A1F",
  emberDark: "#D9440F",
  chalk: { case: "#F3F3F1", caseEdge: "#D6D6D2", key: "#FBFBFA", keyEdge: "#DCDCD8", legend: "#9A9A96" },
  graphite: { case: "#2E2F31", caseEdge: "#1C1D1F", key: "#3A3B3E", keyEdge: "#26272A", legend: "#8C8D90" },
  fog: { case: "#DADDE0", caseEdge: "#B9BDC1", key: "#E9EBED", keyEdge: "#C6CACE", legend: "#8E949A" },
};

const frame = (w, h, inner, bg = C.bg) => `
<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
  <defs>
    <radialGradient id="bgGlow" cx="50%" cy="42%" r="70%">
      <stop offset="0%" stop-color="#F7F7F6"/><stop offset="100%" stop-color="${bg}"/>
    </radialGradient>
    <filter id="shadow" x="-20%" y="-20%" width="140%" height="160%">
      <feDropShadow dx="0" dy="18" stdDeviation="22" flood-color="#000" flood-opacity="0.16"/>
    </filter>
    <filter id="soft" x="-10%" y="-10%" width="120%" height="140%">
      <feDropShadow dx="0" dy="3" stdDeviation="2.5" flood-color="#000" flood-opacity="0.18"/>
    </filter>
  </defs>
  <rect width="100%" height="100%" fill="url(#bgGlow)"/>
  ${inner}
</svg>`;

const LAYOUTS = {
  "75": {
    rows: [
      Array(16).fill(1),
      [...Array(13).fill(1), 2, 1],
      [1.5, ...Array(12).fill(1), 1.5, 1],
      [1.75, ...Array(11).fill(1), 2.25, 1],
      [2.25, ...Array(10).fill(1), 1.75, 1, 1],
      [1.25, 1.25, 1.25, 6.25, 1, 1, 1, 1, 1, 1],
    ],
    accent: [[0, 0], [3, 12], [4, 12], [5, 7], [5, 8], [5, 9]],
  },
  "65": {
    rows: [
      [...Array(13).fill(1), 2, 1],
      [1.5, ...Array(12).fill(1), 1.5, 1],
      [1.75, ...Array(11).fill(1), 2.25, 1],
      [2.25, ...Array(10).fill(1), 1.75, 1, 1],
      [1.25, 1.25, 1.25, 6.25, 1, 1, 1, 1, 1, 1],
    ],
    accent: [[0, 0], [2, 12], [3, 12], [4, 7], [4, 8], [4, 9]],
  },
  "60": {
    rows: [
      [...Array(13).fill(1), 2],
      [1.5, ...Array(12).fill(1), 1.5],
      [1.75, ...Array(11).fill(1), 2.25],
      [2.25, ...Array(10).fill(1), 2.75],
      [1.25, 1.25, 1.25, 6.25, 1.25, 1.25, 1.25, 1.25],
    ],
    accent: [[0, 0], [2, 12], [4, 3]],
  },
  tkl: {
    rows: [
      [1, 0.5, 1, 1, 1, 1, 0.5, 1, 1, 1, 1, 0.5, 1, 1, 1, 1, 0.25, 1, 1, 1],
      [...Array(13).fill(1), 2, 0.25, 1, 1, 1],
      [1.5, ...Array(12).fill(1), 1.5, 0.25, 1, 1, 1],
      [1.75, ...Array(11).fill(1), 2.25],
      [2.25, ...Array(10).fill(1), 2.75, 0.25 + 1, 1],
      [1.25, 1.25, 1.25, 6.25, 1.25, 1.25, 1.25, 1.25, 0.25, 1, 1, 1],
    ],
    gaps: new Set(["0,1", "0,6", "0,11", "0,16", "1,14", "2,14", "4,12", "5,8"]),
    accent: [[0, 0], [3, 12], [4, 13], [5, 9], [5, 10], [5, 11]],
  },
};

function keyboard({ layout = "75", palette = C.chalk, x, y, width, knob = true, screen = false, accent = C.ember }) {
  const L = LAYOUTS[layout];
  const units = Math.max(...L.rows.map((r) => r.reduce((a, b) => a + b, 0)));
  const extra = knob ? 1.35 : 0;
  const pad = 0.42;
  const u = width / (units + extra + pad * 2);
  const gap = u * 0.09;
  const h = u * (L.rows.length + pad * 2);
  const accentSet = new Set(L.accent.map(([r, c]) => `${r},${c}`));
  let keys = "";
  L.rows.forEach((row, ri) => {
    let cx = x + u * pad;
    row.forEach((w, ci) => {
      const isGap = L.gaps?.has(`${ri},${ci}`) || w < 0.6;
      if (!isGap) {
        const kx = cx + gap / 2, ky = y + u * pad + ri * u + gap / 2;
        const kw = w * u - gap, kh = u - gap;
        const acc = accentSet.has(`${ri},${ci}`);
        const top = acc ? accent : palette.key;
        const edge = acc ? C.emberDark : palette.keyEdge;
        keys += `<g filter="url(#soft)">
          <rect x="${kx}" y="${ky}" width="${kw}" height="${kh}" rx="${u * 0.14}" fill="${edge}"/>
          <rect x="${kx + u * 0.06}" y="${ky + u * 0.04}" width="${kw - u * 0.12}" height="${kh - u * 0.16}" rx="${u * 0.11}" fill="${top}"/>
        </g>`;
        if (!acc && w <= 1.5) {
          keys += `<rect x="${kx + u * 0.2}" y="${ky + u * 0.22}" width="${u * 0.18}" height="${u * 0.05}" rx="${u * 0.02}" fill="${palette.legend}" opacity="0.7"/>`;
        }
      }
      cx += w * u;
    });
  });
  let extras = "";
  const ex = x + u * (pad + units) + u * 0.25;
  if (knob) {
    extras += `<circle cx="${ex + u * 0.5}" cy="${y + u * (pad + 0.55)}" r="${u * 0.42}" fill="#1E1F21" filter="url(#soft)"/>
      <circle cx="${ex + u * 0.5}" cy="${y + u * (pad + 0.55)}" r="${u * 0.3}" fill="#2C2D30"/>
      <circle cx="${ex + u * 0.5}" cy="${y + u * (pad + 1.5)}" r="${u * 0.42}" fill="#1E1F21" filter="url(#soft)"/>
      <circle cx="${ex + u * 0.5}" cy="${y + u * (pad + 1.5)}" r="${u * 0.3}" fill="#2C2D30"/>`;
    if (screen) {
      extras += `<rect x="${ex + u * 0.08}" y="${y + u * (pad + 2.15)}" width="${u * 0.84}" height="${u * 1.9}" rx="${u * 0.16}" fill="#151515"/>
        <rect x="${ex + u * 0.16}" y="${y + u * (pad + 2.25)}" width="${u * 0.68}" height="${u * 1.7}" rx="${u * 0.1}" fill="url(#screenGrad)"/>
        <text x="${ex + u * 0.5}" y="${y + u * (pad + 2.75)}" font-family="Arial" font-weight="700" font-size="${u * 0.24}" fill="#fff" text-anchor="middle">9:00</text>`;
    }
  }
  return `
  <defs><linearGradient id="screenGrad" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0%" stop-color="#2A2A2A"/><stop offset="55%" stop-color="#C9783F"/><stop offset="100%" stop-color="${C.ember}"/>
  </linearGradient></defs>
  <g filter="url(#shadow)">
    <rect x="${x}" y="${y + u * 0.12}" width="${u * (units + extra + pad * 2)}" height="${h}" rx="${u * 0.32}" fill="${palette.caseEdge}"/>
    <rect x="${x}" y="${y}" width="${u * (units + extra + pad * 2)}" height="${h}" rx="${u * 0.32}" fill="${palette.case}"/>
  </g>
  ${keys}${extras}`;
}

function cable(d, color = C.ember, width = 12) {
  return `<path d="${d}" fill="none" stroke="${color}" stroke-width="${width}" stroke-linecap="round" stroke-linejoin="round" filter="url(#soft)"/>
  <path d="${d}" fill="none" stroke="#fff" stroke-opacity="0.25" stroke-width="${width * 0.25}" stroke-linecap="round" transform="translate(-2,-2)"/>`;
}

function coil(x, y, turns, r, step, color) {
  let d = `M ${x} ${y}`;
  for (let i = 0; i < turns; i++) {
    const cx = x + i * step;
    d += ` C ${cx + step * 0.2} ${y - r}, ${cx + step * 0.9} ${y - r}, ${cx + step} ${y}`;
    d += ` C ${cx + step * 0.9} ${y + r * 0.6}, ${cx + step * 0.3} ${y + r * 0.6}, ${cx + step * 0.6} ${y}`;
  }
  return cable(d, color, 14);
}

function keycap(x, y, s, top, edge, legend) {
  return `<g filter="url(#soft)">
    <rect x="${x}" y="${y}" width="${s}" height="${s}" rx="${s * 0.16}" fill="${edge}"/>
    <rect x="${x + s * 0.08}" y="${y + s * 0.05}" width="${s * 0.84}" height="${s * 0.8}" rx="${s * 0.13}" fill="${top}"/>
    ${legend ? `<text x="${x + s * 0.22}" y="${y + s * 0.38}" font-family="Arial" font-weight="700" font-size="${s * 0.2}" fill="${legend}">${legend === "#fff" ? "" : ""}</text>` : ""}
  </g>`;
}

function keycapSet(palette, accent) {
  let out = "";
  const s = 150, g = 26, cols = 5, rows = 4;
  const ox = (1200 - (cols * s + (cols - 1) * g)) / 2, oy = 250;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const acc = (r === 0 && c === 0) || (r === 3 && c >= 3);
      out += keycap(ox + c * (s + g), oy + r * (s + g), s, acc ? accent : palette.key, acc ? C.emberDark : palette.keyEdge);
      if (!acc) out += `<rect x="${ox + c * (s + g) + 34}" y="${oy + r * (s + g) + 36}" width="26" height="8" rx="3" fill="${palette.legend}" opacity="0.7"/>`;
    }
  }
  return out;
}

function switches(stem, housingTop = "#F2F2F0", housingBottom = "#2B2C2E") {
  let out = "";
  const pos = [[300, 330], [600, 300], [900, 330], [430, 640], [770, 640]];
  for (const [cx, cy] of pos) {
    out += `<g filter="url(#shadow)">
      <rect x="${cx - 120}" y="${cy - 120}" width="240" height="240" rx="26" fill="${housingBottom}"/>
      <rect x="${cx - 104}" y="${cy - 112}" width="208" height="208" rx="22" fill="${housingTop}" opacity="0.92"/>
    </g>
    <rect x="${cx - 36}" y="${cy - 52}" width="72" height="72" rx="10" fill="${stem}"/>
    <rect x="${cx - 8}" y="${cy - 44}" width="16" height="56" rx="4" fill="#00000030"/>
    <rect x="${cx - 28}" y="${cy - 24}" width="56" height="16" rx="4" fill="#00000030"/>`;
  }
  return out;
}

const images = {
  "hero-keyboard": frame(1800, 1100, `
    ${cable("M 1800 300 C 1580 310, 1420 330, 1400 420 C 1380 520, 1520 560, 1560 470 C 1590 400, 1480 360, 1430 420 C 1390 470, 1380 520, 1385 560", C.ember, 14)}
    ${keyboard({ layout: "75", palette: C.chalk, x: 230, y: 520, width: 1340, screen: true })}
  `),
  "arc75-chalk": frame(1200, 1200, `${cable("M 1200 280 C 1080 290, 1000 320, 990 400 C 980 470, 1000 470, 1000 470", C.ember, 11)}${keyboard({ layout: "75", palette: C.chalk, x: 110, y: 470, width: 980, screen: true })}`),
  "arc75-graphite": frame(1200, 1200, `${cable("M 1200 280 C 1080 290, 1000 320, 990 400 C 980 470, 1000 470, 1000 470", "#2E2F31", 11)}${keyboard({ layout: "75", palette: C.graphite, x: 110, y: 470, width: 980, screen: true })}`),
  "arc75-detail": frame(1200, 1200, `${keyboard({ layout: "75", palette: C.chalk, x: -380, y: 300, width: 2100, screen: true })}`),
  "arc65-chalk": frame(1200, 1200, keyboard({ layout: "65", palette: C.chalk, x: 130, y: 470, width: 940, knob: true })),
  "arc65-graphite": frame(1200, 1200, keyboard({ layout: "65", palette: C.graphite, x: 130, y: 470, width: 940, knob: true })),
  "slate-tkl": frame(1200, 1200, keyboard({ layout: "tkl", palette: C.graphite, x: 80, y: 450, width: 1040, knob: false })),
  "slate-tkl-fog": frame(1200, 1200, keyboard({ layout: "tkl", palette: C.fog, x: 80, y: 450, width: 1040, knob: false })),
  "mono60": frame(1200, 1200, keyboard({ layout: "60", palette: C.fog, x: 170, y: 480, width: 860, knob: false })),
  "keycaps-ember": frame(1200, 1200, keycapSet(C.chalk, C.ember)),
  "keycaps-fog": frame(1200, 1200, keycapSet(C.fog, "#8E949A")),
  "switch-linear": frame(1200, 1200, switches("#FF5A1F")),
  "switch-tactile": frame(1200, 1200, switches("#7A5A3A", "#E9E4DC")),
  "cable-ember": frame(1200, 1200, `${coil(250, 620, 9, 120, 72, C.ember)}${cable("M 250 620 C 180 620, 160 760, 120 900", C.ember, 14)}${cable("M 900 620 C 1000 620, 1040 480, 1100 330", C.ember, 14)}`),
  "cable-graphite": frame(1200, 1200, `${coil(250, 620, 9, 120, 72, "#2E2F31")}${cable("M 250 620 C 180 620, 160 760, 120 900", "#2E2F31", 14)}${cable("M 900 620 C 1000 620, 1040 480, 1100 330", "#2E2F31", 14)}`),
  "deskmat": frame(1200, 1200, `
    <g filter="url(#shadow)"><rect x="90" y="330" width="1020" height="540" rx="36" fill="#2E2F31"/></g>
    <rect x="108" y="348" width="984" height="504" rx="26" fill="none" stroke="#45464A" stroke-width="4" stroke-dasharray="10 9"/>
    <rect x="160" y="770" width="70" height="10" rx="5" fill="${C.ember}"/>`),
  "wrist-rest": frame(1200, 1200, `
    <defs><linearGradient id="wood" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#7B4A2A"/><stop offset="50%" stop-color="#8E5A35"/><stop offset="100%" stop-color="#6E4024"/></linearGradient></defs>
    <g filter="url(#shadow)"><rect x="110" y="520" width="980" height="200" rx="60" fill="url(#wood)"/></g>
    ${Array.from({ length: 9 }, (_, i) => `<path d="M ${140 + i * 10} ${560 + i * 16} C 400 ${540 + i * 18}, 700 ${590 + i * 14}, ${1060 - i * 8} ${560 + i * 17}" stroke="#5B341C" stroke-opacity="0.35" stroke-width="3" fill="none"/>`).join("")}`),
  "tool-kit": frame(1200, 1200, `
    <g filter="url(#shadow)">
      <path d="M 420 300 L 420 820 Q 420 880 470 880 L 520 880" stroke="#9A9B9E" stroke-width="26" fill="none" stroke-linecap="round"/>
      <path d="M 560 300 L 560 820 Q 560 880 510 880" stroke="#9A9B9E" stroke-width="26" fill="none" stroke-linecap="round"/>
      <rect x="440" y="560" width="100" height="160" rx="22" fill="${C.ember}"/>
      <rect x="700" y="360" width="90" height="480" rx="30" fill="#2E2F31"/>
      <rect x="725" y="300" width="40" height="90" rx="10" fill="#C8C9CC"/>
    </g>`),
  "artisan-ember": frame(1200, 1200, `
    <defs><radialGradient id="glow" cx="50%" cy="50%" r="50%"><stop offset="0%" stop-color="#FFB089"/><stop offset="100%" stop-color="${C.ember}"/></radialGradient></defs>
    <g filter="url(#shadow)">
      <rect x="380" y="380" width="440" height="440" rx="70" fill="${C.emberDark}"/>
      <rect x="415" y="400" width="370" height="350" rx="58" fill="url(#glow)"/>
    </g>
    <text x="600" y="610" font-family="Arial" font-weight="700" font-size="72" fill="#fff" text-anchor="middle">esc</text>`),
  "category-keyboards": frame(1200, 900, keyboard({ layout: "65", palette: C.chalk, x: 120, y: 330, width: 960 })),
  "category-keycaps": frame(1200, 900, `<g transform="translate(0,-120)">${keycapSet(C.chalk, C.ember)}</g>`),
  "category-switches": frame(1200, 900, `<g transform="translate(0,-60)">${switches("#FF5A1F")}</g>`),
  "category-accessories": frame(1200, 900, `${coil(250, 470, 9, 120, 72, C.ember)}`),
  "promo-banner": frame(1800, 900, keyboard({ layout: "75", palette: C.graphite, x: 700, y: 300, width: 1300, screen: true }), "#E4E4E1"),
};

for (const [name, svg] of Object.entries(images)) {
  const file = path.join(OUT, `${name}.webp`);
  await sharp(Buffer.from(svg)).webp({ quality: 86 }).toFile(file);
  console.log("wrote", path.relative(process.cwd(), file));
}
