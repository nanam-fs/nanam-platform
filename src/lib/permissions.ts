import type { Role } from "@/db/schema";

/**
 * Who may do what. Mirrors segregation of duties expected of a licensed lender:
 * officers originate and recommend, managers approve (never their own recommendation),
 * finance disburses and receipts money, admins manage people and settings.
 */
const matrix = {
  "application.review": ["officer", "manager", "admin"],
  "application.recommend": ["officer", "manager", "admin"],
  "application.decide": ["manager", "admin"],
  "application.withdraw": ["officer", "manager", "admin"],
  "collateral.manage": ["officer", "manager", "admin"],
  "collateral.release": ["manager", "admin"],
  "loan.disburse": ["finance", "admin"],
  "loan.repayment": ["finance", "admin"],
  "agent.manage": ["manager", "admin"],
  "commission.pay": ["finance", "admin"],
  "refund.approve": ["manager", "admin"],
  "refund.pay": ["finance", "admin"],
  "message.manage": ["officer", "manager", "admin"],
  "reminders.run": ["finance", "manager", "admin"],
  "audit.view": ["manager", "admin"],
  "staff.manage": ["admin"],
} as const satisfies Record<string, readonly Role[]>;

export type Permission = keyof typeof matrix;

export function can(role: Role, permission: Permission) {
  return (matrix[permission] as readonly Role[]).includes(role);
}

export const roleLabels: Record<Role, string> = {
  admin: "Administrator",
  manager: "Credit manager",
  officer: "Loan officer",
  finance: "Finance",
};
