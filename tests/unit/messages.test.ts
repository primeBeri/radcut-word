import { describe, expect, it } from "vitest";
import { messageText } from "../../src/core/messages";

describe("messages", () => {
  it("explains a plain-text content control and how to replace one instead (FR-001a)", () => {
    const text = messageText("plainTextControl");
    expect(text).toMatch(/plain text content control/i);
    expect(text).toMatch(/select the whole control/i);
  });

  it("the decline hint names every place a reference can go (FR-001a)", () => {
    for (const id of ["comment", "unknown"] as const) {
      expect(messageText(id)).toMatch(/main text/);
      expect(messageText(id)).toMatch(/header/);
      expect(messageText(id)).toMatch(/text box/);
    }
  });

  it("the selection warning mentions content controls (FR-008a)", () => {
    expect(messageText("selectionWarning")).toMatch(/content control/);
  });
});
