"use client";

import { ActionButton } from "@/components/console/action-form";
import { setAgentStatus } from "../../actions";

export function AgentActions({ id, status }: { id: string; status: string }) {
  return (
    <div className="flex justify-end gap-2">
      {status !== "active" && status !== "rejected" && <ActionButton action={() => setAgentStatus(id, "active")}>Activate</ActionButton>}
      {status === "pending" && (
        <ActionButton variant="danger" action={() => setAgentStatus(id, "rejected")}>
          Reject
        </ActionButton>
      )}
      {status === "active" && (
        <ActionButton variant="secondary" action={() => setAgentStatus(id, "suspended")} confirm="Suspend this agent? Their link will stop attributing new referrals.">
          Suspend
        </ActionButton>
      )}
    </div>
  );
}
