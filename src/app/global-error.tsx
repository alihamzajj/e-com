"use client";

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="en">
      <body style={{ fontFamily: "system-ui, sans-serif", background: "#e9e9e6", color: "#1b1b1c", display: "grid", placeItems: "center", minHeight: "100dvh", margin: 0 }}>
        <div style={{ textAlign: "center", padding: 24 }}>
          <h1 style={{ fontSize: 28, marginBottom: 8 }}>Something went wrong</h1>
          <p style={{ color: "#6f6f6c", marginBottom: 20 }}>Please try again.{error.digest ? ` Reference: ${error.digest}` : ""}</p>
          <button onClick={() => reset()} style={{ background: "#ff5a1f", color: "#fff", border: 0, padding: "10px 18px", borderRadius: 4, cursor: "pointer" }}>
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
