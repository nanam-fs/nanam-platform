"use client";

import { ActionForm, Submit } from "@/components/console/action-form";
import { CField, CInput, CSelect } from "@/components/console/ui";
import { formatUGX } from "@/lib/utils";
import { recordRepayment } from "../../../actions";

export function RepaymentForm({ loanId, suggested, max, settlement }: { loanId: string; suggested: number; max: number; settlement: number }) {
  const today = new Date().toLocaleDateString("en-CA", { timeZone: "Africa/Kampala" });
  return (
    <ActionForm action={recordRepayment.bind(null, loanId)} className="space-y-3">
      {({ errors }, pending) => (
        <>
          <CField label="Amount (UGX)" name="amount" error={errors?.amount} hint={`Next instalment ${formatUGX(suggested)} · max ${formatUGX(max)}`}>
            <CInput name="amount" type="number" inputMode="numeric" min={1} max={max} defaultValue={suggested || undefined} required error={errors?.amount} />
          </CField>
          <div className="grid grid-cols-2 gap-3">
            <CField label="Method" name="method">
              <CSelect name="method" defaultValue="mobile_money">
                <option value="mobile_money">Mobile Money</option>
                <option value="bank">Bank</option>
                <option value="cash">Cash</option>
              </CSelect>
            </CField>
            <CField label="Date received" name="receivedAt" error={errors?.receivedAt}>
              <CInput name="receivedAt" type="date" defaultValue={today} max={today} required error={errors?.receivedAt} />
            </CField>
          </div>
          <CField label="Reference" name="reference" error={errors?.reference}>
            <CInput name="reference" required placeholder="MoMo transaction ID or receipt no." error={errors?.reference} />
          </CField>
          {settlement < max && (
            <label className="flex gap-2 rounded-lg bg-cream p-3 text-sm">
              <input type="checkbox" name="settle" className="mt-0.5 accent-forest-600" />
              <span>
                Early settlement: client pays <strong>{formatUGX(settlement)}</strong> today and future interest is waived.
              </span>
            </label>
          )}
          <Submit pending={pending}>Record repayment</Submit>
        </>
      )}
    </ActionForm>
  );
}
