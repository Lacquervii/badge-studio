import { Decoration, ViewPlugin, WidgetType } from '@codemirror/view';
import type { DecorationSet, EditorView, ViewUpdate } from '@codemirror/view';
import type { Range } from '@codemirror/state';
import { inCodeBlock } from './cm.ts';
import { MARKER_RE, parseBadgeMarker } from './core/parse.ts';
import { classifyLink } from './core/resolve.ts';
import type { BadgeDef } from './core/types.ts';
import type { BadgePlugin } from './main.ts';
import { makeChip } from './ui/chip.ts';

function chipFor(plugin: BadgePlugin, badge: BadgeDef): HTMLSpanElement {
  const style = plugin.store.styleOf(badge);
  return makeChip({
    leftText: badge.leftText,
    rightText: badge.rightText,
    leftBg: style.leftBg,
    rightBg: style.rightBg,
    leftTextColor: style.leftTextColor,
    rightTextColor: style.rightTextColor,
  });
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

/** 编辑模式：单行内联芯片 widget。范围只在单行内，无跨行/块级边界情况。 */
class ChipWidget extends WidgetType {
  plugin: BadgePlugin;
  id: string;
  version: number;
  constructor(plugin: BadgePlugin, id: string) {
    super();
    this.plugin = plugin;
    this.id = id;
    this.version = plugin.version;
  }
  eq(other: ChipWidget): boolean {
    return this.id === other.id && this.version === other.version;
  }
  toDOM(): HTMLSpanElement {
    const badge = this.plugin.store.settings.badges.find((b) => b.id === this.id);
    if (!badge) return document.createElement('span');
    const chip = chipFor(this.plugin, badge);
    if (badge.link !== '') {
      chip.style.cursor = 'pointer';
      chip.title = `点击跳转：${badge.link}`;
      chip.addEventListener('click', () => {
        const sourcePath = this.plugin.app.workspace.getActiveFile()?.path ?? '';
        openBadgeLink(this.plugin, badge, sourcePath);
      });
    }
    return chip;
  }
  ignoreEvent(): boolean {
    return false;
  }
}

function buildDecorations(view: EditorView, plugin: BadgePlugin): DecorationSet {
  const deco: Array<Range<Decoration>> = [];
  const sel = view.state.selection;
  for (let i = 1; i <= view.state.doc.lines; i++) {
    const ln = view.state.doc.line(i);
    const name = parseBadgeMarker(ln.text);
    if (name === null) continue;
    // 光标（含行首/行尾）落在标记行上时显示原文，便于编辑
    if (sel.ranges.some((r) => r.from <= ln.to && r.to >= ln.from)) continue;
    if (inCodeBlock(view, ln.from)) continue;
    const badge = plugin.store.settings.badges.find((b) => b.name === name);
    if (!badge) continue;
    deco.push(Decoration.replace({ widget: new ChipWidget(plugin, badge.id) }).range(ln.from, ln.to));
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
  // 阅读模式：纯标记段落 → 一排徽章（横排合并，带链接可点击）
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

  // 编辑模式（实时预览）：每个标记行一个内联芯片
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
