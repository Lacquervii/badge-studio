"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/main.ts
var main_exports = {};
__export(main_exports, {
  BadgePlugin: () => BadgePlugin,
  default: () => main_default
});
module.exports = __toCommonJS(main_exports);
var import_obsidian10 = require("obsidian");

// src/drop.ts
var import_view = require("@codemirror/view");

// src/core/parse.ts
var MARKER_RE = /^\s*badge\s*[:：]\s*(.+?)\s*$/;
function parseBadgeMarker(line) {
  const m = MARKER_RE.exec(line);
  return m ? m[1] : null;
}
function findMarkerRuns(lines) {
  const runs = [];
  let cur = null;
  lines.forEach((line, i) => {
    const name = parseBadgeMarker(line);
    if (name !== null) {
      if (cur && cur.endLine === i - 1) {
        cur.endLine = i;
        cur.names.push(name);
      } else {
        cur = { startLine: i, endLine: i, names: [name] };
        runs.push(cur);
      }
    }
  });
  return runs;
}
function markerText(badgeName) {
  return `badge: ${badgeName}`;
}

// src/drop.ts
var BADGE_MIME = "application/x-badge-studio";
function registerBadgeDrop(plugin) {
  plugin.registerEditorExtension(
    import_view.EditorView.domEventHandlers({
      drop(event, view) {
        var _a, _b;
        const name = (_a = event.dataTransfer) == null ? void 0 : _a.getData(BADGE_MIME);
        if (!name) return false;
        event.preventDefault();
        event.stopPropagation();
        const pos = (_b = view.posAtCoords({ x: event.clientX, y: event.clientY })) != null ? _b : view.state.selection.main.head;
        const line = view.state.doc.lineAt(pos);
        const marker = markerText(name);
        if (line.text.trim() === "") {
          view.dispatch({
            changes: { from: line.from, to: line.to, insert: marker + "\n" },
            selection: { anchor: line.from + marker.length + 1 },
            userEvent: "input.drop"
          });
        } else {
          view.dispatch({
            changes: { from: line.to, insert: "\n" + marker + "\n" },
            selection: { anchor: line.to + marker.length + 2 },
            userEvent: "input.drop"
          });
        }
        view.focus();
        setTimeout(() => view.focus(), 0);
        return true;
      }
    })
  );
}

// src/freeze.ts
var import_obsidian = require("obsidian");

// src/core/resolve.ts
function classifyLink(link) {
  const t = link.trim();
  if (t === "") return { kind: "none" };
  if (/^https?:\/\//i.test(t)) return { kind: "url", url: t };
  return { kind: "note", name: t };
}

// src/freeze.ts
async function embedFor(plugin, name, sourcePath) {
  const app = plugin.app;
  const badge = plugin.store.settings.badges.find((b) => b.name === name);
  if (!badge) return null;
  await plugin.store.regenerateBadge(badge);
  const svgFile = app.vault.getAbstractFileByPath(plugin.store.svgPath(badge));
  if (!svgFile) return null;
  let e = "!" + app.fileManager.generateMarkdownLink(svgFile, sourcePath);
  const lk = classifyLink(badge.link);
  if (lk.kind === "url") {
    e = `[${e}](${lk.url})`;
  } else if (lk.kind === "note") {
    const t = app.metadataCache.getFirstLinkpathDest(lk.name, sourcePath);
    const dest = t ? app.fileManager.generateMarkdownLink(t, sourcePath) : lk.name;
    e = `[${e}](${dest})`;
  }
  return e;
}
async function freezeActiveNote(plugin) {
  const view = plugin.app.workspace.getActiveViewOfType(import_obsidian.MarkdownView);
  if (!view || !view.file) {
    new import_obsidian.Notice("\u8BF7\u5148\u6253\u5F00\u4E00\u7BC7\u7B14\u8BB0");
    return;
  }
  const lines = view.editor.getValue().split("\n");
  const runs = findMarkerRuns(lines);
  if (runs.length === 0) {
    new import_obsidian.Notice("\u672C\u7BC7\u6CA1\u6709\u53D1\u73B0\u5FBD\u7AE0\u6807\u8BB0\uFF08badge: \u540D\u5B57\uFF09");
    return;
  }
  let frozen = 0;
  for (const run of [...runs].reverse()) {
    const embeds = [];
    let ok = true;
    for (const name of run.names) {
      const e = await embedFor(plugin, name, view.file.path);
      if (!e) {
        ok = false;
        break;
      }
      embeds.push(e);
    }
    if (!ok) continue;
    lines.splice(run.startLine, run.endLine - run.startLine + 1, embeds.join(" "));
    frozen++;
  }
  if (frozen === 0) {
    new import_obsidian.Notice("\u6807\u8BB0\u540D\u5728\u6807\u7B7E\u5E93\u91CC\u627E\u4E0D\u5230\uFF0C\u672A\u56FA\u5316");
    return;
  }
  view.editor.setValue(lines.join("\n"));
  const skipped = runs.length - frozen;
  new import_obsidian.Notice(skipped > 0 ? `\u5DF2\u56FA\u5316 ${frozen} \u6392\u5FBD\u7AE0\uFF0C${skipped} \u6392\u56E0\u627E\u4E0D\u5230\u6807\u7B7E\u800C\u4FDD\u7559\u4E3A\u6587\u5B57` : `\u5DF2\u56FA\u5316 ${frozen} \u6392\u5FBD\u7AE0\u4E3A\u56FE\u7247`);
}
function pureBadgeLineToMarkers(plugin, line) {
  const rest = line.replace(/\[[^\]]*!?\[\[[^\]]*\]\]\([^)]*\)/g, "").replace(/!?\[\[[^\]]*badge-\d+\.svg[^\]]*\]\]/g, "").replace(/!\[[^\]]*\]\([^)]*badge-\d+\.svg[^)]*\)/g, "");
  if (rest.trim() !== "") return null;
  const hits = line.match(/badge-(\d+)\.svg/g);
  if (!hits) return null;
  const names = hits.map((h) => {
    var _a, _b, _c, _d;
    const id = (_b = (_a = /badge-(\d+)\.svg/.exec(h)) == null ? void 0 : _a[1]) != null ? _b : "";
    return (_d = (_c = plugin.store.settings.badges.find((b) => b.id === id)) == null ? void 0 : _c.name) != null ? _d : null;
  });
  if (names.some((n) => n === null)) return null;
  return names;
}
function unfreezeActiveNote(plugin) {
  const view = plugin.app.workspace.getActiveViewOfType(import_obsidian.MarkdownView);
  if (!view || !view.file) {
    new import_obsidian.Notice("\u8BF7\u5148\u6253\u5F00\u4E00\u7BC7\u7B14\u8BB0");
    return;
  }
  const lines = view.editor.getValue().split("\n");
  const out = [];
  let changed = 0;
  for (const line of lines) {
    const names = pureBadgeLineToMarkers(plugin, line);
    if (names) {
      out.push(...names.map((n) => `badge: ${n}`));
      changed++;
    } else {
      out.push(line);
    }
  }
  if (changed === 0) {
    new import_obsidian.Notice("\u672C\u7BC7\u6CA1\u6709\u53EF\u8FD8\u539F\u7684\u5FBD\u7AE0\u56FE\u7247\u884C\uFF08\u7D20\u6750\u6587\u4EF6\u5939\u91CC\u7684 badge-xxx.svg \u5D4C\u56FE\u884C\uFF09");
    return;
  }
  view.editor.setValue(out.join("\n"));
  new import_obsidian.Notice(`\u5DF2\u8FD8\u539F ${changed} \u884C\u5FBD\u7AE0\u4E3A\u6807\u8BB0`);
}

// src/markerskin.ts
var import_view2 = require("@codemirror/view");

// src/cm.ts
var import_language = require("@codemirror/language");
function inCodeBlock(view, pos) {
  let node = (0, import_language.syntaxTree)(view.state).resolveInner(pos, 1);
  while (node) {
    if (/code|math|comment/i.test(node.name)) return true;
    node = node.parent;
  }
  return false;
}

// src/core/svg.ts
var BADGE_HEIGHT = 20;
var PAD = 7;
var CORNER = 4;
var FONT_STACK = "Verdana,Geneva,'PingFang SC','Microsoft YaHei',sans-serif";
var LOGO_SIZE = 12;
var LOGO_PAD = 5;
var LOGO_GAP = 4;
function escapeXml(s) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
function textColorFor(bg) {
  let hex = bg.replace("#", "");
  if (hex.length === 3) hex = hex.split("").map((c) => c + c).join("");
  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);
  return (r * 299 + g * 587 + b * 114) / 1e3 >= 128 ? "#000000" : "#ffffff";
}
function resolveTextColor(bg, custom) {
  return custom !== "" ? custom : textColorFor(bg);
}
function textEl(content, x, textLen, fill) {
  return `<text x="${x}" y="14" font-family="${FONT_STACK}" font-size="11" font-weight="bold" fill="${fill}" textLength="${textLen}" lengthAdjust="spacingAndGlyphs">${escapeXml(content)}</text>`;
}
function logoEl(logo, x, color) {
  const y = (BADGE_HEIGHT - LOGO_SIZE) / 2;
  const transform = `translate(${x} ${y}) scale(${LOGO_SIZE / 24})`;
  const paint = logo.filled ? `fill="${color}"` : `fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"`;
  return `<g transform="${transform}" ${paint}>${logo.inner.replace(/currentColor/g, color)}</g>`;
}
function iconsOf(...list) {
  return list.filter((x) => x != null);
}
function leadWidth(count) {
  return count === 0 ? PAD : LOGO_PAD + count * (LOGO_SIZE + LOGO_GAP);
}
function trailWidth(count) {
  return count === 0 ? PAD : count * (LOGO_GAP + LOGO_SIZE) + LOGO_PAD;
}
function leadIcons(icons, segLeft, color) {
  return icons.map((spec, i) => logoEl(spec, segLeft + LOGO_PAD + i * (LOGO_SIZE + LOGO_GAP), color)).join("");
}
function trailIcons(icons, segRight, color) {
  const n = icons.length;
  return icons.map((spec, i) => logoEl(spec, segRight - LOGO_PAD - LOGO_SIZE - (n - 1 - i) * (LOGO_SIZE + LOGO_GAP), color)).join("");
}
function buildBadgeSvg(badge, palette, measure) {
  const two = badge.leftText !== "";
  const lLead = two ? iconsOf(badge.logoLeft) : [];
  const lTrail = two ? iconsOf(badge.logoLeftInner) : [];
  const rLead = iconsOf(...two ? [badge.logoRightInner] : [badge.logoLeft, badge.logoRightInner]);
  const rTrail = iconsOf(badge.logoRight);
  const leftTextLen = two ? Math.ceil(measure(badge.leftText)) : 0;
  const rightTextLen = Math.ceil(measure(badge.rightText));
  const lw = two ? leadWidth(lLead.length) + leftTextLen + trailWidth(lTrail.length) : 0;
  const rw = leadWidth(rLead.length) + rightTextLen + trailWidth(rTrail.length);
  const w = lw + rw;
  const parts = [];
  parts.push(`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${BADGE_HEIGHT}" viewBox="0 0 ${w} ${BADGE_HEIGHT}" role="img">`);
  parts.push(`<clipPath id="r"><rect width="${w}" height="${BADGE_HEIGHT}" rx="${CORNER}"/></clipPath>`);
  parts.push(`<g clip-path="url(#r)">`);
  if (two) parts.push(`<rect width="${lw}" height="${BADGE_HEIGHT}" fill="${palette.leftBg}"/>`);
  parts.push(`<rect x="${lw}" width="${rw}" height="${BADGE_HEIGHT}" fill="${palette.rightBg}"/>`);
  parts.push(`</g>`);
  if (two) {
    const color = resolveTextColor(palette.leftBg, palette.leftTextColor);
    if (lLead.length > 0) parts.push(leadIcons(lLead, 0, color));
    parts.push(textEl(badge.leftText, leadWidth(lLead.length), leftTextLen, color));
    if (lTrail.length > 0) parts.push(trailIcons(lTrail, lw, color));
  }
  const rColor = resolveTextColor(palette.rightBg, palette.rightTextColor);
  if (rLead.length > 0) parts.push(leadIcons(rLead, lw, rColor));
  parts.push(textEl(badge.rightText, lw + leadWidth(rLead.length), rightTextLen, rColor));
  if (rTrail.length > 0) parts.push(trailIcons(rTrail, w, rColor));
  parts.push(`</svg>`);
  return parts.join("");
}

// src/ui/chip.ts
function iconSvg(logo, color, size) {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("width", String(size));
  svg.setAttribute("height", String(size));
  svg.style.display = "block";
  if (logo.filled) {
    svg.setAttribute("fill", color);
  } else {
    svg.setAttribute("fill", "none");
    svg.setAttribute("stroke", color);
    svg.setAttribute("stroke-width", "2");
    svg.setAttribute("stroke-linecap", "round");
    svg.setAttribute("stroke-linejoin", "round");
  }
  svg.innerHTML = logo.inner.replace(/currentColor/g, color);
  return svg;
}
function iconGroup(logos, bg, color, side, size = LOGO_SIZE) {
  const wrap = document.createElement("span");
  wrap.style.background = bg;
  wrap.style.display = "inline-flex";
  wrap.style.alignItems = "center";
  wrap.style.gap = `${LOGO_GAP}px`;
  wrap.style.paddingLeft = `${side === "lead" ? LOGO_PAD : LOGO_GAP}px`;
  wrap.style.paddingRight = `${side === "lead" ? LOGO_GAP : LOGO_PAD}px`;
  for (const logo of logos) wrap.appendChild(iconSvg(logo, color, size));
  return wrap;
}
function makeLogoEl(logo, bg, color, size = LOGO_SIZE) {
  return iconGroup([logo], bg, color, "lead", size);
}
function makeChip(spec) {
  const chip = document.createElement("span");
  chip.className = "bs-chip";
  chip.style.display = "inline-flex";
  chip.style.height = "20px";
  chip.style.borderRadius = "4px";
  chip.style.overflow = "hidden";
  chip.style.fontFamily = FONT_STACK;
  chip.style.fontSize = "11px";
  chip.style.fontWeight = "bold";
  chip.style.lineHeight = "20px";
  chip.style.verticalAlign = "middle";
  chip.style.whiteSpace = "nowrap";
  const two = spec.leftText !== "";
  const seg = (text, bg, custom, leftPad, rightPad = PAD) => {
    const s = document.createElement("span");
    s.style.padding = `0 ${rightPad}px 0 ${leftPad}px`;
    s.style.background = bg;
    s.style.color = resolveTextColor(bg, custom);
    s.textContent = text;
    return s;
  };
  const leftColor = resolveTextColor(spec.leftBg, spec.leftTextColor);
  const rightColor = resolveTextColor(spec.rightBg, spec.rightTextColor);
  const rightLead = (two ? [spec.logoRightInner] : [spec.logoLeft, spec.logoRightInner]).filter(
    (x) => x !== null
  );
  if (two) {
    if (spec.logoLeft) chip.appendChild(iconGroup([spec.logoLeft], spec.leftBg, leftColor, "lead"));
    chip.appendChild(
      seg(spec.leftText, spec.leftBg, spec.leftTextColor, spec.logoLeft ? 0 : PAD, spec.logoLeftInner ? 0 : PAD)
    );
    if (spec.logoLeftInner) chip.appendChild(iconGroup([spec.logoLeftInner], spec.leftBg, leftColor, "trail"));
  }
  if (rightLead.length > 0) chip.appendChild(iconGroup(rightLead, spec.rightBg, rightColor, "lead"));
  chip.appendChild(
    seg(spec.rightText, spec.rightBg, spec.rightTextColor, rightLead.length > 0 ? 0 : PAD, spec.logoRight ? 0 : PAD)
  );
  if (spec.logoRight) chip.appendChild(iconGroup([spec.logoRight], spec.rightBg, rightColor, "trail"));
  return chip;
}

