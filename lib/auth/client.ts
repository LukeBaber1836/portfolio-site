"use client";

import { createAuthClient } from "@neondatabase/auth/next";

// Talks to our /api/auth/[...path] proxy, which forwards to Neon Managed Better Auth.
export const authClient = createAuthClient();
