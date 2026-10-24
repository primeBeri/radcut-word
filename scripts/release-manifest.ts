// Writes dist/manifest.xml, the manifest users install: manifest.xml with every dev-server URL on
// the hosted site, the package version, and the release add-in Id. Run after `vite build`.
// The release has its own Id so the owner can keep a development sideload (`npm start`, the
// desktop harness) beside an installed release; Word would otherwise load one Id from two places.
import { readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";

/** GitHub Pages, custom domain (DNS: CNAME xref.radberi.co.uk → primeberi.github.io). */
export const RELEASE_ORIGIN = "https://xref.radberi.co.uk";
export const RELEASE_ID = "38215e7b-167d-4e11-97d8-dd399b066d59";
const DEV_ORIGIN = "https://localhost:3000";

/** Office wants a four-part version; prereleases have no place in it. */
export function releaseVersion(version: string): string {
  if (!/^\d+\.\d+\.\d+$/.test(version)) throw new Error(`release-manifest: package version ${version} is not major.minor.patch`);
  return `${version}.0`;
}

export function releaseManifest(xml: string, version: string): string {
  const release = xml
    .replaceAll(DEV_ORIGIN, RELEASE_ORIGIN)
    .replace(/<Id>[^<]+<\/Id>/, `<Id>${RELEASE_ID}</Id>`)
    .replace(/<Version>[^<]+<\/Version>/, `<Version>${releaseVersion(version)}</Version>`);
  if (release.includes("localhost")) throw new Error("release-manifest: a localhost URL is left in the manifest");
  return release;
}

if (process.argv[1] && resolve(process.argv[1]) === import.meta.filename) {
  const repo = join(import.meta.dirname, "..");
  const { version } = JSON.parse(readFileSync(join(repo, "package.json"), "utf8")) as { version: string };
  const out = join(repo, "dist", "manifest.xml");
  writeFileSync(out, releaseManifest(readFileSync(join(repo, "manifest.xml"), "utf8"), version));
  console.log(`release-manifest: ${out} for ${RELEASE_ORIGIN}, version ${releaseVersion(version)}`);
}
