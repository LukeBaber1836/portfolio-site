import { sql } from "drizzle-orm";

import { BUSINESS_TZ } from "@/lib/format";

/**
 * Business timezone as an inline SQL literal. A bound parameter would make the
 * same expression in SELECT and GROUP BY/ORDER BY look different to Postgres.
 */
export const businessTzSql = sql.raw(`'${BUSINESS_TZ.replace(/'/g, "")}'`);
