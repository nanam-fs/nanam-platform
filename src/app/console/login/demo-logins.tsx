import { ArrowRight, BadgeCheck, Banknote, ClipboardCheck, ShieldCheck } from "lucide-react";
import { demoLogin } from "../actions";

const roles = [
  { role: "officer", label: "Loan officer", hint: "Review applications, documents & identity", icon: ClipboardCheck },
  { role: "manager", label: "Credit manager", hint: "Recommend, approve or decline", icon: BadgeCheck },
  { role: "finance", label: "Finance", hint: "Disburse, record repayments, refunds", icon: Banknote },
  { role: "admin", label: "Administrator", hint: "Everything, plus team, audit & payments lab", icon: ShieldCheck },
] as const;

/** Demo deployments only: one tap to explore the console as each role. */
export function DemoLogins() {
  return (
    <div className="mt-6 rounded-2xl bg-white/[0.06] p-2 ring-1 ring-white/10">
      <p className="px-3 pt-2 pb-2 text-xs font-medium uppercase tracking-[0.14em] text-lime-400">Demo · explore as</p>
      <ul className="space-y-1">
        {roles.map((r) => (
          <li key={r.role}>
            <form action={demoLogin.bind(null, r.role)}>
              <button className="group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-white transition-colors hover:bg-white/10">
                <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-white/10 text-lime-400">
                  <r.icon className="size-4" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-medium">{r.label}</span>
                  <span className="block truncate text-xs text-white/55">{r.hint}</span>
                </span>
                <ArrowRight className="size-4 text-white/40 transition-transform group-hover:translate-x-0.5" />
              </button>
            </form>
          </li>
        ))}
      </ul>
    </div>
  );
}
