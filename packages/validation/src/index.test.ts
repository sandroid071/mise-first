import { describe, expect, it } from "vitest";
import { signUpSchema } from "./index.js";
describe("identity validation", () => {
  it("requires a long password", () => expect(signUpSchema.safeParse({ email: "chef@mise.test", name: "Chef", password: "short" }).success).toBe(false));
  it("accepts a valid sign-up", () => expect(signUpSchema.safeParse({ email: "chef@mise.test", name: "Chef", password: "a-safe-password" }).success).toBe(true));
});
