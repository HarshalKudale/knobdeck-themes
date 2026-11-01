// Builds the release assets into out/: <id>.zip (the theme folder's contents at the zip root) and
// registry.json describing them all. Previews are not assets: each entry's `preview` is a raw GitHub
// link to previews/<id>.gif in this repo, so changing a GIF needs no release.
//   node scripts/build-registry.mjs <release tag> [dir holding the previous release's assets]
// index.json lists every theme's version (it must equal `version` in the theme's theme.json, default
// 1.0.0). A theme whose version equals the previous release's is copied over from it, not rebuilt.
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const RAW = "https://raw.githubusercontent.com/HarshalKudale/knobdeck-themes/master";
const [tag, prevDir] = process.argv.slice(2);
if (!tag) throw new Error("usage: build-registry.mjs <tag> [prev dir]");
const index = JSON.parse(readFileSync("index.json", "utf8"));
const prevPath = prevDir && `${prevDir}/registry.json`;
const prev = prevPath && existsSync(prevPath) ? JSON.parse(readFileSync(prevPath, "utf8")).themes : [];
rmSync("out", { recursive: true, force: true });
mkdirSync("out");

const ids = readdirSync("themes").sort();
for (const id of Object.keys(index)) if (!ids.includes(id)) throw new Error(`index.json lists ${id}, which has no themes/${id}`);
const themes = ids.map((id) => {
  if (!/^[a-z0-9-]+$/.test(id)) throw new Error(`bad theme id: ${id}`);
  if (!existsSync(`themes/${id}/theme.css`)) throw new Error(`${id}: no theme.css`);
  const desc = JSON.parse(readFileSync(`themes/${id}/theme.json`, "utf8"));
  if (!Array.isArray(desc.layers)) throw new Error(`${id}: theme.json has no layers`);
  const version = desc.version ?? "1.0.0";
  if (index[id]?.version !== version) throw new Error(`${id}: index.json says ${index[id]?.version}, themes/${id}/theme.json says ${version}`);

  const preview = existsSync(`previews/${id}.gif`) ? `${RAW}/previews/${id}.gif` : null;
  const old = prev.find((t) => t.id === id);
  if (old?.version === version && existsSync(`${prevDir}/${old.zip}`)) {
    copyFileSync(`${prevDir}/${old.zip}`, `out/${old.zip}`);
    return { ...old, preview };
  }
  const zip = resolve("out", `${id}.zip`);
  execFileSync("zip", ["-qr", zip, "."], { cwd: `themes/${id}` });
  return {
    id,
    name: desc.name ?? id,
    author: desc.author ?? "",
    version,
    zip: `${id}.zip`,
    sha256: createHash("sha256").update(readFileSync(zip)).digest("hex"),
    preview,
  };
});
writeFileSync("out/registry.json", JSON.stringify({ tag, themes }, null, 2) + "\n");
console.log(`${themes.length} theme(s) for ${tag}`);