// src/markerskin.ts
function chipFor(plugin, badge) {
  return makeChip({
    leftText: badge.leftText,
    rightText: badge.rightText,
    leftBg: badge.leftBg,
    rightBg: badge.rightBg,
    leftTextColor: badge.leftTextColor,
    rightTextColor: badge.rightTextColor,
    ...plugin.store.logosOf(badge)
  });
}
function badgesForNames(plugin, names) {
  const badges = [];
  for (const n of names) {
    const b = plugin.store.settings.badges.find((x) => x.name === n);
    if (!b) return null;
    badges.push(b);
  }
  return badges;
}
var ChipWidget = class extends import_view2.WidgetType {
  constructor(plugin, id) {
    super();
    this.plugin = plugin;
    this.id = id;
    this.version = plugin.version;
  }
  eq(other) {
    return this.id === other.id && this.version === other.version;
  }
  toDOM() {
    const badge = this.plugin.store.settings.badges.find((b) => b.id === this.id);
    if (!badge) return document.createElement("span");
    const chip = chipFor(this.plugin, badge);
    if (badge.link !== "") {
      chip.style.cursor = "pointer";
      chip.title = `\u70B9\u51FB\u8DF3\u8F6C\uFF1A${badge.link}`;
      chip.addEventListener("click", () => {
        var _a, _b;
        const sourcePath = (_b = (_a = this.plugin.app.workspace.getActiveFile()) == null ? void 0 : _a.path) != null ? _b : "";
        openBadgeLink(this.plugin, badge, sourcePath);
      });
    }
    return chip;
  }
  ignoreEvent() {
    return false;
  }
};
function buildDecorations(view, plugin) {
  const deco = [];
  const sel = view.state.selection;
  for (let i = 1; i <= view.state.doc.lines; i++) {
    const ln = view.state.doc.line(i);
    const name = parseBadgeMarker(ln.text);
    if (name === null) continue;
    if (sel.ranges.some((r) => r.from <= ln.to && r.to >= ln.from)) continue;
    if (inCodeBlock(view, ln.from)) continue;
    const badge = plugin.store.settings.badges.find((b) => b.name === name);
    if (!badge) continue;
    deco.push(import_view2.Decoration.replace({ widget: new ChipWidget(plugin, badge.id) }).range(ln.from, ln.to));
  }
  return import_view2.Decoration.set(deco, true);
}
function markerOnlyParagraph(p) {
  var _a;
  const names = [];
  for (const node of Array.from(p.childNodes)) {
    if (node.nodeName === "BR") continue;
    if (node.nodeType === Node.TEXT_NODE) {
      const t = ((_a = node.textContent) != null ? _a : "").trim();
      if (t === "") continue;
      const m = MARKER_RE.exec(t);
      if (!m) return null;
      names.push(m[1]);
    } else {
      return null;
    }
  }
  return names.length > 0 ? names : null;
}
function openBadgeLink(plugin, badge, sourcePath) {
  const lk = classifyLink(badge.link);
  if (lk.kind === "url") {
    window.open(lk.url);
  } else if (lk.kind === "note") {
    plugin.app.workspace.openLinkText(lk.name, sourcePath);
  }
}
function registerMarkerSkin(plugin) {
  plugin.registerMarkdownPostProcessor((el, ctx) => {
    el.querySelectorAll("p").forEach((p) => {
      const names = markerOnlyParagraph(p);
      if (!names) return;
      const badges = badgesForNames(plugin, names);
      if (!badges) return;
      const row = el.createDiv({ cls: "bs-marker-row" });
      for (const b of badges) {
        const chip = chipFor(plugin, b);
        if (b.link !== "") {
          chip.style.cursor = "pointer";
          chip.addEventListener("click", () => openBadgeLink(plugin, b, ctx.sourcePath));
        }
        row.appendChild(chip);
      }
      p.replaceWith(row);
    });
  });
  plugin.registerEditorExtension(
    import_view2.ViewPlugin.fromClass(
      class {
        constructor(view) {
          this.version = plugin.version;
          this.decorations = buildDecorations(view, plugin);
        }
        update(u) {
          if (u.docChanged || u.selectionSet || this.version !== plugin.version) {
            this.version = plugin.version;
            this.decorations = buildDecorations(u.view, plugin);
          }
        }
      },
      { decorations: (v) => v.decorations }
    )
  );
}

// src/ui/insert.ts
var import_obsidian2 = require("obsidian");
function resolveMarkdownView(plugin) {
  const active = plugin.app.workspace.getActiveViewOfType(import_obsidian2.MarkdownView);
  if (active == null ? void 0 : active.file) return active;
  const last = plugin.lastMarkdownView;
  if ((last == null ? void 0 : last.file) && plugin.app.workspace.getLeavesOfType("markdown").some((l) => l === last.leaf)) return last;
  for (const leaf of plugin.app.workspace.getLeavesOfType("markdown")) {
    const view = leaf.view;
    if (view instanceof import_obsidian2.MarkdownView && view.file) return view;
  }
  return null;
}
function insertBadgeAtCursor(plugin, badge) {
  const view = resolveMarkdownView(plugin);
  if (!view || !view.file) {
    new import_obsidian2.Notice("\u8BF7\u5148\u6253\u5F00\u4E00\u7BC7\u7B14\u8BB0\u518D\u63D2\u5165\u5FBD\u7AE0");
    return;
  }
  const editor = view.editor;
  const cursor = editor.getCursor();
  const line = editor.getLine(cursor.line);
  const marker = markerText(badge.name);
  let nextLine;
  if (line.trim() === "") {
    editor.replaceRange(marker + "\n", { line: cursor.line, ch: 0 }, { line: cursor.line, ch: line.length });
    nextLine = cursor.line + 1;
  } else {
    editor.replaceRange("\n" + marker + "\n", { line: cursor.line, ch: line.length });
    nextLine = cursor.line + 2;
  }
  editor.setCursor({ line: nextLine, ch: 0 });
  void plugin.app.workspace.revealLeaf(view.leaf);
  editor.focus();
}
var BadgeInsertModal = class extends import_obsidian2.SuggestModal {
  constructor(plugin) {
    super(plugin.app);
    this.plugin = plugin;
    this.setPlaceholder("\u8F93\u5165\u6807\u7B7E\u540D\u641C\u7D22\u2026");
  }
  getSuggestions(query) {
    const q = query.trim().toLowerCase();
    return this.plugin.store.settings.badges.filter((b) => b.name.toLowerCase().includes(q));
  }
  renderSuggestion(badge, el) {
    el.createSpan({ text: badge.name });
  }
  onChooseSuggestion(badge) {
    insertBadgeAtCursor(this.plugin, badge);
  }
};

// src/ui/sidebar.ts
var import_obsidian8 = require("obsidian");

// src/core/defaults.ts
var LEFT_BG = "#555555";
var FALLBACK_PALETTE = {
  leftBg: LEFT_BG,
  rightBg: "#ffd400",
  leftTextColor: "",
  rightTextColor: ""
};
function defaultSettings() {
  const styles = [
    { id: "s001", name: "\u9EC4", rightBg: "#ffd400" },
    { id: "s002", name: "\u7EFF", rightBg: "#4caf50" },
    { id: "s003", name: "\u7EA2", rightBg: "#e05d44" },
    { id: "s004", name: "\u84DD", rightBg: "#007ec6" },
    { id: "s005", name: "\u7D2B", rightBg: "#7c3aed" },
    { id: "s006", name: "\u6A59", rightBg: "#f97316" },
    { id: "s007", name: "\u7070", rightBg: "#555555" }
  ].map((s) => ({ ...s, leftBg: LEFT_BG, leftTextColor: "", rightTextColor: "" }));
  return {
    assetsFolder: "\u5FBD\u7AE0\u7D20\u6750",
    defaultStyleId: "s001",
    sidebarView: "list",
    // 新装时留空：徽章由用户自己建，样式库只提供配色模板
    groups: [],
    refsPreview: true,
    styles,
    badges: []
  };
}
function nextNumericId(ids, withS) {
  let max = 0;
  for (const id of ids) {
    const raw = withS ? id.replace(/^s/, "") : id;
    const n = parseInt(raw, 10);
    if (!isNaN(n) && n > max) max = n;
  }
  const num2 = String(max + 1).padStart(3, "0");
  return withS ? `s${num2}` : num2;
}

// src/core/io.ts
function exportJson(settings) {
  const data = { styles: settings.styles, badges: settings.badges };
  return JSON.stringify(data, null, 2);
}
function isHexColor(v) {
  return typeof v === "string" && /^#[0-9a-fA-F]{6}$/.test(v);
}
function importTextColor(v) {
  return isHexColor(v) ? v : "";
}
function fail(error) {
  return { stylesAdded: 0, badgesAdded: 0, skipped: 0, error };
}
function pickPalette(cand, styleIdMap, settings) {
  var _a, _b;
  if (isHexColor(cand.leftBg) && isHexColor(cand.rightBg)) {
    return {
      leftBg: cand.leftBg,
      rightBg: cand.rightBg,
      leftTextColor: importTextColor(cand.leftTextColor),
      rightTextColor: importTextColor(cand.rightTextColor)
    };
  }
  const oldId = typeof cand.styleId === "string" ? cand.styleId : "";
  const mapped = (_a = styleIdMap.get(oldId)) != null ? _a : settings.defaultStyleId;
  const s = (_b = settings.styles.find((x) => x.id === mapped)) != null ? _b : settings.styles[0];
  if (!s) return { ...FALLBACK_PALETTE };
  return { leftBg: s.leftBg, rightBg: s.rightBg, leftTextColor: s.leftTextColor, rightTextColor: s.rightTextColor };
}
function mergeImport(settings, raw) {
  if (typeof raw !== "object" || raw === null) return fail("\u6587\u4EF6\u4E0D\u662F\u6709\u6548\u7684 JSON \u5BF9\u8C61");
  const data = raw;
  if (!Array.isArray(data.styles) || !Array.isArray(data.badges)) return fail("\u7F3A\u5C11 styles \u6216 badges \u6570\u7EC4");
  const styleIdMap = /* @__PURE__ */ new Map();
  let stylesAdded = 0;
  for (const s of data.styles) {
    if (typeof s !== "object" || s === null) continue;
    const cand = s;
    if (typeof cand.name !== "string" || cand.name.trim() === "") continue;
    if (!isHexColor(cand.leftBg) || !isHexColor(cand.rightBg)) continue;
    const oldId = typeof cand.id === "string" ? cand.id : "";
    const existing = settings.styles.find((x) => x.name === cand.name.trim());
    if (existing) {
      if (oldId !== "") styleIdMap.set(oldId, existing.id);
      continue;
    }
    const id = nextNumericId(settings.styles.map((x) => x.id), true);
    const style = {
      id,
      name: cand.name.trim(),
      leftBg: cand.leftBg,
      rightBg: cand.rightBg,
      leftTextColor: importTextColor(cand.leftTextColor),
      rightTextColor: importTextColor(cand.rightTextColor)
    };
    settings.styles.push(style);
    if (oldId !== "") styleIdMap.set(oldId, id);
    stylesAdded++;
  }
  let badgesAdded = 0;
  let skipped = 0;
  for (const b of data.badges) {
    if (typeof b !== "object" || b === null) {
      skipped++;
      continue;
    }
    const cand = b;
    if (typeof cand.name !== "string" || cand.name.trim() === "" || typeof cand.rightText !== "string" || cand.rightText.trim() === "") {
      skipped++;
      continue;
    }
    if (settings.badges.some((x) => x.name === cand.name.trim())) {
      skipped++;
      continue;
    }
    const badge = {
      id: nextNumericId(settings.badges.map((x) => x.id), false),
      name: cand.name.trim(),
      leftText: typeof cand.leftText === "string" ? cand.leftText : "",
      rightText: cand.rightText.trim(),
      link: typeof cand.link === "string" ? cand.link : "",
      group: typeof cand.group === "string" ? cand.group : "",
      // 旧导出文件里图标字段叫 logo，迁移到 logoLeft
      logoLeft: typeof cand.logoLeft === "string" ? cand.logoLeft : typeof cand.logo === "string" ? cand.logo : "",
      logoLeftInner: typeof cand.logoLeftInner === "string" ? cand.logoLeftInner : "",
      logoRightInner: typeof cand.logoRightInner === "string" ? cand.logoRightInner : "",
      logoRight: typeof cand.logoRight === "string" ? cand.logoRight : "",
      ...pickPalette(cand, styleIdMap, settings)
    };
    settings.badges.push(badge);
    badgesAdded++;
  }
  return { stylesAdded, badgesAdded, skipped };
}

