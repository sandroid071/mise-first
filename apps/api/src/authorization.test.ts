import { describe, expect, it } from "vitest";
import { can } from "./authorization.js";
describe("role authorization", () => {
  it("does not grant staff an invitation permission", () => expect(can("staff", "team:invite")).toBe(false));
  it("grants owners audit access", () => expect(can("owner", "audit:read")).toBe(true));
});
