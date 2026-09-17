import "server-only";

import { db } from "@/lib/db";
import { auditLog } from "@/lib/db/schema";

export async function audit(entry: {
  actorUserId?: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  metadata?: Record<string, unknown>;
}) {
  try {
    await db.insert(auditLog).values({
      actorUserId: entry.actorUserId ?? null,
      action: entry.action,
      entityType: entry.entityType,
      entityId: entry.entityId ?? null,
      metadata: entry.metadata,
    });
  } catch (err) {
    // Auditing must never block the underlying action.
    console.error("[audit] failed to record", entry.action, err);
  }
}
