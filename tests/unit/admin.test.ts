import { describe, expect, it } from "vitest";
import { resolveRange, startOfLocalDay } from "@/features/admin/date-range";
import { allowedNextStatuses } from "@/features/admin/orders";

describe("report date ranges", () => {
  // 2026-10-22 01:30 in Karachi (UTC+5) is still 2026-10-21 in UTC.
  const now = new Date("2026-10-21T20:30:00Z");
  const tz = "Asia/Karachi";

  it("computes 'today' in the store time zone, not UTC", () => {
    const r = resolveRange({ range: "today" }, tz, now);
    expect(r.fromDate).toBe("2026-10-22");
    expect(r.from.toISOString()).toBe("2026-10-21T19:00:00.000Z");
    expect(r.to.toISOString()).toBe("2026-10-22T19:00:00.000Z");
  });

  it("uses half-open week and month ranges", () => {
    const week = resolveRange({ range: "7d" }, tz, now);
    expect([week.fromDate, week.toDate]).toEqual(["2026-10-16", "2026-10-22"]);
    const last = resolveRange({ range: "last_month" }, tz, now);
    expect([last.fromDate, last.toDate]).toEqual(["2026-09-01", "2026-09-30"]);
    expect(last.to.toISOString()).toBe("2026-09-30T19:00:00.000Z");
  });

  it("falls back to 30 days for invalid custom ranges and caps long ones", () => {
    expect(resolveRange({ range: "custom", from: "2026-10-10", to: "2026-10-01" }, tz, now).preset).toBe("30d");
    expect(resolveRange({ range: "custom", from: "2026-02-31", to: "2026-03-01" }, tz, now).preset).toBe("30d");
    const long = resolveRange({ range: "custom", from: "2020-01-01", to: "2026-10-01" }, tz, now);
    expect(long.fromDate).toBe("2025-10-01");
  });

  it("handles daylight saving transitions", () => {
    // New York switches to EST on 2026-11-01: midnight that day is still EDT (UTC-4).
    expect(startOfLocalDay({ y: 2026, m: 11, d: 1 }, "America/New_York").toISOString()).toBe("2026-11-01T04:00:00.000Z");
    expect(startOfLocalDay({ y: 2026, m: 11, d: 2 }, "America/New_York").toISOString()).toBe("2026-11-02T05:00:00.000Z");
  });
});

describe("order status actions offered in the admin", () => {
  it("never offers fulfilment steps for unpaid online orders", () => {
    expect(allowedNextStatuses("pending", "online", "pending")).toEqual(["cancelled"]);
    expect(allowedNextStatuses("pending", "online", "paid")).toEqual(["confirmed", "cancelled"]);
  });

  it("offers COD steps without payment", () => {
    expect(allowedNextStatuses("pending", "cod", "unpaid")).toEqual(["confirmed", "cancelled"]);
    expect(allowedNextStatuses("delivered", "cod", "paid")).toEqual(["returned"]);
    expect(allowedNextStatuses("cancelled", "cod", "unpaid")).toEqual([]);
  });
});
