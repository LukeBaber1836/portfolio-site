import { describe, expect, it } from "vitest";

import {
  agingBucket,
  amountForSeconds,
  groupEntriesForInvoice,
  invoiceTotalCents,
  isOverdue,
  resolveRateCents,
  roundSeconds,
} from "./index";

describe("resolveRateCents", () => {
  it("prefers project, then client, then default", () => {
    expect(resolveRateCents({ projectRateCents: 7500, clientRateCents: 6000, defaultRateCents: 5000 })).toBe(7500);
    expect(resolveRateCents({ projectRateCents: null, clientRateCents: 6000, defaultRateCents: 5000 })).toBe(6000);
    expect(resolveRateCents({ defaultRateCents: 5000 })).toBe(5000);
  });

  it("treats a zero override as a real rate (pro bono)", () => {
    expect(resolveRateCents({ projectRateCents: 0, defaultRateCents: 5000 })).toBe(0);
  });
});

describe("roundSeconds", () => {
  it("bills exact seconds when rounding is off", () => {
    expect(roundSeconds(3725, 0)).toBe(3725);
  });

  it("rounds to the nearest increment", () => {
    expect(roundSeconds(7 * 60, 15)).toBe(15 * 60); // minimum one increment
    expect(roundSeconds(22 * 60, 15)).toBe(15 * 60);
    expect(roundSeconds(23 * 60, 15)).toBe(30 * 60);
    expect(roundSeconds(63 * 60, 6)).toBe(66 * 60);
  });

  it("never bills negative or zero durations", () => {
    expect(roundSeconds(0, 15)).toBe(0);
    expect(roundSeconds(-10, 15)).toBe(0);
  });
});

describe("amountForSeconds", () => {
  it("computes cents from seconds at an hourly rate", () => {
    expect(amountForSeconds(3600, 5000)).toBe(5000);
    expect(amountForSeconds(5400, 5000)).toBe(7500);
    expect(amountForSeconds(60, 5000)).toBe(83); // $0.8333 → 83¢
  });
});

describe("groupEntriesForInvoice", () => {
  const d = (s: string) => new Date(s);
  const entries = [
    { id: "a", projectId: "p1", projectName: "Site", durationSeconds: 1800, rateCents: 5000, startedAt: d("2026-09-02T15:00:00Z") },
    { id: "b", projectId: "p1", projectName: "Site", durationSeconds: 2700, rateCents: 5000, startedAt: d("2026-09-01T15:00:00Z") },
    { id: "c", projectId: "p1", projectName: "Site", durationSeconds: 3600, rateCents: 7500, startedAt: d("2026-09-03T15:00:00Z") },
    { id: "d", projectId: "p2", projectName: "App", durationSeconds: 600, rateCents: 5000, startedAt: d("2026-09-04T15:00:00Z") },
  ];

  it("groups by project and rate with totals and period", () => {
    const groups = groupEntriesForInvoice(entries, 0);
    expect(groups).toHaveLength(3);
    const site50 = groups.find((g) => g.key === "p1:5000")!;
    expect(site50.entryIds).toEqual(["a", "b"]);
    expect(site50.loggedSeconds).toBe(4500);
    expect(site50.amountCents).toBe(6250);
    expect(site50.periodStart.toISOString()).toBe("2026-09-01T15:00:00.000Z");
    expect(site50.periodEnd.toISOString()).toBe("2026-09-02T15:00:00.000Z");
  });

  it("applies rounding to the group total, not each entry", () => {
    const groups = groupEntriesForInvoice(entries, 15);
    const app = groups.find((g) => g.key === "p2:5000")!;
    expect(app.billedSeconds).toBe(900);
    expect(app.amountCents).toBe(1250);
  });

  it("sums groups and ad-hoc items", () => {
    const groups = groupEntriesForInvoice(entries, 0);
    expect(invoiceTotalCents(groups, [{ quantity: 2, unitAmountCents: 1500 }])).toBe(6250 + 7500 + 833 + 3000);
  });
});

describe("overdue + aging", () => {
  const today = new Date("2026-09-20T12:00:00");

  it("only open invoices past due are overdue", () => {
    expect(isOverdue("open", "2026-09-19", today)).toBe(true);
    expect(isOverdue("open", "2026-09-20", today)).toBe(false); // due today
    expect(isOverdue("paid", "2026-09-01", today)).toBe(false);
  });

  it("buckets by days past due", () => {
    expect(agingBucket("2026-09-25", today)).toBe("current");
    expect(agingBucket("2026-09-10", today)).toBe("1-30");
    expect(agingBucket("2026-08-10", today)).toBe("31-60");
    expect(agingBucket("2026-06-01", today)).toBe("60+");
  });
});
