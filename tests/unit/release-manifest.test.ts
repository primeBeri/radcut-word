import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { RELEASE_ID, RELEASE_ORIGIN, releaseManifest, releaseVersion } from "../../scripts/release-manifest";

// [L1] The release manifest is what users install: it must point only at the hosted site, carry
// the package's version, and use its own add-in Id so it can sit beside a development sideload.

const repo = resolve(import.meta.dirname, "../..");
const devManifest = readFileSync(resolve(repo, "manifest.xml"), "utf8");
const pkg = JSON.parse(readFileSync(resolve(repo, "package.json"), "utf8")) as { version: string };

describe("release manifest", () => {
  const release = releaseManifest(devManifest, pkg.version);

  it("points every URL that was on the dev server at the hosted site", () => {
    expect(release).not.toContain("localhost");
    expect(release).toContain(`<SourceLocation DefaultValue="${RELEASE_ORIGIN}/app/taskpane.html"/>`);
    expect(release).toContain(`<ExtendedOverrides Url="${RELEASE_ORIGIN}/shortcuts.json"/>`);
    expect(release).toContain(`<IconUrl DefaultValue="${RELEASE_ORIGIN}/assets/icon-32.png"/>`);
  });

  it("serves from HTTPS at the root of its own host", () => {
    expect(RELEASE_ORIGIN).toMatch(/^https:\/\/[a-z0-9.-]+$/);
  });

  it("has the package version in Office's four-part form", () => {
    expect(releaseVersion("0.1.0")).toBe("0.1.0.0");
    expect(releaseVersion("1.12.3")).toBe("1.12.3.0");
    expect(() => releaseVersion("1.2.3-beta.1")).toThrow(/version/);
    expect(release).toContain(`<Version>${releaseVersion(pkg.version)}</Version>`);
  });

  it("uses its own add-in Id, not the development one", () => {
    const devId = /<Id>([^<]+)<\/Id>/.exec(devManifest)?.[1];
    expect(devId).toBeDefined();
    expect(RELEASE_ID).not.toBe(devId);
    expect(release).toContain(`<Id>${RELEASE_ID}</Id>`);
    expect(release).not.toContain(devId!);
  });

  it("keeps everything else as it is", () => {
    const normalise = (xml: string) =>
      xml
        .replaceAll("https://localhost:3000", RELEASE_ORIGIN)
        .replace(/<Id>[^<]+<\/Id>/, "")
        .replace(/<Version>[^<]+<\/Version>/, "");
    expect(normalise(release)).toBe(normalise(devManifest));
  });
});
