"use server";

import { z } from "zod";
import { saveAgent, saveApplication, saveMessage } from "@/lib/inbox";
import { applicationSchema, contactSchema, partnerSchema, type FormState } from "@/lib/schemas";
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
  return handle(
    applicationSchema,
    formData,
    async (data) => {
      const { reference, id } = await saveApplication(data);
      const token = issueUploadToken(id);
      return { reference, upload: token ? { applicationId: id, token, product: data.product } : undefined };
    },
    "A loan officer will contact you within 24 hours.",
  );
}

export async function submitContact(_: FormState, formData: FormData) {
  return handle(contactSchema, formData, saveMessage, "Thanks for reaching out. We’ll get back to you shortly.");
}

export async function submitPartner(_: FormState, formData: FormData) {
  return handle(
    partnerSchema,
    formData,
    saveAgent,
    "Thank you for applying to become a NANAM agent. We will review your application and contact you within 48 working hours.",
  );
}
