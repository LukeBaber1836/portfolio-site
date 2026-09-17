import { describe, expect, it } from "vitest";

import { checkPasswordRules, validatePassword } from "./password";

describe("checkPasswordRules", () => {
  it("requires 12+ chars and all character classes", () => {
    expect(checkPasswordRules("Short1!").ok).toBe(false);
    expect(checkPasswordRules("alllowercase123!").ok).toBe(false);
    expect(checkPasswordRules("ALLUPPERCASE123!").ok).toBe(false);
    expect(checkPasswordRules("NoNumbersHere!!").ok).toBe(false);
    expect(checkPasswordRules("NoSymbols12345").ok).toBe(false);
    expect(checkPasswordRules("Granite-Canoe-47").ok).toBe(true);
  });

  it("rejects passwords containing the user's name or email", () => {
    const ctx = { email: "sarah.jones@acme.com", name: "Sarah Jones" };
    expect(checkPasswordRules("Sarah-Rocks-2026!", ctx).ok).toBe(false);
    expect(checkPasswordRules("xX-sarah.jones-Xx9", ctx).ok).toBe(false);
    expect(checkPasswordRules("Granite-Canoe-47", ctx).ok).toBe(true);
  });

  it("rejects passwords over 128 characters", () => {
    expect(checkPasswordRules("Aa1!" + "x".repeat(130)).ok).toBe(false);
  });
});

describe("validatePassword", () => {
  it("rejects guessable passwords that pass the character rules", async () => {
    const result = await validatePassword("Password1234!");
    expect(result.ok).toBe(false);
  });

  it("accepts a strong passphrase", async () => {
    const result = await validatePassword("Velvet-Harbor-Quartz-81");
    expect(result.ok).toBe(true);
  });
});
