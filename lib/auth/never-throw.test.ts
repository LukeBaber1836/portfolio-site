import { describe, expect, it } from "vitest";

import { neverThrow } from "./never-throw";

class AuthApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code: string,
  ) {
    super(message);
  }
}

function fakeClient() {
  const signIn = Object.assign(() => "callable", {
    email: async ({ password }: { password: string }) => {
      if (password !== "right") throw new AuthApiError("Invalid email or password", 401, "invalid_credentials");
      return { data: { user: { id: "u1" } }, error: null };
    },
  });
  return {
    signIn,
    admin: { impersonateUser: async () => Promise.reject("offline") },
    useSession: () => ({ data: null, isPending: false }),
    $store: { atoms: { session: { get: () => 42 } } },
    version: "1.0",
  };
}

describe("neverThrow", () => {
  it("turns rejected auth calls into { data: null, error } with status and message", async () => {
    const client = neverThrow(fakeClient());
    const res = await client.signIn.email({ password: "wrong" });
    expect(res.data).toBeNull();
    expect(res.error).toMatchObject({ message: "Invalid email or password", status: 401, code: "invalid_credentials" });
  });

  it("passes successful results through unchanged", async () => {
    const client = neverThrow(fakeClient());
    await expect(client.signIn.email({ password: "right" })).resolves.toEqual({ data: { user: { id: "u1" } }, error: null });
  });

  it("wraps non-Error rejections in an Error", async () => {
    const client = neverThrow(fakeClient());
    const res = (await client.admin.impersonateUser()) as unknown as { data: null; error: Error };
    expect(res.data).toBeNull();
    expect(res.error).toBeInstanceOf(Error);
    expect(res.error.message).toBe("offline");
  });

  it("leaves sync APIs (hooks, stores, callable namespaces, primitives) alone", () => {
    const client = neverThrow(fakeClient());
    expect(client.useSession()).toEqual({ data: null, isPending: false });
    expect(client.$store.atoms.session.get()).toBe(42);
    expect(client.signIn()).toBe("callable");
    expect(client.version).toBe("1.0");
  });

  it("returns stable references so hook dependencies don't churn", () => {
    const client = neverThrow(fakeClient());
    expect(client.signIn).toBe(client.signIn);
    expect(client.signIn.email).toBe(client.signIn.email);
  });
});
