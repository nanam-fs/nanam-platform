import { Card, PageHeader } from "@/components/console/ui";
import { requireStaff } from "@/lib/auth";
import { mtnSandboxNumbers, providerFor } from "@/lib/momo";
import { Lab } from "./lab";

export const metadata = { title: "Payments lab" };

export default async function PaymentsLab() {
  await requireStaff("payments.lab");
  const modes = { mtn: providerFor("mtn")?.mode ?? "off", airtel: providerFor("airtel")?.mode ?? "off" };
  return (
    <>
      <PageHeader title="Payments lab" description="Test MTN MoMo and Airtel Money end to end against their sandboxes. Lab payments never touch a loan, and live mode is blocked here." />
      <Lab modes={modes} mtnNumbers={[...mtnSandboxNumbers]} />
      <Card title="Setting up the sandboxes" className="mt-6">
        <ol className="list-decimal space-y-2 pl-5 text-sm text-ink/80">
          <li>
            <strong>MTN:</strong> create an account at momodeveloper.mtn.com, subscribe to <em>Collections</em>, copy the primary key, then run{" "}
            <code className="rounded bg-sand px-1.5 py-0.5">MTN_MOMO_SUBSCRIPTION_KEY=… npm run momo:mtn-sandbox</code>. It creates the sandbox API user and key and writes them to <code>.env.local</code>. Sandbox amounts are in EUR.
          </li>
          <li>
            <strong>Airtel:</strong> create an application at developers.airtel.ug (or developers.airtel.africa), generate staging keys, and set <code>AIRTEL_CLIENT_ID</code> and <code>AIRTEL_CLIENT_SECRET</code> (staging host <code>openapiuat.airtel.ug</code> is the default).
          </li>
          <li>Restart the server. Each network shows <em>sandbox</em> above once its keys are working; without keys it uses the built-in simulator.</li>
        </ol>
      </Card>
    </>
  );
}
