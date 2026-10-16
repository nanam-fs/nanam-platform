"use client";

import { ActionForm, Submit } from "@/components/console/action-form";
import { CField, CInput } from "@/components/console/ui";
import { changePassword } from "../../actions";

export function PasswordForm() {
  return (
    <ActionForm action={changePassword} className="space-y-3">
      {({ errors }, pending) => (
        <>
          <CField label="Current password" name="current" error={errors?.current}>
            <CInput name="current" type="password" autoComplete="current-password" required error={errors?.current} />
          </CField>
          <CField label="New password" name="next" error={errors?.next} hint="At least 10 characters.">
            <CInput name="next" type="password" autoComplete="new-password" required minLength={10} error={errors?.next} />
          </CField>
          <Submit pending={pending}>Update password</Submit>
        </>
      )}
    </ActionForm>
  );
}
