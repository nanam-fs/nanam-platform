import { NextResponse, type NextRequest } from "next/server";
import { findByProviderRef, syncPayment } from "@/lib/payments";

/**
 * Mobile Money provider callbacks. The body is used only to find which request it is about;
 * the outcome is always re-read from the provider's API before anything is posted.
 */
async function handle(req: NextRequest, ctx: RouteContext<"/api/payments/[provider]/callback">) {
  const { provider } = await ctx.params;
  if (provider !== "mtn" && provider !== "airtel") return NextResponse.json({ error: "unknown provider" }, { status: 404 });

  const body = (await req.json().catch(() => ({}))) as {
    externalId?: string;
    referenceId?: string;
    transaction?: { id?: string };
  };
  const ref = req.headers.get("x-reference-id") ?? body.referenceId ?? body.transaction?.id;
  let id = ref ? (await findByProviderRef(ref))?.id : undefined;
  // MTN echoes our externalId, which is the payment request id.
  if (!id && body.externalId && /^[0-9a-f-]{36}$/.test(body.externalId)) id = body.externalId;
  if (id) await syncPayment(id).catch((e) => console.error("[payments] callback sync failed", id, e));
  return NextResponse.json({ received: true });
}

export const POST = handle;
export const PUT = handle;
