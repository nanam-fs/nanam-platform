import { NextResponse } from "next/server";
import { customerName, getCustomer } from "@/lib/customer-auth";

/** Lets the (static) public website show the visitor's portal session in the header. Returns no personal data beyond a first name. */
export async function GET() {
  const customer = await getCustomer();
  const name = customer ? await customerName(customer.phone) : null;
  return NextResponse.json(
    { signedIn: !!customer, firstName: name?.split(" ")[0] ?? null },
    { headers: { "Cache-Control": "private, no-store" } },
  );
}
