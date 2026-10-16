import { NextResponse } from "next/server";
import { avatarSeed, customerName, getCustomer } from "@/lib/customer-auth";

/** Lets the (static) public website show the visitor's own portal session in the header. */
export async function GET() {
  const customer = await getCustomer();
  const name = customer ? await customerName(customer.phone) : null;
  return NextResponse.json(
    customer
      ? {
          signedIn: true,
          name,
          firstName: name?.split(" ")[0] ?? null,
          // Last three digits only, so the menu can say which number is signed in.
          phoneHint: `•••• ${customer.phone.slice(-3)}`,
          // Stable, non-reversible seed for the generated avatar.
          avatarSeed: avatarSeed(customer.phone),
        }
      : { signedIn: false },
    { headers: { "Cache-Control": "private, no-store" } },
  );
}

