export type Network = "mtn" | "airtel";

/** Uganda numbers → network by prefix (MTN 076–079, Airtel 070/074/075). */
export function detectNetwork(msisdn: string): Network | null {
  const local = msisdn.replace(/\D/g, "").slice(-9);
  if (/^7[6-9]/.test(local)) return "mtn";
  if (/^7[045]/.test(local)) return "airtel";
  return null;
}
