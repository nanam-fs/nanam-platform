import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { addMonths, allocate, buildSchedule, canTransition, settlementQuote } from "./lending";
import { quote } from "./loan-math";
import { detectNetwork } from "./phone";

describe("buildSchedule", () => {
  it("clears principal to exactly zero in whole shillings", () => {
    for (const [p, m] of [[2_000_000, 1], [10_000_000, 3], [7_333_333, 5], [100_000_000, 6]] as const) {
      const rows = buildSchedule(p, m, 2.8, new Date("2026-01-31T00:00:00Z"));
      assert.equal(rows.length, m);
      assert.equal(rows.reduce((s, r) => s + r.principalDue, 0), p);
      for (const r of rows) {
        assert.ok(Number.isInteger(r.amountDue) && Number.isInteger(r.interestDue));
        assert.equal(r.amountDue, r.principalDue + r.interestDue);
      }
    }
  });
  it("matches the public calculator within rounding", () => {
    const rows = buildSchedule(10_000_000, 3, 2.8, new Date("2026-10-16T00:00:00Z"));
    assert.ok(Math.abs(rows[0].amountDue - quote(10_000_000, 3).monthlyInstalment) < 1);
  });
  it("clamps due dates to month end", () => {
    assert.equal(addMonths(new Date("2026-01-31T00:00:00Z"), 1).toISOString().slice(0, 10), "2026-02-28");
    assert.equal(addMonths(new Date("2028-01-31T00:00:00Z"), 1).toISOString().slice(0, 10), "2028-02-29");
  });
});

describe("allocate", () => {
  const open = [
    { id: "a", seq: 1, amountDue: 100, amountPaid: 40 },
    { id: "b", seq: 2, amountDue: 100, amountPaid: 0 },
  ];
  it("pays oldest first and reports excess", () => {
    assert.deepEqual(allocate(80, open), { updates: [{ id: "a", add: 60, settles: true }, { id: "b", add: 20, settles: false }], excess: 0 });
    assert.equal(allocate(500, open).excess, 340);
  });
});

describe("settlementQuote", () => {
  const rows = buildSchedule(10_000_000, 3, 2.8, new Date("2026-10-16T00:00:00Z")).map((r, i) => ({ ...r, id: String(i), amountPaid: 0 }));
  it("charges the current period in full and waives future interest", () => {
    const s = settlementQuote(rows, "2026-10-20");
    assert.equal(s.waived, rows[1].interestDue + rows[2].interestDue);
    assert.equal(s.amount, rows[0].amountDue + rows[1].principalDue + rows[2].principalDue);
  });
  it("includes overdue instalments in full", () => {
    const s = settlementQuote(rows, "2026-12-01");
    assert.equal(s.amount, rows[0].amountDue + rows[1].amountDue + rows[2].principalDue);
  });
});

describe("workflow", () => {
  it("never skips approval", () => {
    assert.equal(canTransition("reviewing", "approved"), false);
    assert.equal(canTransition("new", "disbursed"), false);
    assert.equal(canTransition("recommended", "approved"), true);
    assert.equal(canTransition("declined", "reviewing"), false);
  });
});

describe("detectNetwork", () => {
  it("maps Ugandan prefixes", () => {
    assert.equal(detectNetwork("+256772123456"), "mtn");
    assert.equal(detectNetwork("0782123456"), "mtn");
    assert.equal(detectNetwork("0701481852"), "airtel");
    assert.equal(detectNetwork("0752123456"), "airtel");
    assert.equal(detectNetwork("0712123456"), null);
  });
});
