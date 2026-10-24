// Renders the SVG masters in design/icons to the PNGs the manifest references.
// Output is committed so the app builds without rendering; run `npm run icons` after changing a master.
// Each ribbon icon has a 16 px master (used up to 24 px) and a 32 px master (32 px and up), because
// Office's Monoline line weights and padding change between those ranges.
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { Resvg } from "@resvg/resvg-js";

const masters = join(import.meta.dirname, "..", "design", "icons");
const out = join(import.meta.dirname, "..", "src", "app", "public", "assets");

const RIBBON_SIZES = [16, 20, 24, 32, 40, 48, 64, 80];

/** [master file, output name prefix, sizes] */
const jobs = [
  ["product.svg", "icon", [32, 64, 128]],
  ...["cross-reference", "settings"].flatMap((name) => [
    [`${name}-16.svg`, name, RIBBON_SIZES.filter((size) => size < 32)],
    [`${name}-32.svg`, name, RIBBON_SIZES.filter((size) => size >= 32)],
  ]),
];

let count = 0;
for (const [master, prefix, sizes] of jobs) {
  const svg = readFileSync(join(masters, master), "utf8");
  for (const size of sizes) {
    const png = new Resvg(svg, { fitTo: { mode: "width", value: size } }).render().asPng();
    writeFileSync(join(out, `${prefix}-${size}.png`), png);
    count++;
  }
}
console.log(`build-icons: wrote ${count} PNGs to ${out}`);
