"use client";

import { createAuthClient } from "@neondatabase/auth/next";

import { neverThrow } from "@/lib/auth/never-throw";

// Talks to our /api/auth/[...path] proxy, which forwards to Neon Managed Better Auth.
// neverThrow: failed requests resolve `{ data: null, error }` instead of rejecting (see never-throw.ts).
export const authClient = neverThrow(createAuthClient());
