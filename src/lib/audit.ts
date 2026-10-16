import "server-only";
import { db, schema, type Tx } from "@/db";

export async function audit(
  tx: Tx | typeof db,
  entry: { actorId: string | null; action: string; entity: string; entityId?: string; detail?: Record<string, unknown> },
) {
  await tx.insert(schema.auditLog).values({
    actorId: entry.actorId,
    action: entry.action,
    entity: entry.entity,
    entityId: entry.entityId ?? null,
    detail: entry.detail ?? {},
  });
}
