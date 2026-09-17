import { boolean, pgSchema, text, timestamp, uuid } from "drizzle-orm/pg-core";

// Read-only mirror of the Neon Auth user table. This file is deliberately NOT
// part of drizzle.config.ts so migrations never touch the neon_auth schema.
const neonAuth = pgSchema("neon_auth");

export const authUsers = neonAuth.table("user", {
  id: uuid("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull(),
  emailVerified: boolean("emailVerified").notNull(),
  image: text("image"),
  role: text("role"),
  banned: boolean("banned"),
  createdAt: timestamp("createdAt", { withTimezone: true }).notNull(),
});
