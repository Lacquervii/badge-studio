import { Decoration, ViewPlugin, WidgetType } from '@codemirror/view';
import type { DecorationSet, EditorView, ViewUpdate } from '@codemirror/view';
import { inCodeBlock } from './cm.ts';
import { matchBadgeForTag } from './core/resolve.ts';
import type { ChipSpec } from './core/types.ts';
import type { BadgePlugin } from './main.ts';
import { makeChip } from './ui/chip.ts';

const TAG_RE = /#[\p{L}\p{N}_/-]+/gu;

function specForTag(plugin: BadgePlugin, tagName: string): ChipSpec {
  const { badges } = plugin.store.settings;
  const matched = matchBadgeForTag(tagName, badges);
  if (matched) {
    const style = plugin.store.styleOf(matched);
    return { leftText: matched.leftText, rightText: matched.rightText, leftBg: style.leftBg, rightBg: style.rightBg };
  }
  const d = plugin.store.defaultStyle();
  return { leftText: '', rightText: tagName, leftBg: d.leftBg, rightBg: d.rightBg };
}

class ChipWidget extends WidgetType {
  spec: ChipSpec;
  constructor(spec: ChipSpec) {
    super();
    this.spec = spec;
  }
  eq(other: ChipWidget): boolean {
    return JSON.stringify(this.spec) === JSON.stringify(other.spec);
  }
  toDOM(): HTMLElement {
    return makeChip(this.spec);
  }
  ignoreEvent(): boolean {
    return true;
  }
}

function buildDecorations(view: EditorView, plugin: BadgePlugin): DecorationSet {
  if (!plugin.store.settings.renderTags) return Decoration.none;
  const ranges: Array<{ from: number; to: number; deco: ReturnType<typeof Decoration.replace> }> = [];
  const text = view.state.doc.toString();
  TAG_RE.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = TAG_RE.exec(text)) !== null) {
    const from = m.index;
    const to = from + m[0].length;
    if (view.state.selection.ranges.some((r) => r.from < to && r.to > from)) continue;
    if (inCodeBlock(view, from)) continue;
    const spec = specForTag(plugin, m[0].slice(1));
    ranges.push({ from, to, deco: Decoration.replace({ widget: new ChipWidget(spec) }) });
  }
  ranges.sort((a, b) => a.from - b.from);
  return Decoration.set(ranges.map((r) => r.deco.range(r.from, r.to)), true);
}

export function registerTagSkin(plugin: BadgePlugin): void {
  plugin.registerMarkdownPostProcessor((el) => {
    if (!plugin.store.settings.renderTags) return;
    el.querySelectorAll('a.tag').forEach((a) => {
      const tag = (a.textContent ?? '').replace(/^#/, '');
      if (tag === '') return;
      a.replaceWith(makeChip(specForTag(plugin, tag)));
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