// src/core/presets.ts
var PRESET_LEFT_BG = "#555555";
var PRESET_FAMILIES = [
  {
    name: "GitHub \u7ECF\u5178",
    desc: "shields.io \u540C\u6B3E\u914D\u8272",
    styles: [
      { name: "brightgreen", rightBg: "#4c1" },
      { name: "green", rightBg: "#97ca00" },
      { name: "yellow", rightBg: "#dfb317" },
      { name: "yellowgreen", rightBg: "#a4a61d" },
      { name: "orange", rightBg: "#fe7d37" },
      { name: "red", rightBg: "#e05d44" },
      { name: "blue", rightBg: "#007ec6" },
      { name: "blueviolet", rightBg: "#8b5cf6" },
      { name: "lightgrey", rightBg: "#9f9f9f" },
      { name: "critical", rightBg: "#d73a4a" }
    ]
  },
  {
    name: "\u83AB\u5170\u8FEA",
    desc: "\u4F4E\u9971\u548C\u7070\u8C03\uFF0C\u6E29\u67D4\u4E0D\u523A\u773C",
    styles: [
      { name: "\u96FE\u84DD", rightBg: "#8fa3b0" },
      { name: "\u8C46\u7EFF", rightBg: "#9fae94" },
      { name: "\u9676\u571F", rightBg: "#b8907f" },
      { name: "\u7070\u7C89", rightBg: "#c4a0a0" },
      { name: "\u71D5\u9EA6", rightBg: "#c4b49a" },
      { name: "\u96FE\u7D2B", rightBg: "#a49bb8" },
      { name: "\u4E91\u7070", rightBg: "#b0b5ba" }
    ]
  },
  {
    name: "\u9A6C\u5361\u9F99",
    desc: "\u6E05\u900F pastel\uFF0C\u9002\u5408\u624B\u8D26/\u65E5\u8BB0",
    styles: [
      { name: "\u8584\u8377", rightBg: "#8fd8bd" },
      { name: "\u8349\u8393", rightBg: "#ffb3c2" },
      { name: "\u5976\u6CB9", rightBg: "#ffe49a" },
      { name: "\u6674\u7A7A", rightBg: "#a3c8f5" },
      { name: "\u85B0\u8863\u8349", rightBg: "#c9b8f5" },
      { name: "\u871C\u6843", rightBg: "#ffc4a3" },
      { name: "\u9752\u82F9\u679C", rightBg: "#c8e6a0" }
    ]
  },
  {
    name: "\u8D5B\u535A\u670B\u514B",
    desc: "\u6DF1\u5E95\uFF0B\u9713\u8679\uFF0C\u79D1\u6280\u611F",
    styles: [
      { name: "\u9713\u8679\u9752", leftBg: "#1f2937", rightBg: "#22d3ee" },
      { name: "\u9713\u8679\u7C89", leftBg: "#1f2937", rightBg: "#f472b6" },
      { name: "\u7535\u5149\u7D2B", leftBg: "#1f2937", rightBg: "#a78bfa" },
      { name: "\u6FC0\u5149\u7EFF", leftBg: "#1f2937", rightBg: "#4ade80" },
      { name: "\u8B66\u6212\u9EC4", leftBg: "#1f2937", rightBg: "#fde047" }
    ]
  },
  {
    name: "\u68EE\u6797\u5927\u5730",
    desc: "\u6C89\u7A33\u81EA\u7136\u8272",
    styles: [
      { name: "\u82D4\u7EFF", rightBg: "#4a7c59" },
      { name: "\u6DF1\u6797", rightBg: "#2d5a3d" },
      { name: "\u68D5\u8910", rightBg: "#8b6f47" },
      { name: "\u571F\u9EC4", rightBg: "#c9a227" },
      { name: "\u7816\u7EA2", rightBg: "#a8583c" },
      { name: "\u58A8\u7EFF", rightBg: "#3f6b52" }
    ]
  },
  {
    name: "\u6D77\u6D0B",
    desc: "\u6E05\u51B7\u84DD\u7EFF\u7CFB",
    styles: [
      { name: "\u6DF1\u6D77", rightBg: "#0f4c81" },
      { name: "\u6E56\u84DD", rightBg: "#2e86ab" },
      { name: "\u9752\u7EFF", rightBg: "#1b998b" },
      { name: "\u5929\u84DD", rightBg: "#4aa3df" },
      { name: "\u85CF\u84DD", rightBg: "#2c4a7c" },
      { name: "\u6E56\u7EFF", rightBg: "#3aa8a0" }
    ]
  }
];

// src/core/refs.ts
var import_obsidian3 = require("obsidian");
async function findBadgeReferences(app, names) {
  var _a, _b;
  const wanted = new Set(names);
  const result = /* @__PURE__ */ new Map();
  for (const name of names) result.set(name, []);
  for (const file of app.vault.getMarkdownFiles()) {
    const text = await app.vault.cachedRead(file);
    const counts = /* @__PURE__ */ new Map();
    for (const line of text.split("\n")) {
      const name = parseBadgeMarker(line);
      if (name !== null && wanted.has(name)) counts.set(name, ((_a = counts.get(name)) != null ? _a : 0) + 1);
    }
    for (const [name, count] of counts) (_b = result.get(name)) == null ? void 0 : _b.push({ path: file.path, count });
  }
  return result;
}
async function notePreview(app, path, maxLen = 90) {
  const file = app.vault.getAbstractFileByPath(path);
  if (!(file instanceof import_obsidian3.TFile)) return "";
  let text = await app.vault.cachedRead(file);
  if (text.startsWith("---")) {
    const end = text.indexOf("\n---", 3);
    if (end > 0) text = text.slice(end + 4);
  }
  const lines = text.split("\n").map((l) => l.trim()).filter((l) => l !== "" && !l.startsWith("#") && !/^badge\s*[:：]/.test(l) && !/^\S+\s*::/.test(l));
  const snippet = lines.slice(0, 2).join(" ");
  return snippet.length > maxLen ? snippet.slice(0, maxLen) + "\u2026" : snippet;
}

// src/ui/confirm.ts
var import_obsidian4 = require("obsidian");
var ConfirmModal = class extends import_obsidian4.Modal {
  constructor(app, text, onConfirm, confirmText = "\u786E\u8BA4\u5220\u9664") {
    super(app);
    this.text = text;
    this.onConfirm = onConfirm;
    this.confirmText = confirmText;
  }
  onOpen() {
    const { contentEl } = this;
    contentEl.createEl("p", { text: this.text });
    new import_obsidian4.Setting(contentEl).addButton((b) => b.setButtonText("\u53D6\u6D88").onClick(() => this.close())).addButton(
      (b) => b.setButtonText(this.confirmText).setWarning().onClick(() => {
        this.close();
        this.onConfirm();
      })
    );
  }
  onClose() {
    this.contentEl.empty();
  }
};

// src/ui/settingsTab.ts
var import_obsidian7 = require("obsidian");

// src/core/logo.ts
var import_obsidian5 = require("obsidian");

