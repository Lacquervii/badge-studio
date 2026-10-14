import { Decoration, ViewPlugin, WidgetType } from '@codemirror/view';
import type { DecorationSet, EditorView, ViewUpdate } from '@codemirror/view';
import type { Range } from '@codemirror/state';
import { inCodeBlock } from './cm.ts';
import { findMarkerRuns, MARKER_RE } from './core/parse.ts';
import { classifyLink } from './core/resolve.ts';
import type { BadgeDef } from './core/types.ts';
import type { BadgePlugin } from './main.ts';
import { makeChip } from './ui/chip.ts';

function chipFor(plugin: BadgePlugin, badge: BadgeDef): HTMLSpanElement {
  const style = plugin.store.styleOf(badge);
  return makeChip({ leftText: badge.leftText, rightText: badge.rightText, leftBg: style.leftBg, rightBg: style.rightBg });
}

function badgesForNames(plugin: BadgePlugin, names: string[]): BadgeDef[] | null {
  const badges: BadgeDef[] = [];
  for (const n of names) {
    const b = plugin.store.settings.badges.find((x) => x.name === n);
    if (!b) return null;
    badges.push(b);
  }
  return badges;
}

class RowWidget extends WidgetType {
  plugin: BadgePlugin;
  ids: string[];
  version: number;
  constructor(plugin: BadgePlugin, badges: BadgeDef[]) {
    super();
    this.plugin = plugin;
    this.ids = badges.map((b) => b.id);
    this.version = plugin.version;
  }
  eq(other: RowWidget): boolean {
    return this.ids.join(',') === other.ids.join(',') && this.version === other.version;
  }
  toDOM(): HTMLElement {
    const row = document.createElement('div');
    row.className = 'bs-marker-row';
    for (const id of this.ids) {
      const badge = this.plugin.store.settings.badges.find((b) => b.id === id);
      if (badge) row.appendChild(chipFor(this.plugin, badge));
    }
    return row;
  }
  ignoreEvent(): boolean {
    return false;
  }
}

function buildDecorations(view: EditorView, plugin: BadgePlugin): DecorationSet {
  const info: Array<{ text: string; from: number; to: number }> = [];
  for (let i = 1; i <= view.state.doc.lines; i++) {
    const ln = view.state.doc.line(i);
    info.push({ text: ln.text, from: ln.from, to: ln.to });
  }
  const runs = findMarkerRuns(info.map((l) => l.text));
  const deco: Array<Range<Decoration>> = [];
  for (const run of runs) {
    const from = info[run.startLine].from;
    const to = info[run.endLine].to;
    if (view.state.selection.ranges.some((r) => r.from <= to && r.to >= from)) continue;
    if (inCodeBlock(view, from)) continue;
    const badges = badgesForNames(plugin, run.names);
    if (!badges) continue;
    deco.push(Decoration.replace({ widget: new RowWidget(plugin, badges), block: true }).range(from, to));
  }
  return Decoration.set(deco, true);
}

function markerOnlyParagraph(p: HTMLElement): string[] | null {
  const names: string[] = [];
  for (const node of Array.from(p.childNodes)) {
    if (node.nodeName === 'BR') continue;
    if (node.nodeType === Node.TEXT_NODE) {
      const t = (node.textContent ?? '').trim();
      if (t === '') continue;
      const m = MARKER_RE.exec(t);
      if (!m) return null;
      names.push(m[1]);
    } else {
      return null;
    }
  }
  return names.length > 0 ? names : null;
}

function openBadgeLink(plugin: BadgePlugin, badge: BadgeDef, sourcePath: string): void {
  const lk = classifyLink(badge.link);
  if (lk.kind === 'url') {
    window.open(lk.url);
  } else if (lk.kind === 'note') {
    plugin.app.workspace.openLinkText(lk.name, sourcePath);
  }
}

export function registerMarkerSkin(plugin: BadgePlugin): void {
  plugin.registerMarkdownPostProcessor((el, ctx) => {
    el.querySelectorAll('p').forEach((p) => {
      const names = markerOnlyParagraph(p as HTMLElement);
      if (!names) return;
      const badges = badgesForNames(plugin, names);
      if (!badges) return;
      const row = el.createDiv({ cls: 'bs-marker-row' });
      for (const b of badges) {
        const chip = chipFor(plugin, b);
        if (b.link !== '') {
          chip.style.cursor = 'pointer';
          chip.addEventListener('click', () => openBadgeLink(plugin, b, ctx.sourcePath));
        }
        row.appendChild(chip);
      }
      p.replaceWith(row);
    });
  });

  plugin.registerEditorExtension(
    ViewPlugin.fromClass(
      class {
        decorations: DecorationSet;
        version: number;
        constructor(view: EditorView) {
          this.version = plugin.version;
          this.decorations = buildDecorations(view, plugin);
        }
        update(u: ViewUpdate) {
          if (u.docChanged || u.selectionSet || this.version !== plugin.version) {
            this.version = plugin.version;
            this.decorations = buildDecorations(u.view, plugin);
          }
        }
      },
      { decorations: (v) => v.decorations },
    ),
  );
}
