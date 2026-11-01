// Builds the release assets into out/: <id>.zip (the theme folder's contents at the zip root),
// <id>.gif (its preview, when previews/<id>.gif exists) and registry.json describing them all.
//   node scripts/build-registry.mjs <release tag>
// A theme's version is the `version` field of its theme.json (default 1.0.0): bump it to ship an update.
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const tag = process.argv[2];
if (!tag) throw new Error("usage: build-registry.mjs <tag>");
rmSync("out", { recursive: true, force: true });
mkdirSync("out");

const themes = readdirSync("themes").sort().map((id) => {
  if (!/^[a-z0-9-]+$/.test(id)) throw new Error(`bad theme id: ${id}`);
  if (!existsSync(`themes/${id}/theme.css`)) throw new Error(`${id}: no theme.css`);
  const desc = JSON.parse(readFileSync(`themes/${id}/theme.json`, "utf8"));
  if (!Array.isArray(desc.layers)) throw new Error(`${id}: theme.json has no layers`);
  const zip = resolve("out", `${id}.zip`);
  execFileSync("zip", ["-qr", zip, "."], { cwd: `themes/${id}` });
  const hasPreview = existsSync(`previews/${id}.gif`);
  if (hasPreview) copyFileSync(`previews/${id}.gif`, `out/${id}.gif`);
  return {
    id,
    name: desc.name ?? id,
    author: desc.author ?? "",
    version: desc.version ?? "1.0.0",
    zip: `${id}.zip`,
    sha256: createHash("sha256").update(readFileSync(zip)).digest("hex"),
    preview: hasPreview ? `${id}.gif` : null,
  };
});
writeFileSync("out/registry.json", JSON.stringify({ tag, themes }, null, 2) + "\n");
console.log(`${themes.length} theme(s) for ${tag}`);
