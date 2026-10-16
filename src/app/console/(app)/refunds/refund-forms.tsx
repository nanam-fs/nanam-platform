"use client";

import { ActionForm, Submit } from "@/components/console/action-form";
import { CInput, CSelect } from "@/components/console/ui";
import { decideRefund, payRefund } from "../../actions";

export function DecideRefundForm({ id }: { id: string }) {
  return (
    <ActionForm action={decideRefund.bind(null, id)} resetOnSuccess={false} className="mt-3 space-y-2">
      {({ errors }, pending) => (
        <>
          <CSelect name="decision" defaultValue="approved" aria-label="Decision">
            <option value="approved">Approve refund</option>
            <option value="rejected">Reject</option>
          </CSelect>
          <CInput name="note" required minLength={5} placeholder="Reason, e.g. confirmed duplicate payment" aria-label="Reason" error={errors?.note} />
          <Submit pending={pending}>Record decision</Submit>
        </>
      )}
    </ActionForm>
  );
}

export function PayRefundForm({ id }: { id: string }) {
  return (
    <ActionForm action={payRefund.bind(null, id)} resetOnSuccess={false} className="mt-3 space-y-2">
      {({ errors }, pending) => (
        <>
          <CSelect name="method" defaultValue="mobile_money" aria-label="Payout method">
            <option value="mobile_money">Mobile Money</option>
            <option value="bank">Bank transfer</option>
            <option value="cash">Cash at office</option>
          </CSelect>
          <CInput name="reference" required minLength={3} placeholder="Payout transaction reference" aria-label="Payout reference" error={errors?.reference} />
          <Submit pending={pending}>Mark as paid</Submit>
        </>
      )}
    </ActionForm>
  );
}
