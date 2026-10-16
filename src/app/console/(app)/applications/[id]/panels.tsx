"use client";

import { ActionButton, ActionForm, Submit } from "@/components/console/action-form";
import { CField, CInput, CSelect, CTextarea } from "@/components/console/ui";
import {
  addCollateral,
  addNote,
  decide,
  disburse,
  markCollateralHeld,
  recommend,
  releaseCollateral,
  startReview,
  withdraw,
} from "../../../actions";

export function StartReviewButton({ id }: { id: string }) {
  return <ActionButton action={() => startReview(id)}>Assign to me &amp; start review</ActionButton>;
}

export function RecommendForm({ id, amount, months }: { id: string; amount: number; months: number }) {
  return (
    <ActionForm action={recommend.bind(null, id)} resetOnSuccess={false} className="space-y-3">
      {({ errors }, pending) => (
        <>
          <div className="grid grid-cols-2 gap-3">
            <CField label="Amount (UGX)" name="approvedAmount" error={errors?.approvedAmount}>
              <CInput name="approvedAmount" type="number" inputMode="numeric" defaultValue={amount} min={2_000_000} max={100_000_000} step={100_000} required error={errors?.approvedAmount} />
            </CField>
            <CField label="Months" name="approvedMonths" error={errors?.approvedMonths}>
              <CSelect name="approvedMonths" defaultValue={months}>
                {[1, 2, 3, 4, 5, 6].map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </CSelect>
            </CField>
          </div>
          <CField label="Assessment" name="decisionNote" error={errors?.decisionNote} hint="Income verified, collateral checked, character, risks.">
            <CTextarea name="decisionNote" required minLength={10} error={errors?.decisionNote} />
          </CField>
          <Submit pending={pending}>Recommend</Submit>
        </>
      )}
    </ActionForm>
  );
}

export function DecideForm({ id }: { id: string }) {
  return (
    <ActionForm action={decide.bind(null, id)} resetOnSuccess={false} className="space-y-3">
      {({ errors }, pending) => (
        <>
          <CField label="Decision" name="decision">
            <CSelect name="decision" defaultValue="approved">
              <option value="approved">Approve</option>
              <option value="declined">Decline</option>
              <option value="reviewing">Return to officer for more information</option>
            </CSelect>
          </CField>
          <CField label="Reason" name="note" error={errors?.note}>
            <CTextarea name="note" required minLength={5} error={errors?.note} />
          </CField>
          <Submit pending={pending}>Record decision</Submit>
        </>
      )}
    </ActionForm>
  );
}

export function DisburseForm({ id }: { id: string }) {
  const today = new Date().toLocaleDateString("en-CA", { timeZone: "Africa/Kampala" });
  return (
    <ActionForm action={disburse.bind(null, id)} resetOnSuccess={false} className="space-y-3">
      {({ errors }, pending) => (
        <>
          <div className="grid grid-cols-2 gap-3">
            <CField label="Method" name="method">
              <CSelect name="method" defaultValue="mobile_money">
                <option value="mobile_money">Mobile Money</option>
                <option value="bank">Bank transfer</option>
                <option value="cash">Cash</option>
              </CSelect>
            </CField>
            <CField label="Date" name="date" error={errors?.date}>
              <CInput name="date" type="date" defaultValue={today} max={today} required error={errors?.date} />
            </CField>
          </div>
          <CField label="Transaction reference" name="reference" error={errors?.reference}>
            <CInput name="reference" required placeholder="MoMo ID, bank ref or receipt no." error={errors?.reference} />
          </CField>
          <Submit pending={pending}>Confirm disbursement</Submit>
        </>
      )}
    </ActionForm>
  );
}

export function WithdrawForm({ id }: { id: string }) {
  return (
    <ActionForm action={withdraw.bind(null, id)} resetOnSuccess={false} className="space-y-3">
      {({ errors }, pending) => (
        <>
          <CField label="Reason" name="note" error={errors?.note}>
            <CInput name="note" required placeholder="e.g. Client no longer needs the loan" error={errors?.note} />
          </CField>
          <Submit pending={pending} variant="danger">
            Withdraw application
          </Submit>
        </>
      )}
    </ActionForm>
  );
}

export function NoteForm({ applicationId }: { applicationId: string }) {
  return (
    <ActionForm action={addNote.bind(null, applicationId)} className="space-y-2">
      {({ errors }, pending) => (
        <>
          <CTextarea name="body" aria-label="Add a note" placeholder="Add a note: calls made, documents received, site visit…" required error={errors?.body} />
          <Submit pending={pending} variant="secondary">
            Add note
          </Submit>
        </>
      )}
    </ActionForm>
  );
}

export function AddCollateralForm({ applicationId, defaultType }: { applicationId: string; defaultType: "logbook" | "land-title" | "contract" }) {
  return (
    <ActionForm action={addCollateral.bind(null, applicationId)} className="space-y-3">
      {({ errors }, pending) => (
        <>
          <p className="text-sm font-medium text-forest-950">Add collateral</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <CField label="Type" name="type">
              <CSelect name="type" defaultValue={defaultType}>
                <option value="logbook">Motor vehicle logbook</option>
                <option value="land-title">Land title</option>
                <option value="contract">Contract / LPO</option>
              </CSelect>
            </CField>
            <CField label="Reg. / plot / contract no." name="identifier" error={errors?.identifier}>
              <CInput name="identifier" required placeholder="UBA 123X or Block 12 Plot 45" error={errors?.identifier} />
            </CField>
            <CField label="Description" name="description" error={errors?.description}>
              <CInput name="description" required placeholder="Toyota Premio 2012, silver" error={errors?.description} />
            </CField>
            <CField label="Valuation (UGX)" name="valuation" error={errors?.valuation}>
              <CInput name="valuation" type="number" inputMode="numeric" min={1} placeholder="Optional" error={errors?.valuation} />
            </CField>
          </div>
          <Submit pending={pending} variant="secondary">
            Save collateral
          </Submit>
        </>
      )}
    </ActionForm>
  );
}

export function CollateralActions({ id, status, canManage, canRelease }: { id: string; status: string; canManage: boolean; canRelease: boolean }) {
  if (status === "pending" && canManage) return <ActionButton variant="secondary" action={() => markCollateralHeld(id)}>Mark original received</ActionButton>;
  if (status === "held" && canRelease)
    return (
      <ActionButton variant="secondary" action={() => releaseCollateral(id)} confirm="Release this collateral back to the client?">
        Release
      </ActionButton>
    );
  return null;
}
