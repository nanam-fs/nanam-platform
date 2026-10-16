"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import { CheckCircle2, Loader2, PlugZap, XCircle } from "lucide-react";
import { btn } from "@/components/console/action-form";
import { Badge, Card, CField, CInput, CSelect } from "@/components/console/ui";
import { labPing, labRequest, labStatus, type LabRequest } from "../../actions";

type Status = Awaited<ReturnType<typeof labStatus>>;
const modeTone = { live: "bad", sandbox: "good", simulator: "info", off: "neutral" } as const;

export function Lab({ modes, mtnNumbers }: { modes: Record<"mtn" | "airtel", string>; mtnNumbers: { msisdn: string; outcome: string }[] }) {
  const [state, action, pending] = useActionState(labRequest, {});
  const [network, setNetwork] = useState<"mtn" | "airtel">("mtn");
  const [msisdn, setMsisdn] = useState("46733123499");
  const [log, setLog] = useState<{ at: number; status: Status }[]>([]);
  const [ping, setPing] = useState<Record<string, { ok: boolean; detail: string }>>({});
  const [pinging, startPing] = useTransition();
  const req: LabRequest | undefined = state.request;

  useEffect(() => {
    if (!req) return;
    let stop = false;
    let t: ReturnType<typeof setTimeout>;
    const tick = async () => {
      const s = await labStatus(req);
      if (stop) return;
      setLog((l) => [...l, { at: Date.now(), status: s }]);
      if (s.status === "pending" && Date.now() - req.createdAt < 5 * 60_000) t = setTimeout(tick, 3000);
    };
    t = setTimeout(tick, 1500);
    return () => {
      stop = true;
      clearTimeout(t);
    };
  }, [req]);
  const final = log.at(-1)?.status;

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_1.3fr]">
      <div className="space-y-6">
        <Card title="Providers">
          <ul className="space-y-3">
            {(["mtn", "airtel"] as const).map((n) => (
              <li key={n} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-line p-3">
                <div>
                  <p className="flex items-center gap-2 font-medium">
                    <span className={n === "mtn" ? "size-2.5 rounded-full bg-yellow-400" : "size-2.5 rounded-full bg-red-600"} />
                    {n === "mtn" ? "MTN MoMo" : "Airtel Money"} <Badge tone={modeTone[modes[n] as keyof typeof modeTone]}>{modes[n]}</Badge>
                  </p>
                  {ping[n] && <p className={`mt-1 text-xs ${ping[n].ok ? "text-forest-700" : "text-red-700"}`}>{ping[n].detail}</p>}
                </div>
                <button
                  type="button"
                  disabled={pinging || modes[n] === "off"}
                  className={btn.secondary}
                  onClick={() => startPing(async () => {
                    const r = await labPing(n);
                    setPing((p) => ({ ...p, [n]: r }));
                  })}
                >
                  <PlugZap className="size-4" /> Test connection
                </button>
              </li>
            ))}
          </ul>
        </Card>

        <Card title="Send a test payment request">
          <form action={(fd) => { setLog([]); action(fd); }} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <CField label="Network" name="network">
                <CSelect name="network" value={network} onChange={(e) => setNetwork(e.target.value as "mtn" | "airtel")}>
                  <option value="mtn">MTN MoMo</option>
                  <option value="airtel">Airtel Money</option>
                </CSelect>
              </CField>
              <CField label="Amount" name="amount" hint={network === "mtn" && modes.mtn === "sandbox" ? "EUR in MTN sandbox" : "UGX"}>
                <CInput name="amount" type="number" min={1} defaultValue={1000} required />
              </CField>
            </div>
            <CField label="Payer number" name="msisdn" hint="Any number succeeds in MTN sandbox, except the scenario numbers below">
              <CInput name="msisdn" value={msisdn} onChange={(e) => setMsisdn(e.target.value)} required />
            </CField>
            {network === "mtn" && (
              <div className="flex flex-wrap gap-1.5">
                <button type="button" onClick={() => setMsisdn("46733123499")} className="rounded-full border border-line px-2.5 py-1 text-xs hover:bg-cream">Success</button>
                {mtnNumbers.map((n) => (
                  <button key={n.msisdn} type="button" onClick={() => setMsisdn(n.msisdn)} className="rounded-full border border-line px-2.5 py-1 text-xs hover:bg-cream">
                    {n.outcome}
                  </button>
                ))}
              </div>
            )}
            {state.error && <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>}
            <button disabled={pending} className={btn.primary}>{pending && <Loader2 className="size-4 animate-spin" />} Send request to pay</button>
          </form>
        </Card>
      </div>

      <Card title="Live result">
        {!req ? (
          <p className="text-sm text-muted">Send a request to watch it move through the provider in real time.</p>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              {!final || final.status === "pending" ? (
                <Loader2 className="size-6 animate-spin text-forest-600" />
              ) : final.status === "successful" ? (
                <CheckCircle2 className="size-6 text-forest-600" />
              ) : (
                <XCircle className="size-6 text-red-600" />
              )}
              <div>
                <p className="font-medium capitalize">{final?.status ?? "requested"}</p>
                <p className="text-xs text-muted">
                  {req.provider} · {req.mode} · ref <span className="font-mono">{req.providerRef}</span>
                </p>
              </div>
            </div>
            {final?.transactionId && <p className="text-sm">Transaction ID <span className="font-mono">{final.transactionId}</span></p>}
            {final?.reason && <p className="text-sm text-red-700">{final.reason}</p>}
            <ol className="space-y-2 border-l border-line pl-4 text-xs">
              <li>
                <span className="text-muted">{new Date(req.createdAt).toLocaleTimeString()}</span> request accepted
                <pre className="mt-1 overflow-x-auto rounded bg-cream p-2">{JSON.stringify(req.raw, null, 2)}</pre>
              </li>
              {log.map((l, i) => (
                <li key={i}>
                  <span className="text-muted">{new Date(l.at).toLocaleTimeString()}</span> status: <strong>{l.status.status}</strong>
                  {i === log.length - 1 && "raw" in l.status && l.status.raw !== undefined && (
                    <pre className="mt-1 overflow-x-auto rounded bg-cream p-2">{JSON.stringify(l.status.raw, null, 2)}</pre>
                  )}
                </li>
              ))}
            </ol>
          </div>
        )}
      </Card>
    </div>
  );
}
