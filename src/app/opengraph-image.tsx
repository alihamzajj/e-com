import { ImageResponse } from "next/og";

// Default preview picture when a page is shared (WhatsApp, Facebook, X…);
// product and category pages use their own photo instead.
export const alt = "Ghani Traders — leather jackets, belts, shoes, watches and mobile accessories";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", background: "#F2F1EE", padding: "0 90px" }}>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 28 }}>
            <svg width="150" height="165" viewBox="0 0 120 132">
              <path d="M37 46V35a23 23 0 0 1 46 0v11" fill="none" stroke="#1A120D" strokeWidth="11" strokeLinecap="round" />
              <rect x="6" y="34" width="108" height="96" rx="36" fill="#FF5A1F" />
              <path d="M78.7 67.3A26.5 26.5 0 1 0 86.5 86H63" fill="none" stroke="#fff" strokeWidth="12" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
              <div style={{ fontSize: 150, fontWeight: 800, letterSpacing: -8, color: "#1A120D", lineHeight: 0.8 }}>ghani</div>
              <div style={{ marginTop: 14, fontSize: 36, fontWeight: 800, letterSpacing: 12, color: "#FF5A1F" }}>TRADERS</div>
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
    size,
  );
}
