import { quote } from "../loan-math";
import { site } from "../site";
import { formatUGX } from "../utils";
import { knowledge, synonyms, whatsappHandoff, type Action, type Entry } from "./knowledge";

export type Reply = { text: string; actions: Action[]; suggestions: string[]; kind: "answer" | "quote" | "smalltalk" | "fallback" | "warning" };

const STOP = new Set("a an the i me my is are am to of for and or in on at it do does can could would how what when where which who why with you your we our be have has get much".split(" "));

export function tokenize(text: string) {
  const expanded = text
    .toLowerCase()
    .replace(/[’']/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .flatMap((w) => (synonyms[w] ? [w, ...synonyms[w].split(" ")] : [w]));
  return expanded.filter((w) => w.length > 1 && !STOP.has(w)).map((w) => w.replace(/(ing|ed|s)$/, ""));
}

// Pre-tokenise the knowledge base once. Keywords and titles count more than answer text.
const index = knowledge.map((e) => ({
  e,
  key: new Set(e.keywords.flatMap(tokenize)),
  title: new Set(tokenize(e.title)),
  body: new Set(tokenize(e.answer)),
}));
const docFreq = new Map<string, number>();
for (const d of index) for (const t of new Set([...d.key, ...d.title, ...d.body])) docFreq.set(t, (docFreq.get(t) ?? 0) + 1);
const idf = (t: string) => Math.log(1 + index.length / (docFreq.get(t) ?? index.length));

export function search(text: string) {
  const q = [...new Set(tokenize(text))];
  return index
    .map((d) => ({
      e: d.e,
      score: q.reduce((s, t) => s + idf(t) * ((d.key.has(t) ? 3 : 0) + (d.title.has(t) ? 2 : 0) + (d.body.has(t) ? 0.5 : 0)), 0),
    }))
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score);
}

/** Amount like "5m", "5 million", "2.5M", "500k", "5,000,000", "UGX 7000000". */
export function parseAmount(text: string): number | null {
  const t = text.toLowerCase().replace(/,/g, "");
  const m = t.match(/(\d+(?:\.\d+)?)\s*(m\b|million|mil\b|k\b|thousand)/);
  if (m) return Math.round(Number(m[1]) * (m[2].startsWith("k") || m[2] === "thousand" ? 1_000 : 1_000_000));
  const big = t.match(/\b(\d{6,9})\b/);
  return big ? Number(big[1]) : null;
}

export function parseMonths(text: string): number | null {
  const m = text.toLowerCase().match(/(\d)\s*(month|mon|mo\b|mths?)/);
  return m ? Number(m[1]) : null;
}

const SUGGESTIONS = ["What do I need for a logbook loan?", "How much for 5M over 3 months?", "What is the interest rate?", "How do I repay?"];

export function reply(input: string): Reply {
  const text = input.trim();
  if (!text) return { text: "Ask me anything about NANAM loans.", actions: [], suggestions: SUGGESTIONS, kind: "smalltalk" };

  // Never invite sensitive data into a chat window.
  if (/\b\d{4,5}\b.*\bpin\b|\bpin\b.*\b\d{4,5}\b|\bC[MF][A-Z0-9]{12}\b/i.test(text)) {
    return {
      text: "Please don’t share your PIN, codes or ID number here. NANAM will never ask for your Mobile Money PIN. For anything about your account, sign in to the portal or call us.",
      actions: [{ label: "Customer portal", href: "/portal" }, { label: "Fraud & security", href: "/legal/security" }],
      suggestions: [],
      kind: "warning",
    };
  }

  if (/^(hi|hello|hey|good (morning|afternoon|evening)|oli otya|gyebale)\b/i.test(text) && text.split(/\s+/).length <= 4) {
    return { text: "Hello! I’m NANAM’s assistant. I can explain our loans, requirements and costs, or work out a repayment for you.", actions: [], suggestions: SUGGESTIONS, kind: "smalltalk" };
  }
  if (/^(thanks|thank you|webale|ok(ay)?|great|cool)\b/i.test(text) && text.split(/\s+/).length <= 4) {
    return { text: "You’re welcome. Anything else I can help with?", actions: [], suggestions: SUGGESTIONS.slice(0, 2), kind: "smalltalk" };
  }

  // Repayment estimate when the question names an amount.
  const amount = parseAmount(text);
  if (amount && /(pay|instal|month|cost|how much|borrow|loan|get|repay|calculat)/i.test(text)) {
    if (amount < 2_000_000 || amount > 100_000_000) {
      return { text: `NANAM loans range from ${formatUGX(2_000_000)} to ${formatUGX(100_000_000)}. Try an amount in that range.`, actions: [{ label: "Open the calculator", href: "/calculator" }], suggestions: ["How much for 5M over 3 months?"], kind: "quote" };
    }
    const months = Math.min(6, Math.max(1, parseMonths(text) ?? 3));
    const q = quote(amount, months);
    return {
      text: `For ${formatUGX(amount)} over ${months} month${months > 1 ? "s" : ""}: about ${formatUGX(q.monthlyInstalment)} a month. You’d receive ${formatUGX(q.netDisbursed)} after the ${site.pricing.processingFee}% fee, and repay ${formatUGX(q.totalRepayable)} in total. This is an estimate; your agreement has the final figures.`,
      actions: [
        { label: `Apply for ${formatUGX(amount)}`, href: `/apply?amount=${amount}&months=${months}` },
        { label: "Full schedule", href: "/calculator" },
      ],
      suggestions: [`What about ${months === 6 ? 3 : 6} months?`, "What documents do I need?"],
      kind: "quote",
    };
  }

  const hits = search(text);
  const best = hits[0];
  if (!best || best.score < 2.2) {
    return {
      text: "I’m not sure about that one. Our team can help directly, or try one of these:",
      actions: [{ label: "Ask on WhatsApp", href: whatsappHandoff(text) }],
      suggestions: SUGGESTIONS,
      kind: "fallback",
    };
  }
  const related = hits
    .slice(1, 4)
    .filter((h) => h.score > best.score * 0.45)
    .map((h) => h.e.title)
    .filter((t: Entry["title"]) => t !== best.e.title)
    .slice(0, 3);
  return { text: best.e.answer, actions: best.e.actions ?? [], suggestions: related, kind: "answer" };
}
