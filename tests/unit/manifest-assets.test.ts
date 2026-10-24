import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

// [L1] The manifest is what Office and Marketplace read: its icons must exist at the sizes it
// declares, and the product name must be the same wherever a user sees it.

const repo = resolve(import.meta.dirname, "../..");
const manifest = readFileSync(resolve(repo, "manifest.xml"), "utf8");
const assetsDir = resolve(repo, "src/app/public/assets");

/** Office's recommended ribbon icon sizes that the add-in only manifest accepts. */
const RIBBON_SIZES = [16, 20, 24, 32, 40, 48, 64, 80];

/** The first capture group of `pattern` in manifest.xml, or a failure naming `what`. */
function capture(pattern: RegExp, what: string): string {
  const value = pattern.exec(manifest)?.[1];
  if (value === undefined) throw new Error(`manifest.xml has no ${what}`);
  return value;
}

function defaultValue(element: string): string {
  return capture(new RegExp(`<${element}\\b[^>]*\\bDefaultValue="([^"]*)"`), `<${element} DefaultValue="…">`);
}

function shortString(id: string): string {
  return capture(new RegExp(`<bt:String id="${id}" DefaultValue="([^"]*)"`), `short string ${id}`);
}

function assetFile(url: string): string {
  const name = /\/assets\/([^/]+)$/.exec(url)?.[1];
  if (!name) throw new Error(`${url} is not under /assets/`);
  return resolve(assetsDir, name);
}

/** Width and height from a PNG's IHDR chunk. */
function pngSize(file: string): { width: number; height: number } {
  const bytes = readFileSync(file);
  const signature = "89504e470d0a1a0a";
  if (bytes.subarray(0, 8).toString("hex") !== signature) throw new Error(`${file} is not a PNG`);
  return { width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20) };
}

function expectSquarePng(url: string, size: number): void {
  const file = assetFile(url);
  expect(existsSync(file), `${url} is referenced by manifest.xml but ${file} is missing`).toBe(true);
  expect(pngSize(file), `${url} should be ${size}×${size}`).toEqual({ width: size, height: size });
}

/** The <Icon> blocks of the ribbon group and of each button, keyed by the owner's id. */
function ribbonIcons(): Map<string, Map<number, string>> {
  const icons = new Map<string, Map<number, string>>();
  const owners = /<(Group|Control)\b[^>]*\bid="([^"]+)"[^>]*>([\s\S]*?)<\/Icon>/g;
  for (const [, , id = "", body = ""] of manifest.matchAll(owners)) {
    const sizes = new Map<number, string>();
    for (const [, size, resid = ""] of body.matchAll(/<bt:Image size="(\d+)" resid="([^"]+)"\/>/g)) {
      sizes.set(Number(size), resid);
    }
    icons.set(id, sizes);
  }
  return icons;
}

function imageUrl(resid: string): string {
  const id = resid.replace(".", "\\.");
  return capture(new RegExp(`<bt:Image id="${id}" DefaultValue="([^"]+)"`), `image resource ${resid}`);
}

describe("manifest icons", () => {
  it("has a 32 px product icon and a 64 px high-resolution one, as Marketplace requires", () => {
    expectSquarePng(defaultValue("IconUrl"), 32);
    expectSquarePng(defaultValue("HighResolutionIconUrl"), 64);
  });

  it("gives the ribbon group and every button an icon at each recommended size", () => {
    const icons = ribbonIcons();
    expect([...icons.keys()].sort()).toEqual(["RadCut.CrossReference", "RadCut.Group", "RadCut.Settings"]);
    for (const [owner, sizes] of icons) {
      expect([...sizes.keys()].sort((a, b) => a - b), `${owner} icon sizes`).toEqual(RIBBON_SIZES);
    }
  });

  it("points every ribbon image at a PNG of the size it is declared as", () => {
    for (const sizes of ribbonIcons().values()) {
      for (const [size, resid] of sizes) expectSquarePng(imageUrl(resid), size);
    }
  });

  it("uses a different picture for Settings than for Cross-reference", () => {
    const icons = ribbonIcons();
    expect(imageUrl(icons.get("RadCut.Settings")!.get(32)!)).not.toBe(
      imageUrl(icons.get("RadCut.CrossReference")!.get(32)!),
    );
  });
});

describe("product name", () => {
  const name = defaultValue("DisplayName");

  it("is plain text of at most 30 characters, so it can be typed and searched", () => {
    expect(name.length).toBeLessThanOrEqual(30);
    expect(name).toMatch(/^[A-Za-z0-9 ]+$/);
  });

  it("is the ribbon group's label and the task pane's title", () => {
    expect(shortString("Group.Label")).toBe(name);
    expect(shortString("GetStarted.Title")).toBe(`${name} is ready`);
    const taskpane = readFileSync(resolve(repo, "src/app/taskpane.html"), "utf8");
    expect(/<title>([^<]*)<\/title>/.exec(taskpane)?.[1]).toBe(name);
  });

  it("names the settings shortcut action", () => {
    const shortcuts = JSON.parse(readFileSync(resolve(repo, "src/app/shortcuts.json"), "utf8")) as {
      actions: { id: string; name: string }[];
    };
    expect(shortcuts.actions.find((action) => action.id === "OpenSettings")?.name).toBe(`Open ${name} settings`);
  });
});
