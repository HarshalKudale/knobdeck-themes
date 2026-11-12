// Renders dial themes with the real KnobDeck engine in a headless Chromium browser.
//
//   node scripts/preview/preview.mjs gif   [id...]   previews/<id>.gif (the registry preview)
//   node scripts/preview/preview.mjs check [id...]   out/check/<id>.png: 4/8/12 items, long labels,
//                                                    an open submenu, hovered and idle states,
//                                                    an open slider at rest and while a value is hovered
//   node scripts/preview/preview.mjs presets [id...] out/check/<id>-presets.png: every preset, hovered,
//                                                    and with a slider open
//   node scripts/preview/preview.mjs serve [id]      a local page to try a theme with the mouse
//
// No ids = every theme in themes/. `knobdeck-dark` / `knobdeck-light` are the app's built-ins
// (../Knobdeck/app/public/dial-themes). Needs the workspace layout (../Knobdeck with
// `npm install` done in app/, ../knobdeck-launch-video for Playwright), ffmpeg for gifs, and a
// Chromium-based browser: set BROWSER=/path/to/chrome, otherwise brave/chromium/chrome on PATH.
import { execFileSync, spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { createServer } from "node:http";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { dirname, extname, join, normalize, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(here, "..", "..");
const WORKSPACE = resolve(REPO, "..");
const APP = join(WORKSPACE, "Knobdeck", "app");
const ENGINE = join(APP, "src", "dial", "overlay");
const BUILTIN_DIR = join(APP, "public", "dial-themes");
const THEMES_DIR = join(REPO, "themes");
const BUILTINS = ["knobdeck-dark", "knobdeck-light"];

const requireApp = createRequire(join(APP, "package.json"));
const esbuild = requireApp("esbuild");
const { chromium } = createRequire(join(WORKSPACE, "knobdeck-launch-video", "package.json"))("playwright");

const [mode = "check", ...args] = process.argv.slice(2);
const allIds = readdirSync(THEMES_DIR).filter((d) => existsSync(join(THEMES_DIR, d, "theme.json"))).sort();
const ids = args.length ? args : allIds;
const themeDir = (id) => (BUILTINS.includes(id) ? join(BUILTIN_DIR, id) : join(THEMES_DIR, id));

// ── bundle + serve ──────────────────────────────────────────────────────────────

const ICON_NAMES = ["sparkles", "play", "skip-forward", "skip-back", "folder", "download", "file-text", "monitor",
  "image", "camera", "mic-off", "lock", "volume-2", "copy", "clipboard-paste", "save", "search", "undo-2", "redo-2", "zoom-in"];
const lucideDir = join(dirname(requireApp.resolve("lucide-static/package.json")), "icons");
const icons = Object.fromEntries(ICON_NAMES.map((n) => [n, readFileSync(join(lucideDir, `${n}.svg`), "utf8")]));

const bundle = (await esbuild.build({
  entryPoints: [join(here, "harness.js")],
  bundle: true,
  write: false,
  format: "esm",
  alias: { ENGINE, "@": join(APP, "src") },
  loader: { ".css": "text" },
})).outputFiles[0].text;

const page = (bg) => `<!doctype html><meta charset="utf-8">
<style>html,body{margin:0;height:100%;overflow:hidden}
body{font-family:-apple-system,BlinkMacSystemFont,"Inter","Segoe UI",system-ui,sans-serif}
/* The engine forces html/body transparent (the dial window is see-through), so the wallpaper is its own layer. */
#wallpaper{position:fixed;inset:0;z-index:-10;background:${bg}}</style>
<body class="dial-body"><div id="wallpaper"></div><div id="kando-menu" class="hidden"></div>
<script>window.ICONS=${JSON.stringify(icons)}</script><script type="module" src="/harness.js"></script>`;

const TYPES = { ".json": "application/json", ".css": "text/css", ".svg": "image/svg+xml", ".png": "image/png",
  ".webp": "image/webp", ".woff2": "font/woff2", ".jpg": "image/jpeg" };

const server = createServer((req, res) => {
  const url = new URL(req.url, "http://x");
  if (url.pathname === "/") {
    res.setHeader("content-type", "text/html");
    return res.end(page(url.searchParams.get("bg") ?? "#555"));
  }
  if (url.pathname === "/favicon.ico") {
    res.statusCode = 204;
    return res.end();
  }
  if (url.pathname === "/harness.js") {
    res.setHeader("content-type", "text/javascript");
    return res.end(bundle);
  }
  const m = url.pathname.match(/^\/themes\/([a-z0-9-]+)\/(.+)$/);
  if (m) {
    const base = themeDir(m[1]);
    const file = normalize(join(base, decodeURIComponent(m[2])));
    if (file.startsWith(base) && existsSync(file)) {
      res.setHeader("content-type", TYPES[extname(file)] ?? "application/octet-stream");
      return res.end(readFileSync(file));
    }
  }
  res.statusCode = 404;
  res.end();
});
await new Promise((r) => server.listen(0, "127.0.0.1", r));
const ORIGIN = `http://127.0.0.1:${server.address().port}`;

// The page behind a theme: its `previewBackground`, else a mid-grey wallpaper-like gradient.
const background = (id) => JSON.parse(readFileSync(join(themeDir(id), "theme.json"), "utf8")).previewBackground
  ?? "radial-gradient(circle at 30% 20%, #6b7280, #374151)";

if (mode === "serve") {
  const id = args[0] ?? allIds[0];
  console.log(`${ORIGIN}/?bg=${encodeURIComponent(background(id))}  then: await harness.load("${id}"); harness.show()`);
  await new Promise(() => {});
}

// ── browser ─────────────────────────────────────────────────────────────────────

function findBrowser() {
  if (process.env.BROWSER) return process.env.BROWSER;
  for (const b of ["brave", "chromium", "google-chrome", "google-chrome-stable", "chrome"]) {
    const r = spawnSync("which", [b], { encoding: "utf8" });
    if (r.status === 0) return r.stdout.trim();
  }
  throw new Error("no Chromium-based browser found; set BROWSER");
}
const browser = await chromium.launch({ executablePath: findBrowser(), headless: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function open(id, size, dpr = 2, preset = null) {
  const ctx = await browser.newContext({ viewport: { width: size, height: size }, deviceScaleFactor: dpr });
  const p = await ctx.newPage();
  const errors = [];
  p.on("pageerror", (e) => errors.push(String(e)));
  p.on("console", (m) => m.type() === "error" && errors.push(m.text()));
  await p.goto(`${ORIGIN}/?bg=${encodeURIComponent(background(id))}`);
  await p.waitForSelector("body[data-ready]");
  await p.evaluate(([id, preset]) => window.harness.load(id, preset), [id, preset]);
  return { p, ctx, errors };
}

/** Pointer on a circle of radius r around the center, at `deg` (0 = up, clockwise). */
const at = (size, r, deg) => ({
  x: size / 2 + r * Math.sin((deg * Math.PI) / 180),
  y: size / 2 - r * Math.cos((deg * Math.PI) / 180),
});

async function gif(id) {
  const SIZE = 440;
  const { p, ctx, errors } = await open(id, SIZE);
  const dir = join(tmpdir(), `knobdeck-preview-${id}`);
  rmSync(dir, { recursive: true, force: true });
  mkdirSync(dir);
  let n = 0;
  const frame = async () => p.screenshot({ path: join(dir, `${String(n++).padStart(3, "0")}.png`) });

  await p.mouse.move(SIZE / 2, SIZE / 2);
  await p.evaluate(() => window.harness.show());
  await sleep(350);
  for (let i = 0; i < 6; i++) { await frame(); await sleep(60); } // idle
  // Sweep once around the ring, then rest on one item.
  for (let deg = 0; deg <= 360; deg += 12) {
    const q = at(SIZE, 95, deg);
    await p.mouse.move(q.x, q.y);
    await sleep(50);
    await frame();
  }
  for (let i = 0; i < 6; i++) { await frame(); await sleep(60); }
  await ctx.close();
  if (errors.length) console.warn(`${id}: page errors:\n  ${errors.join("\n  ")}`);

  mkdirSync(join(REPO, "previews"), { recursive: true });
  const out = join(REPO, "previews", `${id}.gif`);
  execFileSync("ffmpeg", ["-y", "-loglevel", "error", "-framerate", "12", "-i", join(dir, "%03d.png"),
    "-vf", "scale=360:360:flags=lanczos,split[a][b];[a]palettegen=max_colors=128:stats_mode=diff[p];[b][p]paletteuse=dither=sierra2_4a:diff_mode=rectangle",
    "-loop", "0", out]);
  rmSync(dir, { recursive: true, force: true });
  console.log(`previews/${id}.gif`);
}

async function check(id) {
  const SIZE = 420;
  const shots = [];
  const cases = [
    ["sample idle", null, null],
    ["sample hover", null, 50],
    ["submenu open", null, "submenu"],
    ["4 items", 4, 90],
    ["8 items", 8, 45],
    ["12 items", 12, 30],
    ["long labels", -6, 60],
    ["slider", "slider", null],
    ["slider hover", "slider", 60],
    ["slider 0-10", "slider-coarse", null],
    // Classes the engine sets briefly or not yet: a committed click, a toggle in its warning state.
    ["clicked + kd-warn", null, "lit"],
  ];
  const errors = [];
  for (const [label, n, hover] of cases) {
    const { p, ctx, errors: e } = await open(id, SIZE, 1);
    await p.mouse.move(SIZE / 2, SIZE / 2);
    let sliderCenter = null;
    if (n === "slider") sliderCenter = await p.evaluate(() => window.harness.slider(40));
    else if (n === "slider-coarse") sliderCenter = await p.evaluate(() => window.harness.slider(7, { min: 0, max: 10, step: 1 }));
    else await p.evaluate(([n]) => window.harness.show(n == null ? undefined : window.harness.sized(Math.abs(n), n < 0)), [n]);
    await sleep(300);
    if (sliderCenter) {
      await sleep(300);
      if (hover != null) {
        const d = at(0, 95, hover);
        await p.mouse.move(sliderCenter.x + d.x, sliderCenter.y + d.y, { steps: 6 });
      }
    } else if (hover === "submenu") {
      // "Folders" is the third of seven items: ~103°.
      const q = at(SIZE, 110, 103);
      await p.mouse.move(q.x, q.y, { steps: 6 });
      await p.mouse.down(); await p.mouse.up();
      await sleep(450);
      const r = at(SIZE, 150, 140);
      await p.mouse.move(r.x, r.y, { steps: 6 });
    } else if (hover === "lit") {
      const q = at(SIZE, 100, 50);
      await p.mouse.move(q.x, q.y, { steps: 6 });
      await sleep(300);
      await p.evaluate(() => {
        document.querySelector(".menu-node.child.hovered")?.classList.add("clicked");
        document.querySelector('.menu-node.child[data-name="Mute Mic"]')?.classList.add("kd-warn");
      });
    } else if (hover != null) {
      const q = at(SIZE, 100, hover);
      await p.mouse.move(q.x, q.y, { steps: 6 });
    }
    await sleep(500);
    shots.push({ label, png: (await p.screenshot()).toString("base64") });
    errors.push(...e);
    await ctx.close();
  }
  // One contact sheet per theme.
  const ctx = await browser.newContext({ viewport: { width: SIZE * 4, height: SIZE * Math.ceil(shots.length / 4) + 40 } });
  const sheet = await ctx.newPage();
  await sheet.setContent(`<body style="margin:0;display:grid;grid-template-columns:repeat(4,${SIZE}px);background:#111;font:12px sans-serif;color:#ccc">
    ${shots.map((s) => `<figure style="margin:0;position:relative"><img src="data:image/png;base64,${s.png}" width="${SIZE}" height="${SIZE}"><figcaption style="position:absolute;top:4px;left:6px">${s.label}</figcaption></figure>`).join("")}
    <p style="grid-column:1/-1;margin:8px">${id}${errors.length ? " — ERRORS: " + errors.join(" | ") : ""}</p></body>`);
  mkdirSync(join(REPO, "out", "check"), { recursive: true });
  await sheet.screenshot({ path: join(REPO, "out", "check", `${id}.png`), fullPage: true });
  await ctx.close();
  console.log(`out/check/${id}.png${errors.length ? `  (${errors.length} page errors)` : ""}`);
}

async function presets(id) {
  const SIZE = 360;
  const names = [null, ...(JSON.parse(readFileSync(join(themeDir(id), "theme.json"), "utf8")).presets ?? [])];
  const shots = [];
  const sliders = [];
  for (const name of names) {
    const { p, ctx } = await open(id, SIZE, 1, name);
    await p.mouse.move(SIZE / 2, SIZE / 2);
    await p.evaluate(() => window.harness.show());
    await sleep(300);
    const q = at(SIZE, 95, 50);
    await p.mouse.move(q.x, q.y, { steps: 6 });
    await sleep(500);
    shots.push({ label: name ?? "Default", png: (await p.screenshot()).toString("base64") });
    // The same preset with a slider open and a value hovered.
    const c = await p.evaluate(() => window.harness.slider(40));
    await sleep(600);
    const d = at(0, 95, 60);
    await p.mouse.move(c.x + d.x, c.y + d.y, { steps: 6 });
    await sleep(400);
    sliders.push({ label: `${name ?? "Default"}, slider`, png: (await p.screenshot()).toString("base64") });
    await ctx.close();
  }
  shots.push(...sliders);
  const ctx = await browser.newContext({ viewport: { width: SIZE * names.length, height: SIZE * 2 } });
  const sheet = await ctx.newPage();
  await sheet.setContent(`<body style="margin:0;display:grid;grid-template-columns:repeat(${names.length},${SIZE}px);font:12px sans-serif;color:#fff">${shots.map((s) =>
    `<figure style="margin:0;position:relative"><img src="data:image/png;base64,${s.png}" width="${SIZE}" height="${SIZE}"><figcaption style="position:absolute;top:4px;left:6px;text-shadow:0 0 3px #000">${s.label}</figcaption></figure>`).join("")}</body>`);
  mkdirSync(join(REPO, "out", "check"), { recursive: true });
  await sheet.screenshot({ path: join(REPO, "out", "check", `${id}-presets.png`) });
  await ctx.close();
  console.log(`out/check/${id}-presets.png`);
}

try {
  for (const id of ids) await (mode === "gif" ? gif(id) : mode === "presets" ? presets(id) : check(id));
} finally {
  await browser.close();
  server.close();
}
