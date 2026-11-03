import { describe, expect, it } from "vitest";
import { code128B } from "@/lib/utils/code128";

/** Splits the module widths back into 6-wide symbols (the stop symbol is 7). */
function symbols(widths: number[]) {
  const body = widths.slice(0, -7);
  return Array.from({ length: body.length / 6 }, (_, i) => body.slice(i * 6, i * 6 + 6));
}

describe("Code 128 barcode", () => {
  const widths = code128B("GT-100042");

  it("frames the data with start B, a checksum and the stop pattern", () => {
    // start + 9 characters + checksum
    expect(symbols(widths)).toHaveLength(11);
    expect(symbols(widths)[0].join("")).toBe("211214");
    expect(widths.slice(-7).join("")).toBe("2331112");
  });

  it("uses well-formed symbols: 11 modules wide, even bar total", () => {
    for (const s of symbols(widths)) {
      expect(s.reduce((a, b) => a + b, 0)).toBe(11);
      expect(s[0] + s[2] + s[4]).toSatisfy((n: number) => n % 2 === 0);
    }
  });

  it("gives every printable character its own symbol", () => {
    const all = code128B(Array.from({ length: 95 }, (_, i) => String.fromCharCode(32 + i)).join(""));
    const data = symbols(all).slice(1, -1).map((s) => s.join(""));
    expect(new Set(data).size).toBe(95);
    for (const s of symbols(all)) {
      expect(s.reduce((a, b) => a + b, 0)).toBe(11);
      expect((s[0] + s[2] + s[4]) % 2).toBe(0);
    }
  });

  it("computes the checksum from the weighted character values", () => {
    // "A" is value 33: (104 + 33 × 1) mod 103 = 34 → pattern "131123".
    expect(symbols(code128B("A"))[2].join("")).toBe("131123");
  });
});
