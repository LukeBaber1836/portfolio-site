import "server-only";

import { eq } from "drizzle-orm";

import { db } from "@/lib/db";
import { settings, type Settings } from "@/lib/db/schema";

/** Singleton settings row; created with defaults on first read. */
export async function getSettings(): Promise<Settings> {
  const [row] = await db.select().from(settings).where(eq(settings.id, 1));
  if (row) return row;
  const [created] = await db.insert(settings).values({ id: 1 }).onConflictDoNothing().returning();
  return created ?? (await db.select().from(settings).where(eq(settings.id, 1)))[0]!;
}
