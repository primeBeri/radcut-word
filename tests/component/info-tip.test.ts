import { fireEvent, render, screen } from "@testing-library/svelte";
import { describe, expect, it, vi } from "vitest";
import InfoTip from "../../src/ui/settings/InfoTip.svelte";

const TEXT = "Start the palette on the format you last inserted with.";

function setup() {
  const outer = vi.fn();
  document.addEventListener("keydown", outer);
  const result = render(InfoTip, { props: { id: "tip", label: "remembering", text: TEXT } });
  const button = screen.getByRole("button", { name: "About remembering" });
  const tip = () => document.getElementById("tip")!;
  return { ...result, button, tip, outer };
}

describe("info button (FR-021a, contracts/palette-ui.md)", () => {
  it("keeps the description in the DOM, hidden, for aria-describedby", () => {
    const { tip, button } = setup();
    expect(tip()).toHaveTextContent(TEXT);
    expect(tip()).toHaveAttribute("role", "tooltip");
    expect(tip()).not.toBeVisible();
    expect(button).toHaveAttribute("aria-expanded", "false");
    expect(button).toHaveAttribute("aria-controls", "tip");
  });

  it("shows on hover and hides when the pointer leaves", async () => {
    const { tip, button } = setup();
    await fireEvent.mouseEnter(button);
    expect(tip()).toBeVisible();
    await fireEvent.mouseLeave(button);
    expect(tip()).not.toBeVisible();
  });

  it("shows on focus and hides on blur", async () => {
    const { tip, button } = setup();
    await fireEvent.focus(button);
    expect(tip()).toBeVisible();
    expect(button).toHaveAttribute("aria-expanded", "true");
    await fireEvent.blur(button);
    expect(tip()).not.toBeVisible();
  });

  it("click pins it open and clicking again closes it", async () => {
    const { tip, button } = setup();
    await fireEvent.click(button);
    expect(tip()).toBeVisible();
    await fireEvent.click(button);
    expect(tip()).not.toBeVisible();
  });

  it("Esc hides it without reaching the settings view, and does nothing when it is hidden", async () => {
    const { tip, button, outer } = setup();
    await fireEvent.focus(button);
    await fireEvent.keyDown(button, { key: "Escape" });
    expect(tip()).not.toBeVisible();
    expect(outer).not.toHaveBeenCalled();
    await fireEvent.keyDown(button, { key: "Escape" });
    expect(outer).toHaveBeenCalledOnce();
    // Shown again once focus leaves and comes back.
    await fireEvent.blur(button);
    await fireEvent.focus(button);
    expect(tip()).toBeVisible();
    document.removeEventListener("keydown", outer);
  });
});
