// Browser side of the preview tool: the real KnobDeck dial engine (bundled from
// ../Knobdeck/app/src/dial/overlay by preview.mjs) showing a sample menu.
// `window.harness.load(id, preset)` loads a theme served from /themes/<id>/.
import engineCss from "ENGINE/dial.css";
import { Menu } from "ENGINE/menu.js";
import { CenterText, MenuTheme } from "ENGINE/theme.js";

const ICONS = window.ICONS ?? {};
const item = (name, icon, extra) => ({ type: "button", name, icon, ...extra });

const SAMPLE = {
  type: "root", name: "Quick Actions", icon: "sparkles",
  children: [
    item("Play / Pause", "play"),
    item("Next Track", "skip-forward"),
    { type: "submenu", name: "Folders", icon: "folder", children: [
      item("Downloads", "download"), item("Documents", "file-text"),
      item("Desktop", "monitor"), item("Pictures", "image"),
    ] },
    item("Screenshot", "camera"),
    item("Mute Mic", "mic-off"),
    item("Lock Screen", "lock"),
    item("Volume", "volume-2"),
  ],
};

const style = document.createElement("style");
style.textContent = engineCss;
document.head.appendChild(style);

const container = document.getElementById("kando-menu");
const theme = new MenuTheme();
theme.createIcon = (it) => {
  const box = document.createElement("div");
  box.className = "icon-container";
  if (ICONS[it.icon]) box.innerHTML = ICONS[it.icon];
  return box;
};
const centerText = new CenterText(container);
let menu = null;

window.harness = {
  async load(id, preset) {
    await theme.load(`/themes/${id}`, preset);
    centerText.setDiameter(theme.centerTextWrapWidth);
    if (!menu) {
      menu = new Menu(container, theme, centerText, {});
      menu.pointerInput.modifierHeld = () => false;
      menu.onSelect = () => {};
      menu.onClose = () => {};
      menu.onMovePointer = () => {};
    }
  },
  show(menuDef = SAMPLE) {
    const c = { x: innerWidth / 2, y: innerHeight / 2 };
    menu.show(structuredClone(menuDef), { mousePosition: c, windowSize: { x: innerWidth, y: innerHeight } });
  },
  /** A menu with `n` buttons (layout stress tests). */
  sized(n, longLabels = false) {
    const names = ["Play", "Next", "Back", "Copy", "Paste", "Lock", "Mute", "Save", "Find", "Undo", "Redo", "Zoom"];
    const icons = ["play", "skip-forward", "skip-back", "copy", "clipboard-paste", "lock", "mic-off", "save", "search", "undo-2", "redo-2", "zoom-in"];
    return {
      type: "root", name: "Test", icon: "sparkles",
      children: Array.from({ length: n }, (_, i) =>
        item(longLabels ? `${names[i % 12]} the current selected window` : names[i % 12], icons[i % 12])),
    };
  },
};
document.body.dataset.ready = "1";