// src/core/logofit.ts
var SVG_RE = /<svg\b([^>]*)>([\s\S]*?)<\/svg>/i;
var VIEWBOX_RE = /viewBox\s*=\s*["']\s*([-\d.]+)[\s,]+([-\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)\s*["']/i;
var ATTR_RE = /([a-zA-Z-]+)\s*=\s*["']\s*([\d.]+)(?:px)?\s*["']/g;
var PATH_RE = /^[Mm]\s*[-+.\d]/;
function isCustomShape(raw) {
  const s = raw.trim();
  return s.includes("<") || PATH_RE.test(s);
}
function num(v) {
  const s = v.toFixed(4).replace(/0+$/, "").replace(/\.$/, "");
  return s === "-0" || s === "" ? "0" : s;
}
function toCurrentColor(inner) {
  return inner.replace(/\bfill\s*=\s*"(?!none|currentColor)[^"]*"/gi, 'fill="currentColor"').replace(/\bfill\s*=\s*'(?!none|currentColor)[^']*'/gi, 'fill="currentColor"').replace(/\bstroke\s*=\s*"(?!none|currentColor)[^"]*"/gi, 'stroke="currentColor"').replace(/\bstroke\s*=\s*'(?!none|currentColor)[^']*'/gi, 'stroke="currentColor"');
}
function fitTransform(x, y, w, h) {
  const scale = 24 / Math.max(w, h);
  const dx = (24 - w * scale) / 2 - x * scale;
  const dy = (24 - h * scale) / 2 - y * scale;
  if (Math.abs(scale - 1) < 1e-6 && Math.abs(dx) < 1e-6 && Math.abs(dy) < 1e-6) return "";
  return `translate(${num(dx)} ${num(dy)}) scale(${num(scale)})`;
}
function viewBoxOf(attrs) {
  const vb = VIEWBOX_RE.exec(attrs);
  if (vb) {
    const box = [Number(vb[1]), Number(vb[2]), Number(vb[3]), Number(vb[4])];
    return box[2] > 0 && box[3] > 0 ? box : null;
  }
  let w = 0;
  let h = 0;
  const re = new RegExp(ATTR_RE.source, "g");
  let m;
  while ((m = re.exec(attrs)) !== null) {
    const key = m[1].toLowerCase();
    if (key === "width") w = Number(m[2]);
    else if (key === "height") h = Number(m[2]);
  }
  return w > 0 && h > 0 ? [0, 0, w, h] : null;
}
function fitCustomFragment(raw) {
  const src = raw.trim();
  if (src === "") return null;
  const svg = SVG_RE.exec(src);
  if (svg) {
    const attrs = svg[1];
    const inner2 = toCurrentColor(svg[2].trim());
    if (inner2 === "") return null;
    const box = viewBoxOf(attrs);
    const t = box ? fitTransform(box[0], box[1], box[2], box[3]) : "";
    const stroked = /fill\s*=\s*["']?none/i.test(attrs) || /\bstroke\s*=/i.test(attrs) && !/\bfill\s*=/i.test(attrs);
    return { inner: t === "" ? inner2 : `<g transform="${t}">${inner2}</g>`, filled: !stroked };
  }
  if (PATH_RE.test(src)) return { inner: `<path d="${src}"/>`, filled: true };
  const inner = toCurrentColor(src);
  return inner === "" ? null : { inner, filled: true };
}

// src/core/logo.ts
var cache = /* @__PURE__ */ new Map();
function sanitize(inner) {
  return inner.replace(/<script[\s\S]*?<\/script>/gi, "").replace(/\son[a-z]+\s*=\s*"[^"]*"/gi, "").replace(/\son[a-z]+\s*=\s*'[^']*'/gi, "").replace(/\s(?:xlink:)?href\s*=\s*"(?!#)[^"]*"/gi, "").trim();
}
function fromBuiltin(name) {
  const svg = (0, import_obsidian5.getIcon)(name);
  if (!svg) return null;
  const inner = sanitize(svg.innerHTML);
  return inner === "" ? null : { inner, filled: false };
}
function fromCustom(raw) {
  const spec = fitCustomFragment(raw);
  if (!spec) return null;
  const inner = sanitize(spec.inner);
  return inner === "" ? null : { inner, filled: spec.filled };
}
function resolveLogo(raw) {
  const key = raw.trim();
  if (key === "") return null;
  const hit = cache.get(key);
  if (hit !== void 0) return hit;
  const spec = isCustomShape(key) ? fromCustom(key) : fromBuiltin(key);
  if (spec) cache.set(key, spec);
  return spec;
}

// src/ui/iconPicker.ts
var import_obsidian6 = require("obsidian");

// src/core/icons.ts
var LOGO_CHOICES = [
  "github",
  "git-fork",
  "book",
  "book-open",
  "notebook-pen",
  "graduation-cap",
  "languages",
  "flask-conical",
  "brain",
  "lightbulb",
  "pencil",
  "file-text",
  "folder",
  "tag",
  "star",
  "heart",
  "bookmark",
  "check",
  "clock",
  "calendar",
  "target",
  "rocket",
  "sparkles",
  "code",
  "terminal",
  "database",
  "globe",
  "music",
  "palette",
  "mic",
  "video",
  "image",
  "list-checks",
  "zap",
  "shield",
  "settings"
];

// src/ui/iconPicker.ts
var cachedNames = null;
function iconNames() {
  if (cachedNames) return cachedNames;
  let ids = [];
  try {
    ids = (0, import_obsidian6.getIconIds)();
  } catch (e) {
    ids = [];
  }
  cachedNames = ids.length > 0 ? ids : [...LOGO_CHOICES];
  return cachedNames;
}
var IconPickerModal = class extends import_obsidian6.SuggestModal {
  constructor(app, pick) {
    super(app);
    this.pick = pick;
    this.setPlaceholder(`\u641C\u56FE\u6807\u540D\u2026\uFF08\u5185\u7F6E\u56FE\u6807\u5171 ${iconNames().length} \u4E2A\uFF09`);
    this.setInstructions([
      { command: "\u2191\u2193", purpose: "\u6D4F\u89C8" },
      { command: "\u21B5", purpose: "\u9009\u7528" },
      { command: "\u540D\u5B57\u4E0D\u591F\u7528\uFF1F", purpose: "\u5230 lucide.dev/icons \u67E5\uFF0C\u6216\u7C98\u8D34\u81EA\u5E26 SVG" }
    ]);
  }
  getSuggestions(query) {
    const q = query.trim().toLowerCase();
    const names = iconNames();
    if (q === "") return names.slice(0, 120);
    const hit = names.filter((n) => n.includes(q));
    hit.sort((a, b) => a.indexOf(q) - b.indexOf(q) || a.localeCompare(b));
    return hit.slice(0, 200);
  }
  renderSuggestion(name, el) {
    const iconEl = el.createSpan({ cls: "bs-picker-icon" });
    (0, import_obsidian6.setIcon)(iconEl, name);
    el.createSpan({ cls: "bs-picker-name", text: name });
  }
  onChooseSuggestion(name) {
    this.pick(name);
  }
};

// src/ui/settingsTab.ts
function extLink(el, text, href) {
  const a = el.createEl("a", { text });
  a.addEventListener("click", (e) => {
    e.preventDefault();
    window.open(href);
  });
}
var FileSuggest = class extends import_obsidian7.AbstractInputSuggest {
  constructor(app, inputEl, onPick) {
    super(app, inputEl);
    this.onPick = onPick;
  }
  getSuggestions(query) {
    const q = query.trim().toLowerCase();
    const files = this.app.vault.getMarkdownFiles();
    const matched = q === "" ? files.slice(0, 30) : files.filter((f) => f.path.toLowerCase().includes(q));
    matched.sort((a, b) => {
      const ai = a.basename.toLowerCase().startsWith(q) ? 0 : 1;
      const bi = b.basename.toLowerCase().startsWith(q) ? 0 : 1;
      return ai - bi || a.basename.localeCompare(b.basename);
    });
    return matched.slice(0, 30);
  }
  renderSuggestion(file, el) {
    el.createDiv({ text: file.basename });
    el.createDiv({ cls: "bs-suggest-path", text: file.path });
  }
  selectSuggestion(file) {
    this.setValue(file.path);
    this.onPick(file);
    this.close();
  }
};
function addColor(control, value, onChange) {
  const picker = control.createEl("input", { cls: "bs-color-picker", attr: { type: "color", value } });
  const text = control.createEl("input", { cls: "bs-color-text", attr: { type: "text", value, size: "8" } });
  picker.addEventListener("input", () => {
    text.value = picker.value;
    onChange(picker.value);
  });
  text.addEventListener("change", () => {
    const v = text.value.trim();
    if (/^#[0-9a-fA-F]{6}$/.test(v)) {
      picker.value = v;
      onChange(v);
    } else {
      text.value = picker.value;
    }
  });
  return (v) => {
    picker.value = v;
    text.value = v;
  };
}
function addTextColor(control, auto, color, onChange) {
  const cb = control.createEl("input", { attr: { type: "checkbox" } });
  cb.checked = auto;
  const picker = control.createEl("input", { cls: "bs-color-picker", attr: { type: "color", value: auto ? "#000000" : color } });
  picker.style.display = auto ? "none" : "inline-block";
  picker.style.marginLeft = "6px";
  picker.style.verticalAlign = "middle";
  const label = control.createEl("span", { cls: "bs-n", text: auto ? "\u81EA\u52A8" : "\u81EA\u5B9A\u4E49" });
  label.style.marginLeft = "4px";
  cb.addEventListener("change", () => {
    picker.style.display = cb.checked ? "none" : "inline-block";
    label.setText(cb.checked ? "\u81EA\u52A8" : "\u81EA\u5B9A\u4E49");
    onChange(cb.checked, picker.value);
  });
  picker.addEventListener("input", () => onChange(false, picker.value));
  return (a, c) => {
    cb.checked = a;
    picker.value = a ? "#000000" : c;
    picker.style.display = a ? "none" : "inline-block";
    label.setText(a ? "\u81EA\u52A8" : "\u81EA\u5B9A\u4E49");
  };
}
var StyleEditModal = class extends import_obsidian7.Modal {
  constructor(plugin, existing) {
    super(plugin.app);
    this.name = "";
    this.leftBg = "#555555";
    this.rightBg = "#ffd400";
    this.leftAuto = true;
    this.rightAuto = true;
    this.leftTextColor = "#000000";
    this.rightTextColor = "#ffffff";
    this.plugin = plugin;
    this.existing = existing;
    if (existing) {
      this.name = existing.name;
      this.leftBg = existing.leftBg;
      this.rightBg = existing.rightBg;
      this.leftAuto = existing.leftTextColor === "";
      this.rightAuto = existing.rightTextColor === "";
      if (existing.leftTextColor !== "") this.leftTextColor = existing.leftTextColor;
      if (existing.rightTextColor !== "") this.rightTextColor = existing.rightTextColor;
    }
  }
  onOpen() {
    const { contentEl } = this;
    this.setTitle(this.existing ? "\u7F16\u8F91\u6837\u5F0F" : "\u65B0\u5EFA\u6837\u5F0F");
    new import_obsidian7.Setting(contentEl).setName("\u540D\u5B57").addText((t) => {
      t.setValue(this.name);
      t.onChange((v) => this.name = v);
    });
    const leftRow = new import_obsidian7.Setting(contentEl).setName("\u5DE6\u5757\u989C\u8272");
    addColor(leftRow.controlEl, this.leftBg, (v) => this.leftBg = v);
    const rightRow = new import_obsidian7.Setting(contentEl).setName("\u53F3\u5757\u989C\u8272");
    addColor(rightRow.controlEl, this.rightBg, (v) => this.rightBg = v);
    const leftTextRow = new import_obsidian7.Setting(contentEl).setName("\u5DE6\u5757\u6587\u5B57").setDesc("\u81EA\u52A8\uFF1D\u6309\u5E95\u8272\u4EAE\u5EA6\u9ED1\u767D");
    addTextColor(leftTextRow.controlEl, this.leftAuto, this.leftTextColor, (auto, color) => {
      this.leftAuto = auto;
      this.leftTextColor = color;
    });
    const rightTextRow = new import_obsidian7.Setting(contentEl).setName("\u53F3\u5757\u6587\u5B57").setDesc("\u81EA\u52A8\uFF1D\u6309\u5E95\u8272\u4EAE\u5EA6\u9ED1\u767D");
    addTextColor(rightTextRow.controlEl, this.rightAuto, this.rightTextColor, (auto, color) => {
      this.rightAuto = auto;
      this.rightTextColor = color;
    });
    new import_obsidian7.Setting(contentEl).addButton((b) => {
      b.setButtonText("\u4FDD\u5B58").setCta();
      b.onClick(async () => {
        if (this.name.trim() === "") return;
        const patch = {
          name: this.name.trim(),
          leftBg: this.leftBg,
          rightBg: this.rightBg,
          leftTextColor: this.leftAuto ? "" : this.leftTextColor,
          rightTextColor: this.rightAuto ? "" : this.rightTextColor
        };
        if (this.existing) {
          await this.plugin.store.updateStyle(this.existing.id, patch);
        } else {
          await this.plugin.store.addStyle(patch);
        }
        this.close();
      });
    });
  }
  onClose() {
    this.contentEl.empty();
  }
};
var BadgeEditModal = class extends import_obsidian7.Modal {
  constructor(plugin, existing, presetGroup, presetStyleId) {
    var _a;
    super(plugin.app);
    this.name = "";
    this.leftText = "";
    this.rightText = "";
    this.leftBg = "#555555";
    this.rightBg = "#ffd400";
    this.leftAuto = true;
    this.rightAuto = true;
    this.leftTextColor = "#000000";
    this.rightTextColor = "#ffffff";
    this.link = "";
    this.group = "";
    this.logoLeft = "";
    this.logoLeftInner = "";
    this.logoRightInner = "";
    this.logoRight = "";
    this.plugin = plugin;
    this.existing = existing;
    const palette = existing ? {
      leftBg: existing.leftBg,
      rightBg: existing.rightBg,
      leftTextColor: existing.leftTextColor,
      rightTextColor: existing.rightTextColor
    } : (_a = presetStyleId !== void 0 ? plugin.store.paletteOfStyle(presetStyleId) : null) != null ? _a : plugin.store.defaultPalette();
    this.leftBg = palette.leftBg;
    this.rightBg = palette.rightBg;
    this.leftAuto = palette.leftTextColor === "";
    this.rightAuto = palette.rightTextColor === "";
    if (palette.leftTextColor !== "") this.leftTextColor = palette.leftTextColor;
    if (palette.rightTextColor !== "") this.rightTextColor = palette.rightTextColor;
    if (presetGroup !== void 0) this.group = presetGroup;
    if (existing) {
      this.name = existing.name;
      this.leftText = existing.leftText;
      this.rightText = existing.rightText;
      this.link = existing.link;
      this.group = existing.group;
      this.logoLeft = existing.logoLeft;
      this.logoLeftInner = existing.logoLeftInner;
      this.logoRightInner = existing.logoRightInner;
      this.logoRight = existing.logoRight;
    }
  }
  onOpen() {
    const { contentEl } = this;
    this.setTitle(this.existing ? "\u7F16\u8F91\u5FBD\u7AE0" : "\u65B0\u5EFA\u5FBD\u7AE0");
    let refreshPreview = () => {
    };
    new import_obsidian7.Setting(contentEl).setName("\u540D\u5B57\uFF08\u7528\u4E8E\u641C\u7D22/\u5217\u8868\uFF09").addText((t) => t.setValue(this.name).onChange((v) => this.name = v));
    new import_obsidian7.Setting(contentEl).setName("\u5DE6\u5B57\uFF08\u7559\u7A7A\uFF1D\u5355\u6BB5\uFF09").addText(
      (t) => t.setValue(this.leftText).onChange((v) => {
        this.leftText = v;
        refreshPreview();
      })
    );
    new import_obsidian7.Setting(contentEl).setName("\u53F3\u5B57").addText(
      (t) => t.setValue(this.rightText).onChange((v) => {
        this.rightText = v;
        refreshPreview();
      })
    );
    const paletteHead = contentEl.createDiv({ cls: "bs-palette-head" });
    paletteHead.createSpan({ cls: "bs-palette-title", text: "\u914D\u8272" });
    const previewWrap = paletteHead.createSpan({ cls: "bs-palette-preview" });
    refreshPreview = () => {
      previewWrap.empty();
      previewWrap.innerHTML = this.plugin.store.previewSvg({
        leftText: this.leftText,
        rightText: this.rightText,
        logoLeft: this.logoLeft,
        logoLeftInner: this.logoLeftInner,
        logoRightInner: this.logoRightInner,
        logoRight: this.logoRight,
        leftBg: this.leftBg,
        rightBg: this.rightBg,
        leftTextColor: this.leftAuto ? "" : this.leftTextColor,
        rightTextColor: this.rightAuto ? "" : this.rightTextColor
      });
    };
    let leftSetter = null;
    let rightSetter = null;
    let leftTextSetter = null;
    let rightTextSetter = null;
    new import_obsidian7.Setting(contentEl).setName("\u5957\u7528\u6837\u5F0F").setDesc("\u4ECE\u6837\u5F0F\u5E93\u4E00\u952E\u53D6\u8272\uFF0C\u53D6\u5B8C\u4ECD\u53EF\u5355\u72EC\u5FAE\u8C03\uFF1B\u6837\u5F0F\u5E93\u7684\u6539\u52A8\u4E0E\u5220\u9664\u90FD\u4E0D\u4F1A\u5F71\u54CD\u5DF2\u521B\u5EFA\u7684\u5FBD\u7AE0").addDropdown((d) => {
      d.addOption("", "\u9009\u62E9\u6837\u5F0F\u2026");
      for (const s of this.plugin.store.settings.styles) d.addOption(s.id, s.name);
      d.setValue("");
      d.onChange((v) => {
        if (v === "") return;
        const p = this.plugin.store.paletteOfStyle(v);
        if (!p) return;
        this.leftBg = p.leftBg;
        this.rightBg = p.rightBg;
        this.leftAuto = p.leftTextColor === "";
        this.rightAuto = p.rightTextColor === "";
        if (p.leftTextColor !== "") this.leftTextColor = p.leftTextColor;
        if (p.rightTextColor !== "") this.rightTextColor = p.rightTextColor;
        leftSetter == null ? void 0 : leftSetter(this.leftBg);
        rightSetter == null ? void 0 : rightSetter(this.rightBg);
        leftTextSetter == null ? void 0 : leftTextSetter(this.leftAuto, this.leftTextColor);
        rightTextSetter == null ? void 0 : rightTextSetter(this.rightAuto, this.rightTextColor);
        refreshPreview();
        d.setValue("");
      });
    });
    const leftRow = new import_obsidian7.Setting(contentEl).setName("\u5DE6\u5757\u989C\u8272").setDesc("\u5206\u7C7B\u90A3\u4E00\u6BB5");
    leftSetter = addColor(leftRow.controlEl, this.leftBg, (v) => {
      this.leftBg = v;
      refreshPreview();
    });
    const rightRow = new import_obsidian7.Setting(contentEl).setName("\u53F3\u5757\u989C\u8272").setDesc("\u72B6\u6001\u90A3\u4E00\u6BB5");
    rightSetter = addColor(rightRow.controlEl, this.rightBg, (v) => {
      this.rightBg = v;
      refreshPreview();
    });
    const leftTextRow = new import_obsidian7.Setting(contentEl).setName("\u5DE6\u5757\u6587\u5B57").setDesc("\u81EA\u52A8\uFF1D\u6309\u5E95\u8272\u4EAE\u5EA6\u9ED1\u767D");
    leftTextSetter = addTextColor(leftTextRow.controlEl, this.leftAuto, this.leftTextColor, (auto, color) => {
      this.leftAuto = auto;
      this.leftTextColor = color;
      refreshPreview();
    });
    const rightTextRow = new import_obsidian7.Setting(contentEl).setName("\u53F3\u5757\u6587\u5B57").setDesc("\u81EA\u52A8\uFF1D\u6309\u5E95\u8272\u4EAE\u5EA6\u9ED1\u767D");
    rightTextSetter = addTextColor(rightTextRow.controlEl, this.rightAuto, this.rightTextColor, (auto, color) => {
      this.rightAuto = auto;
      this.rightTextColor = color;
      refreshPreview();
    });
    refreshPreview();
    const logoField = contentEl.createDiv({ cls: "bs-logo-field" });
    logoField.createDiv({ cls: "bs-logo-title", text: "\u56FE\u6807\uFF08\u9009\u586B\uFF09" });
    const logoDesc = logoField.createDiv({ cls: "bs-logo-desc" });
    logoDesc.appendText("\u7559\u7A7A\uFF1D\u65E0\u56FE\u6807\u3002\u540D\u5B57\u4E0D\u591F\u7528\u5230 ");
    extLink(logoDesc, "lucide.dev/icons", "https://lucide.dev/icons/");
    logoDesc.appendText(" \u67E5\uFF0C\u6216\u70B9\u300C\u6D4F\u89C8\u56FE\u6807\u300D\u6311\u73B0\u6210\u7684\uFF1B\u54C1\u724C logo \u7684 SVG \u5230 ");
    extLink(logoDesc, "svgcode.com/cn/explore", "https://svgcode.com/cn/explore");
    logoDesc.appendText(" \u627E\uFF0C\u4E0B\u8F7D\u7684\u6587\u4EF6\u5185\u5BB9\u53EF\u6574\u6BB5\u7C98\u8FDB\u6765\u3002\uFF08\u60F3\u7ED9\u4E24\u4E2A\u80F6\u56CA\u7684\u56DB\u89D2\u5404\u914D\u4E00\u679A\uFF0C\u5C55\u5F00\u4E0B\u9762\u7684\u300C\u9AD8\u7EA7\u300D\uFF09");
    const makeLogoRow = (label, init, apply, parent = logoField) => {
      const row = parent.createDiv({ cls: "bs-logo-control" });
      row.createSpan({ cls: "bs-logo-label", text: label });
      const preview = row.createSpan({ cls: "bs-logo-preview" });
      const input = row.createEl("input", {
        cls: "bs-logo-input",
        attr: { type: "text", placeholder: "\u5982 github\uFF0C\u6216\u7C98\u8D34 SVG / path \u6570\u636E" }
      });
      input.value = init;
      const state = row.createSpan({ cls: "bs-n" });
      const browse = row.createEl("button", { cls: "bs-logo-browse", text: "\u6D4F\u89C8\u56FE\u6807" });
      const sync = () => {
        const v = input.value.trim();
        apply(v);
        const spec = resolveLogo(v);
        preview.empty();
        if (spec) preview.appendChild(makeLogoEl(spec, "transparent", "currentColor", 16));
        state.setText(v === "" ? "" : spec ? "\u2713" : "\u26A0 \u6CA1\u8BA4\u51FA");
        state.className = v === "" ? "bs-n" : spec ? "bs-n bs-logo-ok" : "bs-n bs-logo-bad";
        refreshPreview();
      };
      input.addEventListener("input", sync);
      browse.addEventListener("click", () => {
        new IconPickerModal(this.app, (name) => {
          input.value = name;
          sync();
        }).open();
      });
      sync();
    };
    makeLogoRow("\u5DE6\u6BB5\u5DE6", this.logoLeft, (v) => this.logoLeft = v);
    const advanced = logoField.createEl("details", { cls: "bs-logo-advanced" });
    advanced.createEl("summary", { text: "\u9AD8\u7EA7\uFF1A\u53E6\u5916\u4E09\u4E2A\u4F4D\u7F6E\u4E5F\u80FD\u653E\u56FE\u6807" });
    const advBody = advanced.createDiv({ cls: "bs-logo-advanced-body" });
    makeLogoRow("\u5DE6\u6BB5\u53F3", this.logoLeftInner, (v) => this.logoLeftInner = v, advBody);
    makeLogoRow("\u53F3\u6BB5\u5DE6", this.logoRightInner, (v) => this.logoRightInner = v, advBody);
    makeLogoRow("\u53F3\u6BB5\u53F3", this.logoRight, (v) => this.logoRight = v, advBody);
    const linkRow = new import_obsidian7.Setting(contentEl).setName("\u94FE\u63A5\uFF08\u9009\u586B\uFF1A\u7F51\u5740\u6216\u7B14\u8BB0\u540D\uFF09");
    const hint = contentEl.createDiv({ cls: "bs-link-hint" });
    const updateHint = () => {
      var _a, _b;
      const v = this.link.trim();
      if (v === "") {
        hint.setText("\u7559\u7A7A\uFF1D\u5FBD\u7AE0\u4E0D\u5E26\u94FE\u63A5\uFF0C\u70B9\u51FB\u4E0D\u8DF3\u8F6C");
        return;
      }
      if (/^https?:\/\//i.test(v)) {
        hint.setText("\u5916\u90E8\u7F51\u5740\uFF0C\u70B9\u51FB\u65F6\u7528\u6D4F\u89C8\u5668\u6253\u5F00");
        return;
      }
      const base = (_b = (_a = v.split("/").pop()) == null ? void 0 : _a.replace(/\.md$/, "")) != null ? _b : v;
      const sameName = this.plugin.app.vault.getMarkdownFiles().filter((f) => f.basename === base);
      const dest = this.plugin.app.metadataCache.getFirstLinkpathDest(v, "");
      if (dest) {
        hint.setText(
          sameName.length > 1 ? `\u2192 ${dest.path}\uFF08\u5E93\u91CC\u6709 ${sameName.length} \u4E2A\u540C\u540D\u7B14\u8BB0\uFF0C\u5EFA\u8BAE\u4ECE\u4E0B\u62C9\u9009\u5B8C\u6574\u8DEF\u5F84\uFF09` : `\u2192 ${dest.path}`
        );
      } else {
        hint.setText("\u26A0 \u627E\u4E0D\u5230\u8FD9\u7BC7\u7B14\u8BB0\uFF0C\u70B9\u51FB\u65F6\u4F1A\u6309\u8FD9\u4E2A\u540D\u5B57\u6253\u5F00\uFF08\u53EF\u80FD\u65B0\u5EFA\u7A7A\u7B14\u8BB0\uFF09");
      }
    };
    linkRow.addText((t) => {
      t.setValue(this.link);
      t.onChange((v) => {
        this.link = v;
        updateHint();
      });
      new FileSuggest(this.plugin.app, t.inputEl, (file) => {
        this.link = file.path;
        updateHint();
      });
    });
    updateHint();
    new import_obsidian7.Setting(contentEl).setName("\u5206\u7EC4\uFF08\u9009\u586B\uFF09").addText((t) => {
      t.setValue(this.group).onChange((v) => this.group = v.trim());
      t.inputEl.setAttribute("list", "bs-group-datalist");
    });
    const dl = contentEl.createEl("datalist", { attr: { id: "bs-group-datalist" } });
    for (const g of this.plugin.store.groups()) dl.createEl("option", { attr: { value: g } });
    const submit = async (insert) => {
      if (this.name.trim() === "" || this.rightText.trim() === "") return;
      const patch = {
        name: this.name.trim(),
        leftText: this.leftText.trim(),
        rightText: this.rightText.trim(),
        leftBg: this.leftBg,
        rightBg: this.rightBg,
        leftTextColor: this.leftAuto ? "" : this.leftTextColor,
        rightTextColor: this.rightAuto ? "" : this.rightTextColor,
        link: this.link.trim(),
        group: this.group,
        logoLeft: this.logoLeft.trim(),
        logoLeftInner: this.logoLeftInner.trim(),
        logoRightInner: this.logoRightInner.trim(),
        logoRight: this.logoRight.trim()
      };
      let badge;
      if (this.existing) {
        await this.plugin.store.updateBadge(this.existing.id, patch);
        badge = { ...this.existing, ...patch };
      } else {
        badge = await this.plugin.store.addBadge(patch);
      }
      this.close();
      if (insert) insertBadgeAtCursor(this.plugin, badge);
    };
    new import_obsidian7.Setting(contentEl).addButton((b) => b.setButtonText("\u4FDD\u5B58").onClick(() => void submit(false))).addButton((b) => b.setButtonText("\u4FDD\u5B58\u5E76\u63D2\u5165").setCta().onClick(() => void submit(true)));
  }
  onClose() {
    this.contentEl.empty();
  }
};
var BadgeSettingTab = class extends import_obsidian7.PluginSettingTab {
  constructor(app, plugin) {
    super(app, plugin);
    this.plugin = plugin;
  }
  display() {
    const { containerEl } = this;
    containerEl.empty();
    new import_obsidian7.Setting(containerEl).setName("\u9ED8\u8BA4\u6837\u5F0F").setDesc("\u65B0\u5EFA\u5FBD\u7AE0\u65F6\u7684\u521D\u59CB\u914D\u8272\u6765\u6E90\u3002\u6837\u5F0F\u5E93\u53EA\u662F\u53D6\u8272\u6A21\u677F\uFF1A\u6539\u52A8\u6216\u5220\u9664\u6837\u5F0F\uFF0C\u90FD\u4E0D\u4F1A\u5F71\u54CD\u5DF2\u521B\u5EFA\u7684\u5FBD\u7AE0").addDropdown((d) => {
      for (const s of this.plugin.store.settings.styles) d.addOption(s.id, s.name);
      d.setValue(this.plugin.store.settings.defaultStyleId);
      d.onChange(async (v) => {
        this.plugin.store.settings.defaultStyleId = v;
        await this.plugin.store.save();
      });
    });
    new import_obsidian7.Setting(containerEl).setName("\u4FA7\u680F\u9ED8\u8BA4\u89C6\u56FE").setDesc("\u5217\u8868\uFF1A\u5FBD\u7AE0 + \u540D\u5B57 + \u5F15\u7528\u6570\uFF1B\u5806\u653E\uFF1A\u7EAF\u5FBD\u7AE0\u56FE\u7247\u6D41\uFF08\u4FA7\u680F\u53F3\u4E0A\u89D2\u7684\u6309\u94AE\u4E5F\u80FD\u968F\u65F6\u5207\u6362\uFF09").addDropdown((d) => {
      d.addOption("list", "\u5217\u8868");
      d.addOption("grid", "\u5806\u653E");
      d.setValue(this.plugin.store.settings.sidebarView);
      d.onChange(async (v) => {
        this.plugin.store.settings.sidebarView = v;
        await this.plugin.store.save();
      });
    });
    new import_obsidian7.Setting(containerEl).setName("\u7D20\u6750\u6587\u4EF6\u5939\u540D").setDesc("SVG \u5C0F\u56FE\u5B58\u653E\u7684\u5E93\u5185\u6587\u4EF6\u5939\uFF1B\u6539\u540D\u4F1A\u81EA\u52A8\u642C\u8FC1\u6587\u4EF6").addText((t) => {
      t.setValue(this.plugin.store.settings.assetsFolder);
      t.inputEl.addEventListener("change", async () => {
        const v = t.getValue().trim();
        if (v === "" || v === this.plugin.store.settings.assetsFolder) return;
        await this.plugin.store.renameAssetsFolder(v);
        this.display();
      });
    });
    new import_obsidian7.Setting(containerEl).setName("\u6E05\u7406\u65E0\u7528\u7D20\u6750").setDesc("\u7D20\u6750\u6587\u4EF6\u5939\u91CC\u90A3\u4E9B\u5DF2\u7ECF\u4E0D\u5C5E\u4E8E\u4EFB\u4F55\u5FBD\u7AE0\u7684 badge-xxx.svg\uFF08\u5220\u5FBD\u7AE0\u65F6\u5B83\u7684\u7D20\u6750\u4F1A\u81EA\u52A8\u8FDB\u56DE\u6536\u7AD9\uFF0C\u8FD9\u91CC\u53EF\u4EE5\u628A\u5386\u53F2\u9057\u7559\u7684\u4E00\u6B21\u6027\u6E05\u6389\uFF09").addButton(
      (b) => b.setButtonText("\u6E05\u7406").onClick(async () => {
        const n = await this.plugin.store.cleanOrphanAssets();
        new import_obsidian7.Notice(n > 0 ? `\u5DF2\u6E05\u7406 ${n} \u4E2A\u65E0\u7528\u7D20\u6750\uFF08\u79FB\u5165\u56DE\u6536\u7AD9\uFF09` : "\u6CA1\u6709\u53D1\u73B0\u65E0\u7528\u7D20\u6750");
      })
    );
    containerEl.createEl("h3", { text: "\u6837\u5F0F\u5E93" });
    for (const style of this.plugin.store.settings.styles) {
      const row = new import_obsidian7.Setting(containerEl).setName(style.name).setDesc(`\u5DE6 ${style.leftBg} \uFF0F \u53F3 ${style.rightBg}`);
      row.controlEl.createSpan({ cls: "bs-swatch", attr: { style: `background:${style.leftBg}` } });
      row.controlEl.createSpan({ cls: "bs-swatch", attr: { style: `background:${style.rightBg}` } });
      row.addButton((b) => b.setButtonText("\u7F16\u8F91").onClick(() => new StyleEditModal(this.plugin, style).open()));
      row.addButton((b) => b.setButtonText("\u5220\u9664").setWarning().onClick(async () => {
        await this.plugin.store.deleteStyle(style.id);
        this.display();
      }));
    }
    new import_obsidian7.Setting(containerEl).addButton((b) => b.setButtonText("\u65B0\u5EFA\u6837\u5F0F").setCta().onClick(() => new StyleEditModal(this.plugin, null).open()));
    containerEl.createEl("h3", { text: "\u6807\u7B7E\u5E93" });
    for (const badge of this.plugin.store.settings.badges) {
      const svg = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(this.plugin.store.buildSvg(badge));
      const row = new import_obsidian7.Setting(containerEl).setName(badge.name);
      if (badge.group !== "") row.setDesc(`\u5206\u7EC4\uFF1A${badge.group}`);
      row.controlEl.createEl("img", { attr: { src: svg, style: "margin-right:8px", draggable: "false" } });
      row.addButton((b) => b.setButtonText("\u7F16\u8F91").onClick(() => new BadgeEditModal(this.plugin, badge).open()));
      row.addButton((b) => b.setButtonText("\u5220\u9664").setWarning().onClick(async () => {
        await this.plugin.store.deleteBadge(badge.id);
        this.display();
      }));
    }
    new import_obsidian7.Setting(containerEl).addButton((b) => b.setButtonText("\u65B0\u5EFA\u6807\u7B7E").setCta().onClick(() => new BadgeEditModal(this.plugin, null).open()));
  }
};

// src/ui/sidebar.ts
var SIDEBAR_VIEW_TYPE = "badge-studio-sidebar";
function iconBtn(el, icon, title) {
  const btn = el.createEl("button", { cls: "bs-icon-btn" });
  (0, import_obsidian8.setIcon)(btn, icon);
  btn.setAttribute("aria-label", title);
  btn.title = title;
  return btn;
}
var TextPromptModal = class extends import_obsidian8.Modal {
  constructor(app, title, cta, initial, onSubmit) {
    super(app);
    this.title = title;
    this.cta = cta;
    this.initial = initial;
    this.onSubmit = onSubmit;
  }
  onOpen() {
    const { contentEl } = this;
    this.setTitle(this.title);
    let value = this.initial;
    const submit = () => {
      const v = value.trim();
      if (v === "") return;
      this.close();
      this.onSubmit(v);
    };
    new import_obsidian8.Setting(contentEl).setName("\u540D\u5B57").addText((t) => {
      t.setValue(this.initial);
      t.onChange((v) => value = v);
      t.inputEl.addEventListener("keydown", (e) => {
        if (e.key === "Enter") submit();
      });
      t.inputEl.focus();
    });
    new import_obsidian8.Setting(contentEl).addButton((b) => b.setButtonText(this.cta).setCta().onClick(submit));
  }
  onClose() {
    this.contentEl.empty();
  }
};
var GroupManagerModal = class extends import_obsidian8.Modal {
  constructor(plugin) {
    super(plugin.app);
    this.plugin = plugin;
  }
  onOpen() {
    this.render();
  }
  render() {
    const { contentEl } = this;
    contentEl.empty();
    this.setTitle("\u7BA1\u7406\u5206\u7EC4");
    const groups = this.plugin.store.groups();
    if (groups.length === 0) contentEl.createDiv({ cls: "bs-empty", text: "\u8FD8\u6CA1\u6709\u5206\u7EC4" });
    for (const g of groups) {
      const count = this.plugin.store.settings.badges.filter((b) => b.group === g).length;
      const row = contentEl.createDiv({ cls: "bs-group-row" });
      (0, import_obsidian8.setIcon)(row.createSpan({ cls: "bs-icon-inline" }), "folder");
      row.createSpan({ cls: "grow", text: g });
      row.createSpan({ cls: "bs-n", text: `${count} \u4E2A` });
      iconBtn(row, "pencil", "\u91CD\u547D\u540D").addEventListener("click", () => {
        new TextPromptModal(this.app, `\u91CD\u547D\u540D\u5206\u7EC4\u300C${g}\u300D`, "\u4FDD\u5B58", g, (name2) => {
          void this.plugin.store.renameGroup(g, name2).then(() => this.render());
        }).open();
      });
      iconBtn(row, "trash-2", "\u5220\u9664\u5206\u7EC4").addEventListener("click", () => {
        const doDelete = () => void this.plugin.store.clearGroup(g).then(() => this.render());
        if (count === 0) {
          doDelete();
          return;
        }
        new ConfirmModal(this.app, `\u5220\u9664\u5206\u7EC4\u300C${g}\u300D\uFF1F\u7EC4\u5185 ${count} \u4E2A\u5FBD\u7AE0\u4F1A\u79FB\u5165\u300C\u672A\u5206\u7EC4\u300D\uFF0C\u5FBD\u7AE0\u672C\u8EAB\u4E0D\u4F1A\u88AB\u5220\u9664\u3002`, doDelete).open();
      });
    }
    let name = "";
    const add = new import_obsidian8.Setting(contentEl).addText((t) => {
      t.setPlaceholder("\u65B0\u5206\u7EC4\u540D\u5B57");
      t.onChange((v) => name = v);
    });
    add.addButton(
      (b) => b.setButtonText("\u521B\u5EFA\u5206\u7EC4").setCta().onClick(() => {
        if (name.trim() === "") return;
        void this.plugin.store.addGroup(name.trim()).then(() => this.render());
      })
    );
  }
  onClose() {
    this.contentEl.empty();
  }
};
var RefsModal = class extends import_obsidian8.Modal {
  constructor(app, badgeName, refs) {
    super(app);
    this.badgeName = badgeName;
    this.refs = refs;
  }
  onOpen() {
    const { contentEl } = this;
    this.setTitle(`\u300C${this.badgeName}\u300D\u7684\u5F15\u7528`);
    const total = this.refs.reduce((n, r) => n + r.count, 0);
    contentEl.createEl("p", { cls: "bs-empty", text: `${this.refs.length} \u7BC7\u7B14\u8BB0\uFF0C\u5171 ${total} \u5904\u3002\u70B9\u51FB\u8DF3\u8F6C\u3002` });
    const listEl = contentEl.createDiv({ cls: "bs-refs-list" });
    for (const r of this.refs) {
      const a = listEl.createEl("a", { text: `${r.path}\uFF08${r.count} \u5904\uFF09` });
      a.addEventListener("click", () => {
        const file = this.app.vault.getAbstractFileByPath(r.path);
        if (file instanceof import_obsidian8.TFile) {
          this.close();
          void this.app.workspace.getLeaf("tab").openFile(file);
        }
      });
    }
  }
  onClose() {
    this.contentEl.empty();
  }
};
var PresetModal = class extends import_obsidian8.Modal {
  constructor(plugin) {
    super(plugin.app);
    this.plugin = plugin;
  }
  onOpen() {
    this.render();
  }
  render() {
    var _a;
    const { contentEl } = this;
    contentEl.empty();
    this.setTitle("\u9884\u8BBE\u8272\u7CFB");
    for (const family of PRESET_FAMILIES) {
      contentEl.createEl("h4", { cls: "bs-preset-family", text: `${family.name} \xB7 ${family.desc}` });
      for (const p of family.styles) {
        const exists = this.plugin.store.settings.styles.some((s) => s.name === p.name);
        const leftBg = (_a = p.leftBg) != null ? _a : PRESET_LEFT_BG;
        const row = new import_obsidian8.Setting(contentEl).setName(p.name);
        row.controlEl.createSpan({ cls: "bs-swatch", attr: { style: `background:${leftBg}` } });
        row.controlEl.createSpan({ cls: "bs-swatch", attr: { style: `background:${p.rightBg}` } });
        row.addButton((b) => {
          b.setButtonText(exists ? "\u5DF2\u6DFB\u52A0" : "\u6DFB\u52A0").setDisabled(exists);
          if (!exists) b.setCta();
          b.onClick(async () => {
            await this.plugin.store.addStyle({
              name: p.name,
              leftBg,
              rightBg: p.rightBg,
              leftTextColor: "",
              rightTextColor: ""
            });
            new import_obsidian8.Notice(`\u5DF2\u6DFB\u52A0\u6837\u5F0F\u300C${p.name}\u300D`);
            this.render();
          });
        });
      }
    }
  }
  onClose() {
    this.contentEl.empty();
  }
};
var BadgeSidebarView = class extends import_obsidian8.ItemView {
  constructor(leaf, plugin) {
    super(leaf);
    this.unsubscribe = null;
    this.page = "badges";
    this.detailBadgeId = null;
    this.search = "";
    this.collapsedGroups = /* @__PURE__ */ new Set();
    this.refs = null;
    this.previewCache = /* @__PURE__ */ new Map();
    /** 刚弹出右键菜单的时间戳：触控板右键等情况下系统会连带触发一次 click，用它挡掉误触 */
    this.lastMenuAt = 0;
    this.plugin = plugin;
  }
  getViewType() {
    return SIDEBAR_VIEW_TYPE;
  }
  getDisplayText() {
    return "\u5FBD\u7AE0\u5DE5\u574A";
  }
  getIcon() {
    return "shield";
  }
  async onOpen() {
    this.unsubscribe = this.plugin.onChange(() => {
      void this.refreshRefs();
      this.render();
    });
    this.render();
    await this.refreshRefs();
  }
  async onClose() {
    if (this.unsubscribe) this.unsubscribe();
  }
  async refreshRefs() {
    const names = this.plugin.store.settings.badges.map((b) => b.name);
    this.refs = await findBadgeReferences(this.app, names);
    if (this.page === "badges") this.renderList();
    else if (this.page === "detail") this.renderDetailBody();
  }
  dataUri(badge) {
    return "data:image/svg+xml;charset=utf-8," + encodeURIComponent(this.plugin.store.buildSvg(badge));
  }
  render() {
    const root = this.containerEl.children[1];
    root.empty();
    root.addClass("bs-sidebar");
    root.oncontextmenu = (e) => this.openBlankMenu(e);
    if (this.page === "styles") {
      this.renderStylesPage(root);
      return;
    }
    if (this.page === "detail") {
      this.renderDetailPage(root);
      return;
    }
    this.renderHeader(root);
    root.createDiv({ cls: "bs-list" });
    this.renderList();
    this.renderFooter(root);
  }
  renderHeader(root) {
    const header = root.createDiv({ cls: "bs-side-header" });
    const searchWrap = header.createDiv({ cls: "bs-side-search" });
    const search = new import_obsidian8.SearchComponent(searchWrap);
    search.setPlaceholder("\u641C\u7D22\u5FBD\u7AE0\u2026");
    search.setValue(this.search);
    search.onChange((v) => {
      this.search = v.trim().toLowerCase();
      this.renderList();
    });
    const viewKind = this.plugin.store.settings.sidebarView;
    new import_obsidian8.ButtonComponent(header).setIcon(viewKind === "grid" ? "list" : "layout-grid").setTooltip(viewKind === "grid" ? "\u5207\u6362\u5230\u5217\u8868\u89C6\u56FE" : "\u5207\u6362\u5230\u5806\u653E\u89C6\u56FE").onClick(async () => {
      this.plugin.store.settings.sidebarView = viewKind === "grid" ? "list" : "grid";
      await this.plugin.store.save();
      this.render();
    });
    const more = new import_obsidian8.ButtonComponent(header).setIcon("more-horizontal").setTooltip("\u66F4\u591A");
    more.onClick((e) => {
      const menu = new import_obsidian8.Menu();
      menu.addItem((i) => i.setTitle("\u5BFC\u5165 JSON").setIcon("upload").onClick(() => this.pickImportFile()));
      menu.addItem((i) => i.setTitle("\u5BFC\u51FA JSON").setIcon("download").onClick(() => this.exportAll()));
      menu.showAtMouseEvent(e);
    });
  }
  renderFooter(root) {
    const footer = root.createDiv({ cls: "bs-side-footer" });
    new import_obsidian8.ButtonComponent(footer).setIcon("circle-plus").setTooltip("\u65B0\u5EFA\u5FBD\u7AE0").onClick(() => new BadgeEditModal(this.plugin, null).open());
    new import_obsidian8.ButtonComponent(footer).setIcon("folder-plus").setTooltip("\u7BA1\u7406\u5206\u7EC4").onClick(() => new GroupManagerModal(this.plugin).open());
    new import_obsidian8.ButtonComponent(footer).setIcon("palette").setTooltip("\u6837\u5F0F\u5E93").onClick(() => {
      this.page = "styles";
      this.render();
    });
  }
  renderList() {
    var _a, _b, _c;
    const listEl = this.containerEl.querySelector(".bs-list");
    if (!listEl) return;
    listEl.empty();
    const badges = this.plugin.store.settings.badges.filter((b) => b.name.toLowerCase().includes(this.search));
    const byGroup = /* @__PURE__ */ new Map();
    for (const b of badges) {
      const arr = (_a = byGroup.get(b.group)) != null ? _a : [];
      arr.push(b);
      byGroup.set(b.group, arr);
    }
    const order = [...byGroup.keys()].filter((g) => g !== "").sort();
    if (byGroup.has("")) order.push("");
    const grid = this.plugin.store.settings.sidebarView === "grid";
    for (const g of order) {
      const collapsed = this.collapsedGroups.has(g);
      const h = listEl.createDiv({ cls: "bs-group-header" });
      (0, import_obsidian8.setIcon)(h.createSpan({ cls: "bs-chevron" }), collapsed ? "chevron-right" : "chevron-down");
      (0, import_obsidian8.setIcon)(h.createSpan({ cls: "bs-icon-inline" }), g === "" ? "inbox" : "folder");
      h.createSpan({ text: g === "" ? "\u672A\u5206\u7EC4" : g });
      if (!grid) h.createSpan({ cls: "bs-count", text: `${byGroup.get(g).length}` });
      h.onClickEvent(() => {
        if (this.menuJustOpened()) return;
        if (collapsed) this.collapsedGroups.delete(g);
        else this.collapsedGroups.add(g);
        this.renderList();
      });
      h.addEventListener("contextmenu", (e) => {
        e.preventDefault();
        this.openGroupMenu(e, g);
      });
      if (collapsed) continue;
      if (grid) {
        const wrap = listEl.createDiv({ cls: "bs-grid" });
        for (const badge of byGroup.get(g)) {
          const tile = wrap.createDiv({ cls: "bs-tile" });
          tile.setAttribute("title", badge.name);
          tile.createEl("img", { attr: { src: this.dataUri(badge), draggable: "false" } });
          tile.setAttribute("draggable", "true");
          tile.addEventListener("dragstart", (e) => {
            if (e.dataTransfer) {
              e.dataTransfer.setData(BADGE_MIME, badge.name);
              e.dataTransfer.setData("text/plain", markerText(badge.name));
              e.dataTransfer.effectAllowed = "copy";
            }
          });
          tile.addEventListener("contextmenu", (e) => {
            e.preventDefault();
            this.openBadgeMenu(e, badge);
          });
          tile.onClickEvent(() => {
            if (this.menuJustOpened()) return;
            this.openDetail(badge);
          });
        }
        continue;
      }
      for (const badge of byGroup.get(g)) {
        const row = listEl.createDiv({ cls: "bs-row" });
        row.createEl("img", { attr: { src: this.dataUri(badge), draggable: "false" } });
        row.createSpan({ text: badge.name });
        const refs = (_c = (_b = this.refs) == null ? void 0 : _b.get(badge.name)) != null ? _c : [];
        if (refs.length > 0) {
          const count = row.createSpan({ cls: "bs-row-count", text: `${refs.length}` });
          count.title = `${refs.length} \u7BC7\u7B14\u8BB0\u5F15\u7528`;
          count.addEventListener("click", (e) => {
            e.stopPropagation();
            new RefsModal(this.app, badge.name, refs).open();
          });
        }
        row.setAttribute("draggable", "true");
        row.addEventListener("dragstart", (e) => {
          if (e.dataTransfer) {
            e.dataTransfer.setData(BADGE_MIME, badge.name);
            e.dataTransfer.setData("text/plain", markerText(badge.name));
            e.dataTransfer.effectAllowed = "copy";
          }
        });
        row.onClickEvent(() => {
          if (this.menuJustOpened()) return;
          this.openDetail(badge);
        });
        row.addEventListener("contextmenu", (e) => {
          e.preventDefault();
          this.openBadgeMenu(e, badge);
        });
      }
    }
    if (badges.length === 0) {
      listEl.createDiv({
        cls: "bs-empty",
        text: this.plugin.store.settings.badges.length === 0 ? "\u8FD8\u6CA1\u6709\u5FBD\u7AE0 \u2014\u2014 \u70B9\u4E0B\u9762\u7684\u300C+\u300D\u5EFA\u4E00\u4E2A\u5427" : "\u6CA1\u6709\u5339\u914D\u7684\u5FBD\u7AE0"
      });
    }
  }
  /** 右键菜单刚弹过 → 短时间内忽略随后的 click，避免误开详情页、误折叠分组 */
  menuJustOpened() {
    return Date.now() - this.lastMenuAt < 500;
  }
  /** 侧栏空白处右键：新建徽章、管理分组、样式库、导入导出 */
  openBlankMenu(e) {
    if (e.defaultPrevented) return;
    const target = e.target;
    if (!(target instanceof HTMLElement)) return;
    if (target.closest("input, textarea, select, button, a")) return;
    if (target.closest(".bs-row, .bs-group-header, .bs-ref-item, .bs-style-row")) return;
    e.preventDefault();
    this.lastMenuAt = Date.now();
    const menu = new import_obsidian8.Menu();
    menu.addItem((i) => i.setTitle("\u65B0\u5EFA\u5FBD\u7AE0").setIcon("circle-plus").onClick(() => new BadgeEditModal(this.plugin, null).open()));
    menu.addItem((i) => i.setTitle("\u7BA1\u7406\u5206\u7EC4").setIcon("folder-plus").onClick(() => new GroupManagerModal(this.plugin).open()));
    menu.addItem(
      (i) => i.setTitle("\u6837\u5F0F\u5E93").setIcon("palette").onClick(() => {
        this.page = "styles";
        this.render();
      })
    );
    menu.addSeparator();
    menu.addItem((i) => i.setTitle("\u5BFC\u5165 JSON").setIcon("upload").onClick(() => this.pickImportFile()));
    menu.addItem((i) => i.setTitle("\u5BFC\u51FA JSON").setIcon("download").onClick(() => this.exportAll()));
    menu.showAtMouseEvent(e);
  }
  openGroupMenu(e, group) {
    this.lastMenuAt = Date.now();
    const menu = new import_obsidian8.Menu();
    if (group !== "") {
      menu.addItem(
        (i) => i.setTitle("\u5728\u6B64\u5206\u7EC4\u65B0\u5EFA\u5FBD\u7AE0").setIcon("plus").onClick(() => new BadgeEditModal(this.plugin, null, group).open())
      );
      menu.addItem(
        (i) => i.setTitle("\u91CD\u547D\u540D\u5206\u7EC4").setIcon("pencil").onClick(() => {
          new TextPromptModal(this.app, `\u91CD\u547D\u540D\u5206\u7EC4\u300C${group}\u300D`, "\u4FDD\u5B58", group, (name) => {
            void this.plugin.store.renameGroup(group, name).then(() => this.render());
          }).open();
        })
      );
      menu.addItem(
        (i) => i.setTitle("\u5220\u9664\u5206\u7EC4").setIcon("trash-2").onClick(() => {
          const count = this.plugin.store.settings.badges.filter((b) => b.group === group).length;
          const doDelete = () => {
            void this.plugin.store.clearGroup(group).then(() => this.render());
          };
          if (count === 0) {
            doDelete();
            return;
          }
          new ConfirmModal(this.app, `\u5220\u9664\u5206\u7EC4\u300C${group}\u300D\uFF1F\u7EC4\u5185 ${count} \u4E2A\u5FBD\u7AE0\u4F1A\u79FB\u5165\u300C\u672A\u5206\u7EC4\u300D\uFF0C\u5FBD\u7AE0\u672C\u8EAB\u4E0D\u4F1A\u88AB\u5220\u9664\u3002`, doDelete).open();
        })
      );
    } else {
      menu.addItem(
        (i) => i.setTitle("\u5728\u672A\u5206\u7EC4\u65B0\u5EFA\u5FBD\u7AE0").setIcon("plus").onClick(() => new BadgeEditModal(this.plugin, null, "").open())
      );
    }
    menu.showAtMouseEvent(e);
  }
  openBadgeMenu(e, badge) {
    var _a, _b;
    this.lastMenuAt = Date.now();
    const menu = new import_obsidian8.Menu();
    menu.addItem((i) => i.setTitle("\u8BE6\u60C5").setIcon("info").onClick(() => this.openDetail(badge)));
    menu.addItem(
      (i) => i.setTitle("\u63D2\u5165\u5230\u5F53\u524D\u7B14\u8BB0").setIcon("plus").onClick(() => insertBadgeAtCursor(this.plugin, badge))
    );
    menu.addItem((i) => i.setTitle("\u7F16\u8F91").setIcon("pencil").onClick(() => new BadgeEditModal(this.plugin, badge).open()));
    menu.addItem(
      (i) => i.setTitle("\u590D\u5236\u6807\u8BB0").setIcon("copy").onClick(() => {
        void navigator.clipboard.writeText(markerText(badge.name));
        new import_obsidian8.Notice(`\u5DF2\u590D\u5236\uFF1A${markerText(badge.name)}`);
      })
    );
    const refs = (_b = (_a = this.refs) == null ? void 0 : _a.get(badge.name)) != null ? _b : [];
    if (refs.length > 0) {
      menu.addItem(
        (i) => i.setTitle(`\u5F15\u7528\u5217\u8868\uFF08${refs.length} \u7BC7\uFF09`).setIcon("list").onClick(() => new RefsModal(this.app, badge.name, refs).open())
      );
    }
    menu.addItem((i) => i.setTitle("\u5220\u9664").setIcon("trash-2").onClick(() => this.confirmDelete(badge)));
    menu.showAtMouseEvent(e);
  }
  confirmDelete(badge) {
    var _a, _b;
    const refs = (_b = (_a = this.refs) == null ? void 0 : _a.get(badge.name)) != null ? _b : [];
    const doDelete = () => {
      void this.plugin.store.deleteBadge(badge.id).then(() => {
        if (this.page === "detail" && this.detailBadgeId === badge.id) {
          this.page = "badges";
          this.detailBadgeId = null;
        }
        this.render();
      });
    };
    const warning = refs.length > 0 ? `\u300C${badge.name}\u300D\u88AB ${refs.length} \u7BC7\u7B14\u8BB0\u5F15\u7528\u3002\u5220\u9664\u540E\u5FBD\u7AE0\u6570\u636E\u3001\u6B63\u6587\u6807\u8BB0\u4E0E\u56FA\u5316\u56FE\u7247\u90FD\u4F1A\u88AB\u79FB\u9664\uFF0C\u7D20\u6750 SVG \u4E5F\u4F1A\u79FB\u5165\u56DE\u6536\u7AD9\u3002\u4ECD\u8981\u5220\u9664\u5417\uFF1F` : `\u5220\u9664\u300C${badge.name}\u300D\uFF1F\u6B63\u6587\u6807\u8BB0\u4E0E\u56FA\u5316\u56FE\u7247\u4F1A\u88AB\u79FB\u9664\uFF0C\u7D20\u6750 SVG \u4E5F\u4F1A\u79FB\u5165\u56DE\u6536\u7AD9\u3002\u4ECD\u8981\u5220\u9664\u5417\uFF1F`;
    new ConfirmModal(this.app, warning, doDelete).open();
  }
  openDetail(badge) {
    this.page = "detail";
    this.detailBadgeId = badge.id;
    this.render();
  }
  renderDetailPage(root) {
    const badge = this.plugin.store.settings.badges.find((b) => b.id === this.detailBadgeId);
    if (!badge) {
      this.page = "badges";
      this.detailBadgeId = null;
      this.render();
      return;
    }
    const header = root.createDiv({ cls: "bs-side-header" });
    new import_obsidian8.ButtonComponent(header).setIcon("arrow-left").setTooltip("\u8FD4\u56DE\u5217\u8868").onClick(() => {
      this.page = "badges";
      this.detailBadgeId = null;
      this.render();
    });
    header.createDiv({ cls: "bs-side-spacer" });
    new import_obsidian8.ButtonComponent(header).setIcon("pencil").setTooltip("\u7F16\u8F91\u5FBD\u7AE0").onClick(() => new BadgeEditModal(this.plugin, badge).open());
    new import_obsidian8.ButtonComponent(header).setIcon("trash-2").setTooltip("\u5220\u9664\u5FBD\u7AE0").onClick(() => this.confirmDelete(badge));
    root.createDiv({ cls: "bs-detail-page" });
    this.renderDetailBody();
  }
  renderDetailBody() {
    var _a, _b, _c, _d, _e;
    const page = this.containerEl.querySelector(".bs-detail-page");
    if (!page) return;
    page.empty();
    const badge = this.plugin.store.settings.badges.find((b) => b.id === this.detailBadgeId);
    if (!badge) return;
    const head = page.createDiv({ cls: "bs-detail-head" });
    head.createEl("img", { attr: { src: this.dataUri(badge), draggable: "false" } });
    head.createDiv({ cls: "bs-detail-name", text: badge.name });
    const meta = head.createDiv({ cls: "bs-detail-meta" });
    meta.createSpan({ cls: "bs-swatch", attr: { style: `background:${badge.leftBg}` } });
    meta.createSpan({ cls: "bs-swatch", attr: { style: `background:${badge.rightBg}` } });
    meta.createSpan({ cls: "bs-n", text: `${badge.leftBg} \uFF0F ${badge.rightBg}` });
    if (badge.group !== "") meta.createSpan({ cls: "bs-n", text: badge.group });
    if (badge.link !== "") {
      const lk = classifyLink(badge.link);
      const linkEl = head.createDiv({ cls: "bs-detail-link" });
      (0, import_obsidian8.setIcon)(linkEl.createSpan(), lk.kind === "url" ? "external-link" : "link");
      linkEl.createSpan({ text: badge.link });
      linkEl.addEventListener("click", () => {
        if (lk.kind === "url") window.open(lk.url);
        else if (lk.kind === "note") void this.app.workspace.openLinkText(lk.name, "");
      });
    }
    const actions = head.createDiv({ cls: "bs-detail-actions" });
    new import_obsidian8.ButtonComponent(actions).setButtonText("\u63D2\u5165\u5230\u5F53\u524D\u7B14\u8BB0").setCta().onClick(() => insertBadgeAtCursor(this.plugin, badge));
    const sec = page.createDiv({ cls: "bs-detail-section" });
    const refs = (_b = (_a = this.refs) == null ? void 0 : _a.get(badge.name)) != null ? _b : null;
    const total = (_c = refs == null ? void 0 : refs.reduce((n, r) => n + r.count, 0)) != null ? _c : 0;
    const h4 = sec.createEl("h4");
    h4.createSpan({ text: refs === null ? "\u5F15\u7528\uFF08\u7EDF\u8BA1\u4E2D\u2026\uFF09" : `\u5F15\u7528\uFF08${refs.length} \u7BC7 \xB7 \u5171 ${total} \u5904\uFF09` });
    if (refs !== null) {
      new import_obsidian8.ButtonComponent(h4).setIcon(this.plugin.store.settings.refsPreview ? "eye" : "eye-off").setTooltip("\u663E\u793A / \u5173\u95ED\u9884\u89C8").onClick(async () => {
        this.plugin.store.settings.refsPreview = !this.plugin.store.settings.refsPreview;
        await this.plugin.store.save();
        this.renderDetailBody();
      });
    }
    if (refs !== null && refs.length > 0) {
      const showPreview = this.plugin.store.settings.refsPreview;
      for (const r of refs) {
        const item = sec.createDiv({ cls: "bs-ref-item" });
        const titleRow = item.createDiv({ cls: "bs-ref-head" });
        titleRow.createSpan({ cls: "bs-ref-title", text: (_e = (_d = r.path.split("/").pop()) == null ? void 0 : _d.replace(/\.md$/, "")) != null ? _e : r.path });
        titleRow.createSpan({ cls: "bs-n", text: `${r.count} \u5904` });
        item.createDiv({ cls: "bs-ref-path", text: r.path });
        if (showPreview) {
          const pv = item.createDiv({ cls: "bs-ref-preview" });
          const cached = this.previewCache.get(r.path);
          if (cached !== void 0) pv.setText(cached);
          else this.loadPreview(r.path, pv);
        }
        item.addEventListener("click", () => {
          const file = this.app.vault.getAbstractFileByPath(r.path);
          if (file instanceof import_obsidian8.TFile) void this.app.workspace.getLeaf("tab").openFile(file);
        });
      }
    } else if (refs !== null) {
      sec.createDiv({ cls: "bs-empty", text: "\u8FD8\u6CA1\u6709\u7B14\u8BB0\u5F15\u7528\u8FD9\u4E2A\u5FBD\u7AE0" });
    }
  }
  loadPreview(path, el) {
    void notePreview(this.app, path).then((text) => {
      this.previewCache.set(path, text);
      if (el.isConnected) el.setText(text);
    }).catch(() => {
    });
  }
  renderStylesPage(root) {
    const header = root.createDiv({ cls: "bs-side-header" });
    new import_obsidian8.ButtonComponent(header).setIcon("arrow-left").setTooltip("\u8FD4\u56DE\u5FBD\u7AE0\u5217\u8868").onClick(() => {
      this.page = "badges";
      this.render();
    });
    new import_obsidian8.ButtonComponent(header).setButtonText("\u65B0\u5EFA\u6837\u5F0F").setCta().onClick(() => new StyleEditModal(this.plugin, null).open());
    new import_obsidian8.ButtonComponent(header).setButtonText("\u9884\u8BBE\u8272\u7CFB").onClick(() => new PresetModal(this.plugin).open());
    const list = root.createDiv({ cls: "bs-style-page" });
    for (const style of this.plugin.store.settings.styles) {
      const row = list.createDiv({ cls: "bs-style-row" });
      row.createSpan({ cls: "bs-swatch", attr: { style: `background:${style.leftBg}` } });
      row.createSpan({ cls: "bs-swatch", attr: { style: `background:${style.rightBg}` } });
      const info = row.createDiv({ cls: "bs-style-info" });
      info.createSpan({ cls: "bs-style-name", text: style.name });
      info.createSpan({ cls: "bs-n", text: "\u53D6\u8272\u6A21\u677F\uFF1A\u5FBD\u7AE0\u4F1A\u590D\u5236\u5B83\u7684\u989C\u8272\uFF0C\u4E4B\u540E\u4E92\u4E0D\u5F71\u54CD" });
      iconBtn(row, "plus", "\u7528\u8FD9\u4E2A\u914D\u8272\u65B0\u5EFA\u5FBD\u7AE0").addEventListener(
        "click",
        () => new BadgeEditModal(this.plugin, null, void 0, style.id).open()
      );
      iconBtn(row, "pencil", "\u7F16\u8F91").addEventListener("click", () => new StyleEditModal(this.plugin, style).open());
      iconBtn(row, "trash-2", "\u5220\u9664\u6837\u5F0F").addEventListener("click", () => {
        new ConfirmModal(this.app, `\u5220\u9664\u6837\u5F0F\u300C${style.name}\u300D\uFF1F\u5B83\u53EA\u662F\u53D6\u8272\u6A21\u677F\uFF0C\u5DF2\u521B\u5EFA\u7684\u5FBD\u7AE0\u4E0D\u53D7\u5F71\u54CD\u3002`, () => {
          void this.plugin.store.deleteStyle(style.id);
        }).open();
      });
    }
    if (this.plugin.store.settings.styles.length === 0) {
      list.createDiv({ cls: "bs-empty", text: "\u8FD8\u6CA1\u6709\u6837\u5F0F" });
    }
  }
  exportAll() {
    const blob = new Blob([exportJson(this.plugin.store.settings)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "badge-studio-export.json";
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1e3);
    new import_obsidian8.Notice("\u5DF2\u5BFC\u51FA\u5FBD\u7AE0\u5E93\u4E0E\u6837\u5F0F\u5E93 JSON");
  }
  pickImportFile() {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json,application/json";
    input.addEventListener("change", () => {
      var _a;
      const file = (_a = input.files) == null ? void 0 : _a[0];
      if (!file) return;
      void file.text().then(async (text) => {
        let raw;
        try {
          raw = JSON.parse(text);
        } catch (e) {
          new import_obsidian8.Notice("\u5BFC\u5165\u5931\u8D25\uFF1A\u4E0D\u662F\u6709\u6548\u7684 JSON \u6587\u4EF6");
          return;
        }
        const result = mergeImport(this.plugin.store.settings, raw);
        if (result.error) {
          new import_obsidian8.Notice(`\u5BFC\u5165\u5931\u8D25\uFF1A${result.error}`);
          return;
        }
        await this.plugin.store.save();
        await this.plugin.store.regenerateAll();
        new import_obsidian8.Notice(`\u5BFC\u5165\u5B8C\u6210\uFF1A\u65B0\u589E\u6837\u5F0F ${result.stylesAdded} \u4E2A\u3001\u5FBD\u7AE0 ${result.badgesAdded} \u4E2A\uFF0C\u8DF3\u8FC7 ${result.skipped} \u4E2A`);
      });
    });
    input.click();
  }
};

// src/store.ts
var import_obsidian9 = require("obsidian");

// src/core/migrate.ts
function migrateBadgeLogos(badge) {
  let changed = false;
  if (typeof badge.logoLeft !== "string") {
    badge.logoLeft = typeof badge.logo === "string" ? badge.logo : "";
    changed = true;
  }
  if (typeof badge.logoLeftInner !== "string") badge.logoLeftInner = "";
  if (typeof badge.logoRightInner !== "string") badge.logoRightInner = "";
  if (typeof badge.logoRight !== "string") badge.logoRight = "";
  delete badge.logo;
  return changed;
}
function migrateBadgeColors(badge, styles, fallback = FALLBACK_PALETTE) {
  var _a, _b, _c, _d;
  const hasOwnPalette = typeof badge.leftBg === "string" && typeof badge.rightBg === "string" && typeof badge.leftTextColor === "string" && typeof badge.rightTextColor === "string";
  if (hasOwnPalette) {
    delete badge.styleId;
    return false;
  }
  const oldId = typeof badge.styleId === "string" ? badge.styleId : "";
  const s = styles.find((x) => x.id === oldId);
  badge.leftBg = (_a = s == null ? void 0 : s.leftBg) != null ? _a : fallback.leftBg;
  badge.rightBg = (_b = s == null ? void 0 : s.rightBg) != null ? _b : fallback.rightBg;
  badge.leftTextColor = (_c = s == null ? void 0 : s.leftTextColor) != null ? _c : fallback.leftTextColor;
  badge.rightTextColor = (_d = s == null ? void 0 : s.rightTextColor) != null ? _d : fallback.rightTextColor;
  delete badge.styleId;
  return true;
}

// src/core/strip.ts
var BADGE_TOKEN_RE = /\[(?:!\[[^\]]*\]\([^)]*\)|!?\[\[[^\]]*\]\])\]\([^)]*\)|!?\[\[[^\]]*\]\]|!\[[^\]]*\]\([^)]*\)/g;
function removeEmbedsFromLine(line, id) {
  const cleaned = line.replace(BADGE_TOKEN_RE, (token) => token.includes(`badge-${id}.svg`) ? "" : token);
  if (cleaned === line) return line;
  return cleaned.replace(/[ \t]{2,}/g, " ").trim();
}
function stripBadgeReferences(text, name, id) {
  const out = [];
  for (const line of text.split("\n")) {
    const markerName = parseBadgeMarker(line);
    if (markerName !== null && markerName === name) continue;
    if (/badge-\d+\.svg/.test(line)) {
      const cleaned = removeEmbedsFromLine(line, id);
      if (cleaned !== line) {
        if (cleaned.trim() !== "") out.push(cleaned);
        continue;
      }
    }
    out.push(line);
  }
  return out.join("\n");
}

