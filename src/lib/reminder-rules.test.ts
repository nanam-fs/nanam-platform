import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { disbursedSms, planReminders, receiptSms, refundSms } from "./reminder-rules";

const loan = (dues: [string, number, number][]) => ({
  id: "L1",
  reference: "LN-2610-AB12",
  borrowerName: "Florence Nansubuga",
  borrowerPhone: "+256772111999",
  installments: dues.map(([dueDate, amountDue, amountPaid], i) => ({ id: `I${i + 1}`, seq: i + 1, dueDate, amountDue, amountPaid })),
});

describe("planReminders", () => {
  const l = loan([["2026-11-06", 3_521_718, 0], ["2026-12-06", 3_521_718, 0]]);
  it("reminds 1–3 days before, on the day, and not otherwise", () => {
    assert.equal(planReminders(l, "2026-11-02").length, 0);
    assert.equal(planReminders(l, "2026-11-03")[0].kind, "due_soon");
    assert.equal(planReminders(l, "2026-11-05")[0].dedupeKey, "due_soon:I1");
    assert.equal(planReminders(l, "2026-11-06")[0].kind, "due_today");
  });
  it("escalates overdue reminders by days past due, anchored on the oldest miss", () => {
    assert.equal(planReminders(l, "2026-11-07")[0].kind, "overdue_1");
    assert.equal(planReminders(l, "2026-11-13")[0].kind, "overdue_7");
    const late = planReminders(l, "2026-12-10");
    assert.equal(late.length, 1, "one arrears message per loan, no separate due reminder");
    assert.equal(late[0].kind, "overdue_30");
    assert.equal(late[0].dedupeKey, "overdue_30:I1");
    assert.match(late[0].body, /UGX 7,043,436/, "quotes total owed across missed instalments");
  });
  it("sends nothing once an instalment is paid", () => {
    assert.equal(planReminders(loan([["2026-11-06", 100, 100]]), "2026-11-06").length, 0);
  });
});

describe("message templates", () => {
  const long = { name: "Christabellah Nakimuli-Ssemwogerere", reference: "LN-2610-FFFF" };
  const all = [
    ...["2026-11-04", "2026-11-06", "2026-11-07", "2026-11-14", "2026-12-07"].map((d) =>
      planReminders({ ...loan([["2026-11-06", 100_000_000, 0]]), borrowerName: long.name, reference: long.reference }, d)[0].body,
    ),
    receiptSms({ ...long, amount: 100_000_000, balance: 99_999_999, closed: false }),
    receiptSms({ ...long, amount: 100_000_000, balance: 0, closed: true }),
    refundSms({ ...long, amount: 99_999_999, msisdn: "+256772111999", payoutRef: "MP2610161234567890ABCDEFGH" }),
    disbursedSms({ ...long, net: 98_000_000, firstAmount: 18_888_888, firstDue: "2026-11-06" }),
  ];
  it("fit in a single 160-character plain-text SMS", () => {
    for (const body of all) {
      assert.ok(body.length <= 160, `${body.length} chars: ${body}`);
      assert.match(body, /^[\x20-\x7E]+$/, `non-ASCII character in: ${body}`);
    }
  });
});
