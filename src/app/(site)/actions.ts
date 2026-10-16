"use server";

import { z } from "zod";
import { normalisePhone, saveAgent, saveApplication, saveMessage } from "@/lib/inbox";
import { checkApplicationCode, sendApplicationCode } from "@/lib/phone-verify";
import { applicationSchema, contactSchema, partnerSchema, phoneChangeSchema, type FormState } from "@/lib/schemas";
import { issueUploadToken } from "@/lib/upload-token";

function fromForm(formData: FormData) {
  const values: Record<string, string> = {};
  for (const [k, v] of formData) if (!k.startsWith("$ACTION") && typeof v === "string") values[k] = v;
  return values;
}

async function handle<T extends z.ZodType>(
  schema: T,
  formData: FormData,
  save: (data: z.infer<T>) => Promise<string | Pick<FormState, "reference" | "upload">>,
  success: string,
): Promise<FormState> {
  const values = fromForm(formData);
  // Honeypot: bots fill every field, people never see this one.
  if (values.company_website) return { ok: true, reference: "—", message: success };

  const parsed = schema.safeParse(values);
  if (!parsed.success) {
    return {
      ok: false,
      message: "Please check the highlighted fields.",
      errors: z.flattenError(parsed.error).fieldErrors as FormState["errors"],
      values,
    };
  }
  try {
    const saved = await save(parsed.data);
    return { ok: true, message: success, ...(typeof saved === "string" ? { reference: saved } : saved) };
  } catch (err) {
    console.error("[nanam] failed to save submission", err);
    return { ok: false, message: "Something went wrong on our side. Please try again, or call us.", values };
  }
}

export async function submitApplication(_: FormState, formData: FormData) {
  const values = fromForm(formData);
  const parsed = applicationSchema.safeParse(values);
  if (parsed.success && !values.company_website) {
    const code = values.code?.trim();
    // Step 1: text a code to the number. Step 2: accept the application only with the right code.
    if (!code || values.resend === "1") {
      let sent: Awaited<ReturnType<typeof sendApplicationCode>>;
      try {
        sent = await sendApplicationCode(parsed.data.phone);
        if (!sent.ok) return { ok: false, message: sent.message, values, verify: { phone: normalisePhone(parsed.data.phone) } };
      } catch (err) {
        console.error("[apply] could not send code", err);
        return { ok: false, message: "We couldn’t text a code to that number. Check it and try again, or call us.", values };
      }
      return { ok: false, values, verify: { phone: normalisePhone(parsed.data.phone), demoCode: sent.demoCode } };
    }
    if (!(await checkApplicationCode(parsed.data.phone, code))) {
      return { ok: false, message: "That code is incorrect or has expired.", values, verify: { phone: normalisePhone(parsed.data.phone) }, errors: { code: ["Incorrect code"] } };
    }
  }
  return handle(
    applicationSchema,
    formData,
    async (data) => {
      const { reference, id } = await saveApplication(data, new Date());
      const token = issueUploadToken(id);
      return { reference, upload: token ? { applicationId: id, token, product: data.product } : undefined };
    },
    "A loan officer will contact you within 24 hours.",
  );
}

export async function submitContact(_: FormState, formData: FormData) {
  return handle(contactSchema, formData, saveMessage, "Thanks for reaching out. We’ll get back to you shortly.");
}

export async function submitPhoneChange(_: FormState, formData: FormData) {
  return handle(
    phoneChangeSchema,
    formData,
    (d) =>
      saveMessage({
        name: d.fullName,
        phone: d.newPhone,
        topic: "phone-change",
        message: `Number change request.\nName: ${d.fullName}\nNIN: ${d.nin}\nOld number: ${d.oldPhone}\nNew number: ${d.newPhone}\nLoan/application ref: ${d.reference || "not given"}\n\nVerify identity before changing the number (Application → Change phone number).`,
      }),
    "Request received. A NANAM officer will call your new number to confirm your identity before making the change.",
  );
}

export async function submitPartner(_: FormState, formData: FormData) {
  return handle(
    partnerSchema,
    formData,
    saveAgent,
    "Thank you for applying to become a NANAM agent. We will review your application and contact you within 48 working hours.",
  );
}