// src/store.ts
var BadgeStore = class {
  constructor(plugin) {
    this.settings = defaultSettings();
    this.ctx = null;
    this.plugin = plugin;
  }
  /**
   * 读取设置并做兼容迁移（不写库文件），让渲染时数据立即可用。
   * 素材文件的重生成单独走 regenerateAll（放到后台，避免启动早期写文件失败拖垮插件）。
   */
  async loadSettings() {
    const data = await this.plugin.loadData();
    if (data && Array.isArray(data.styles) && Array.isArray(data.badges)) {
      this.settings = { ...defaultSettings(), ...data };
      if (this.settings.sidebarView !== "list" && this.settings.sidebarView !== "grid") {
        this.settings.sidebarView = "list";
      }
      if (!Array.isArray(data.groups)) {
        this.settings.groups = [...new Set(this.settings.badges.map((b) => b.group).filter((g) => g !== ""))].sort();
      }
      for (const st of this.settings.styles) {
        if (typeof st.leftBg !== "string") st.leftBg = FALLBACK_PALETTE.leftBg;
        if (typeof st.rightBg !== "string") st.rightBg = FALLBACK_PALETTE.rightBg;
        if (typeof st.leftTextColor !== "string") st.leftTextColor = "";
        if (typeof st.rightTextColor !== "string") st.rightTextColor = "";
      }
      let migrated = false;
      for (const b of this.settings.badges) {
        if (typeof b.group !== "string") b.group = "";
        const target = b;
        if (migrateBadgeColors(target, this.settings.styles, this.defaultPalette())) migrated = true;
        if (migrateBadgeLogos(target)) migrated = true;
      }
      if (migrated) await this.save();
    } else {
      this.settings = defaultSettings();
      await this.save();
    }
  }
  async save() {
    await this.plugin.saveData(this.settings);
    this.plugin.bump();
  }
  measureText(text) {
    if (!this.ctx) this.ctx = document.createElement("canvas").getContext("2d");
    if (!this.ctx) return text.length * 11;
    this.ctx.font = `bold 11px ${FONT_STACK}`;
    return this.ctx.measureText(text).width;
  }
  /** 样式库里某个样式的配色（用于「套用样式」、新建徽章时的初始色） */
  paletteOfStyle(styleId) {
    const s = this.settings.styles.find((x) => x.id === styleId);
    if (!s) return null;
    return { leftBg: s.leftBg, rightBg: s.rightBg, leftTextColor: s.leftTextColor, rightTextColor: s.rightTextColor };
  }
  /** 新建徽章的初始配色：取自「默认样式」，样式库为空时用兜底色 */
  defaultPalette() {
    var _a, _b;
    return (_b = (_a = this.paletteOfStyle(this.settings.defaultStyleId)) != null ? _a : this.settings.styles[0]) != null ? _b : { ...FALLBACK_PALETTE };
  }
  /** 四个位置的图标（解析成可直接内联的片段） */
  logosOf(badge) {
    return {
      logoLeft: resolveLogo(badge.logoLeft),
      logoLeftInner: resolveLogo(badge.logoLeftInner),
      logoRightInner: resolveLogo(badge.logoRightInner),
      logoRight: resolveLogo(badge.logoRight)
    };
  }
  groups() {
    const set = new Set(this.settings.groups);
    for (const b of this.settings.badges) if (b.group !== "") set.add(b.group);
    return [...set].sort();
  }
  async addGroup(name) {
    const n = name.trim();
    if (n === "" || this.settings.groups.includes(n)) return;
    this.settings.groups.push(n);
    await this.save();
  }
  async renameGroup(oldName, newName) {
    const n = newName.trim();
    if (n === "" || n === oldName) return;
    this.settings.groups = this.settings.groups.filter((g) => g !== oldName && g !== n);
    this.settings.groups.push(n);
    for (const b of this.settings.badges) {
      if (b.group === oldName) b.group = n;
    }
    await this.save();
  }
  async clearGroup(name) {
    this.settings.groups = this.settings.groups.filter((g) => g !== name);
    for (const b of this.settings.badges) {
      if (b.group === name) b.group = "";
    }
    await this.save();
  }
  svgPath(badge) {
    return `${this.settings.assetsFolder}/badge-${badge.id}.svg`;
  }
  buildSvg(badge) {
    return buildBadgeSvg(
      { leftText: badge.leftText, rightText: badge.rightText, ...this.logosOf(badge) },
      badge,
      (t) => this.measureText(t)
    );
  }
  /** 编辑弹窗里的实时预览：用尚未保存的字段直接出图 */
  previewSvg(badge) {
    return buildBadgeSvg(
      { leftText: badge.leftText, rightText: badge.rightText, ...this.logosOf(badge) },
      badge,
      (t) => this.measureText(t)
    );
  }
  async ensureFolder() {
    const folder = this.plugin.app.vault.getAbstractFileByPath(this.settings.assetsFolder);
    if (!folder) await this.plugin.app.vault.createFolder(this.settings.assetsFolder);
  }
  async regenerateBadge(badge) {
    await this.ensureFolder();
    const path = this.svgPath(badge);
    const svg = this.buildSvg(badge);
    const file = this.plugin.app.vault.getAbstractFileByPath(path);
    if (file) await this.plugin.app.vault.modify(file, svg);
    else await this.plugin.app.vault.create(path, svg);
  }
  async regenerateAll() {
    for (const badge of this.settings.badges) await this.regenerateBadge(badge);
  }
  async renameAssetsFolder(newName) {
    const old = this.settings.assetsFolder;
    if (old === newName) return;
    this.settings.assetsFolder = newName;
    await this.ensureFolder();
    for (const badge of this.settings.badges) {
      const file = this.plugin.app.vault.getAbstractFileByPath(`${old}/badge-${badge.id}.svg`);
      if (file) await this.plugin.app.vault.rename(file, this.svgPath(badge));
    }
    await this.save();
  }
  async addBadge(partial) {
    const badge = { ...partial, id: nextNumericId(this.settings.badges.map((b) => b.id), false) };
    this.settings.badges.push(badge);
    await this.save();
    await this.regenerateBadge(badge);
    return badge;
  }
  async updateBadge(id, patch) {
    const badge = this.settings.badges.find((b) => b.id === id);
    if (!badge) return;
    Object.assign(badge, patch);
    await this.save();
    await this.regenerateBadge(badge);
  }
  async deleteBadge(id) {
    const badge = this.settings.badges.find((b) => b.id === id);
    this.settings.badges = this.settings.badges.filter((b) => b.id !== id);
    await this.save();
    if (!badge) return;
    await this.stripReferences(badge);
    await this.trashAsset(badge);
  }
  /** 把徽章的素材 SVG 移入回收站（正文里的引用已由 stripReferences 清掉） */
  async trashAsset(badge) {
    const file = this.plugin.app.vault.getAbstractFileByPath(this.svgPath(badge));
    if (file) await this.plugin.app.fileManager.trashFile(file);
  }
  /**
   * 清理素材文件夹里不属于任何徽章的 badge-xxx.svg（历史遗留的孤儿文件）。
   * 只认 badge-数字.svg 这一种命名，其他手动放进来的文件不动。返回清理数量。
   */
  async cleanOrphanAssets() {
    const folder = this.plugin.app.vault.getAbstractFileByPath(this.settings.assetsFolder);
    if (!(folder instanceof import_obsidian9.TFolder)) return 0;
    const ids = new Set(this.settings.badges.map((b) => b.id));
    let removed = 0;
    for (const child of [...folder.children]) {
      const m = /^badge-(\d+)\.svg$/.exec(child.name);
      if (!m || ids.has(m[1])) continue;
      await this.plugin.app.fileManager.trashFile(child);
      removed++;
    }
    return removed;
  }
  /** 删除徽章后，把全库正文里的标记行和已固化图片一并清掉 */
  async stripReferences(badge) {
    const needleName = `badge: ${badge.name}`;
    const needleSvg = `badge-${badge.id}.svg`;
    for (const file of this.plugin.app.vault.getMarkdownFiles()) {
      const text = await this.plugin.app.vault.cachedRead(file);
      if (!text.includes(needleName) && !text.includes(needleSvg)) continue;
      const next = stripBadgeReferences(text, badge.name, badge.id);
      if (next !== text) await this.plugin.app.vault.modify(file, next);
    }
  }
  async addStyle(partial) {
    const style = { ...partial, id: nextNumericId(this.settings.styles.map((s) => s.id), true) };
    this.settings.styles.push(style);
    await this.save();
    return style;
  }
  /** 样式只是取色模板：改样式不会改动任何已创建的徽章 */
  async updateStyle(id, patch) {
    const style = this.settings.styles.find((s) => s.id === id);
    if (!style) return;
    Object.assign(style, patch);
    await this.save();
  }
  /** 删样式同样不影响徽章：徽章的颜色早就复制在自己身上了 */
  async deleteStyle(id) {
    var _a, _b;
    this.settings.styles = this.settings.styles.filter((s) => s.id !== id);
    if (this.settings.defaultStyleId === id) {
      this.settings.defaultStyleId = (_b = (_a = this.settings.styles[0]) == null ? void 0 : _a.id) != null ? _b : "";
    }
    await this.save();
  }
};

