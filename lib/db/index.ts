import "server-only";

import { attachDatabasePool } from "@vercel/functions";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

import * as schema from "./schema";
import * as authSchema from "./auth-schema";

const globalForDb = globalThis as unknown as { pgPool?: Pool };

// One pool per server instance; reused across hot reloads in dev.
const pool =
  globalForDb.pgPool ??
  new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 5,
    idleTimeoutMillis: 10_000,
  });

if (process.env.NODE_ENV !== "production") globalForDb.pgPool = pool;

// Lets Vercel Fluid compute close idle connections before suspending the instance.
attachDatabasePool(pool);

export const db = drizzle(pool, { schema: { ...schema, ...authSchema } });
export type Db = typeof db;
export { schema };
