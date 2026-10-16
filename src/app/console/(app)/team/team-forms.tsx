"use client";

import { ActionForm, Submit } from "@/components/console/action-form";
import { CField, CInput, CSelect } from "@/components/console/ui";
import type { Role } from "@/db/schema";
import { roleLabels } from "@/lib/permissions";
import { createStaff, updateStaff } from "../../actions";

const roles = Object.entries(roleLabels) as [Role, string][];

export function CreateStaffForm() {
  return (
    <ActionForm action={createStaff} className="space-y-3">
      {({ errors }, pending) => (
        <>
          <CField label="Full name" name="name" error={errors?.name}>
            <CInput name="name" required error={errors?.name} />
          </CField>
          <CField label="Work email" name="email" error={errors?.email}>
            <CInput name="email" type="email" required error={errors?.email} />
          </CField>
          <CField label="Role" name="role">
            <CSelect name="role" defaultValue="officer">
              {roles.map(([v, l]) => (
                <option key={v} value={v}>{l}</option>
              ))}
            </CSelect>
          </CField>
          <CField label="Temporary password" name="password" error={errors?.password} hint="At least 10 characters. They should change it after first sign-in.">
            <CInput name="password" type="text" autoComplete="off" required minLength={10} error={errors?.password} />
          </CField>
          <Submit pending={pending}>Create account</Submit>
        </>
      )}
    </ActionForm>
  );
}

export function StaffRowForm({ id, role, active }: { id: string; role: Role; active: boolean }) {
  return (
    <ActionForm action={updateStaff.bind(null, id)} resetOnSuccess={false} className="flex flex-wrap items-center gap-2">
      {(_, pending) => (
        <>
          <CSelect name="role" defaultValue={role} aria-label="Role" className="w-40">
            {roles.map(([v, l]) => (
              <option key={v} value={v}>{l}</option>
            ))}
          </CSelect>
          <CSelect name="active" defaultValue={String(active)} aria-label="Access" className="w-28">
            <option value="true">Active</option>
            <option value="false">Disabled</option>
          </CSelect>
          <Submit pending={pending} variant="secondary">Save</Submit>
        </>
      )}
    </ActionForm>
  );
}
