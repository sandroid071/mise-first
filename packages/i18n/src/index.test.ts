import { describe, expect, it } from "vitest";
import { directionFor, formatMoney } from "./index.js";
describe("localization", () => {
  it("uses RTL for Arabic", () => expect(directionFor("ar")).toBe("rtl"));
  it("formats money with the locale currency", () => expect(formatMoney(12500, "INR", "en")).toContain("125"));
});