// src/main.ts
var BadgePlugin = class extends import_obsidian10.Plugin {
  constructor() {
    super(...arguments);
    this.version = 0;
    /** 最近一次处于前台的 Markdown 笔记视图（点侧栏后活动视图会切到侧栏，靠它回退） */
    this.lastMarkdownView = null;
    this.listeners = [];
  }
  async onload() {
    this.store = new BadgeStore(this);
    this.registerView(SIDEBAR_VIEW_TYPE, (leaf) => new BadgeSidebarView(leaf, this));
    this.lastMarkdownView = this.app.workspace.getActiveViewOfType(import_obsidian10.MarkdownView);
    this.registerEvent(
      this.app.workspace.on("active-leaf-change", (leaf) => {
        const view = leaf == null ? void 0 : leaf.view;
        if (view instanceof import_obsidian10.MarkdownView && view.file) this.lastMarkdownView = view;
      })
    );
    registerMarkerSkin(this);
    registerBadgeDrop(this);
    this.addCommand({
      id: "insert-badge",
      name: "\u63D2\u5165\u5FBD\u7AE0\uFF1A\u641C\u7D22\u5E76\u63D2\u5165",
      callback: () => new BadgeInsertModal(this).open()
    });
    this.addCommand({
      id: "freeze-badges",
      name: "\u56FA\u5316\u672C\u7BC7\u5FBD\u7AE0\u4E3A\u56FE\u7247\uFF08\u8010\u7528\u5F62\u6001\uFF09",
      callback: () => void freezeActiveNote(this)
    });
    this.addCommand({
      id: "unfreeze-badges",
      name: "\u8FD8\u539F\u672C\u7BC7\u5FBD\u7AE0\u4E3A\u6807\u8BB0",
      callback: () => unfreezeActiveNote(this)
    });
    this.addRibbonIcon("shield", "\u5FBD\u7AE0\u5DE5\u574A\uFF1A\u63D2\u5165\u5FBD\u7AE0", () => void this.revealSidebar());
    this.addSettingTab(new BadgeSettingTab(this.app, this));
    await this.loadStore();
  }
  /** 装载徽章数据；失败时退回默认数据并提示，保证插件可用 */
  async loadStore() {
    try {
      await this.store.loadSettings();
    } catch (e) {
      console.error("[badge-studio] \u6570\u636E\u88C5\u8F7D\u5931\u8D25\uFF0C\u5DF2\u56DE\u9000\u5230\u9ED8\u8BA4\u6570\u636E", e);
      new import_obsidian10.Notice("\u5FBD\u7AE0\u5DE5\u574A\uFF1A\u6570\u636E\u88C5\u8F7D\u5931\u8D25\uFF0C\u5DF2\u4E34\u65F6\u4F7F\u7528\u9ED8\u8BA4\u6570\u636E\uFF08\u8BE6\u89C1\u5F00\u53D1\u8005\u63A7\u5236\u53F0\uFF09");
    }
    this.bump();
    this.refreshPreviews();
    void this.store.regenerateAll().catch((e) => {
      console.error("[badge-studio] \u7D20\u6750\u91CD\u751F\u6210\u5931\u8D25\uFF08\u4E4B\u540E\u7F16\u8F91\u5FBD\u7AE0\u65F6\u4F1A\u91CD\u65B0\u751F\u6210\uFF09", e);
    });
  }
  /** 让处于阅读模式的笔记重新渲染一次（刷新徽章显示） */
  refreshPreviews() {
    var _a, _b;
    for (const leaf of this.app.workspace.getLeavesOfType("markdown")) {
      const preview = (_a = leaf.view) == null ? void 0 : _a.previewMode;
      try {
        (_b = preview == null ? void 0 : preview.rerender) == null ? void 0 : _b.call(preview, true);
      } catch (e) {
      }
    }
  }
  async revealSidebar() {
    const existing = this.app.workspace.getLeavesOfType(SIDEBAR_VIEW_TYPE)[0];
    if (existing) {
      await this.app.workspace.revealLeaf(existing);
      return;
    }
    const leaf = this.app.workspace.getRightLeaf(false);
    if (!leaf) return;
    await leaf.setViewState({ type: SIDEBAR_VIEW_TYPE, active: true });
    await this.app.workspace.revealLeaf(leaf);
  }
  bump() {
    this.version++;
    for (const cb of this.listeners) cb();
  }
  onChange(cb) {
    this.listeners.push(cb);
    return () => {
      this.listeners = this.listeners.filter((f) => f !== cb);
    };
  }
};
var main_default = BadgePlugin;
