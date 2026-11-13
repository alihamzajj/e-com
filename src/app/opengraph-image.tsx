import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";

// Default preview picture when a page is shared (WhatsApp, Facebook, X…);
// product and category pages use their own photo instead.
export const alt = "Ghani Traders — leather jackets, belts, shoes, watches and mobile accessories";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OpengraphImage() {
  // The badge lettering is Poppins ExtraBold, like the site logo (OFL font, bundled in src/app/_fonts).
  const poppins = await readFile(join(process.cwd(), "src/app/_fonts/Poppins-ExtraBold.ttf"));
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", background: "#F2F1EE", padding: "0 90px" }}>
        <div style={{ display: "flex", flexDirection: "column" }}>
          {/* The store badge: framed bag with a G, divider, GHANI over TRADERS. */}
          <div style={{ display: "flex", alignItems: "center", gap: 34, border: "9px solid #1A120D", borderRadius: 40, padding: "26px 44px", alignSelf: "flex-start" }}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
              <svg width="70" height="42" viewBox="0 0 70 42">
                <path d="M12 42V24a23 23 0 0 1 46 0v18" fill="none" stroke="#1A120D" strokeWidth="12" strokeLinecap="round" />
              </svg>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 112, height: 94, marginTop: -6, borderRadius: 22, background: "#FF5A1F", color: "#fff", fontFamily: "Poppins", fontSize: 74 }}>G</div>
            </div>
            <div style={{ width: 6, height: 136, background: "#1A120D" }} />
            <div style={{ display: "flex", flexDirection: "column" }}>
              <div style={{ fontFamily: "Poppins", fontSize: 112, color: "#FF5A1F", lineHeight: 0.9 }}>GHANI</div>
              <div style={{ marginTop: 10, fontFamily: "Poppins", fontSize: 46, letterSpacing: 18, color: "#1A120D" }}>TRADERS</div>
            </div>
          </div>
          <div style={{ marginTop: 56, fontSize: 38, color: "#5C534C", maxWidth: 640, lineHeight: 1.3 }}>
            Leather jackets, belts, shoes, watches, wallets and mobile accessories.
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", width: 300, height: 300, borderRadius: 300, background: "#FF5A1F", color: "#fff" }}>
          <div style={{ fontSize: 34, fontWeight: 800 }}>Cash on</div>
          <div style={{ fontSize: 34, fontWeight: 800 }}>delivery</div>
          <div style={{ marginTop: 10, fontSize: 24 }}>across Pakistan</div>
        </div>
      </div>
    ),
    { ...size, fonts: [{ name: "Poppins", data: poppins, weight: 800, style: "normal" }] },
  );
}
