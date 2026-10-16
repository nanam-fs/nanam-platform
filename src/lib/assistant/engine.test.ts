import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { parseAmount, parseMonths, reply } from "./engine";

const top = (q: string) => reply(q);

describe("assistant", () => {
  it("answers product and requirement questions from NANAM content", () => {
    assert.match(top("what do i need for a logbook loan").text, /logbook/i);
    assert.match(top("can I borrow against my land title?").text, /land/i);
    assert.match(top("what is your interest rate").text, /2\.8% per month/);
    assert.match(top("how do I pay with mtn momo").text, /MTN MoMo or Airtel Money/);
    assert.match(top("is nanam licensed by umra").text, /licensed/i);
  });
  it("understands common Luganda and everyday words", () => {
    assert.match(top("njagala sente ku mmotoka yange").text, /logbook|vehicle/i);
    assert.match(top("ettaka").text, /land/i);
  });
  it("works out a repayment estimate with the real loan maths", () => {
    const r = top("how much would I pay for 5m over 3 months");
    assert.equal(r.kind, "quote");
    assert.match(r.text, /UGX 1,760,859 a month/);
    assert.match(r.text, /receive UGX 4,900,000/);
    assert.equal(r.actions[0].href, "/apply?amount=5000000&months=3");
  });
  it("keeps estimates inside NANAM's loan range", () => {
    assert.match(top("can i borrow 500k for a month").text, /range from UGX 2,000,000/);
  });
  it("refuses to take PINs or ID numbers", () => {
    assert.equal(top("my pin is 4821 can you check my loan").kind, "warning");
    assert.equal(top("my id is CM12345678ABCD").kind, "warning");
  });
  it("hands off to WhatsApp when it doesn't know", () => {
    const r = top("what's the weather in Gulu tomorrow");
    assert.equal(r.kind, "fallback");
    assert.match(r.actions[0].href, /^https:\/\/wa\.me\/256773902993\?text=/);
  });
  it("parses amounts and months", () => {
    assert.equal(parseAmount("2.5M"), 2_500_000);
    assert.equal(parseAmount("UGX 7,000,000"), 7_000_000);
    assert.equal(parseAmount("800k"), 800_000);
    assert.equal(parseMonths("over 6 months"), 6);
  });
});
