import { describe, expect, it } from "vitest";
import { normalizePhoneNumber } from "./phoneNumber";

describe("normalizePhoneNumber", () => {
  it.each(["09171234567", "0917 123 4567", "639171234567", "+63 (917) 123-4567"])(
    "normalizes %s to the same Philippine number",
    (input) => expect(normalizePhoneNumber(input)).toBe("+639171234567"),
  );

  it("accepts another country code", () => {
    expect(normalizePhoneNumber("+1 (650) 555-0100")).toBe("+16505550100");
  });

  it.each(["user@example.com", "12345", "0917123456", "+00123456789", "+1234567890123456"])(
    "rejects %s",
    (input) => expect(normalizePhoneNumber(input)).toBeNull(),
  );
});
