import { MarkdownView, Notice, SuggestModal } from 'obsidian';
import { markerText } from '../core/parse.ts';
import type { BadgeDef } from '../core/types.ts';
import type { BadgePlugin } from '../main.ts';

/** 侧栏被点开时活动视图会变成侧栏，回退到最近使用的 Markdown 笔记 */
function resolveMarkdownView(plugin: BadgePlugin): MarkdownView | null {
  const active = plugin.app.workspace.getActiveViewOfType(MarkdownView);
  if (active?.file) return active;
  const last = plugin.lastMarkdownView;
  if (last?.file && plugin.app.workspace.getLeavesOfType('markdown').some((l) => l === last.leaf)) return last;
  for (const leaf of plugin.app.workspace.getLeavesOfType('markdown')) {
    const view = leaf.view;
    if (view instanceof MarkdownView && view.file) return view;
  }
  return null;
}

export function insertBadgeAtCursor(plugin: BadgePlugin, badge: BadgeDef): void {
  const view = resolveMarkdownView(plugin);
  if (!view || !view.file) {
    new Notice('请先打开一篇笔记再插入徽章');
    return;
  }
  const editor = view.editor;
  const cursor = editor.getCursor();
  const line = editor.getLine(cursor.line);
  const marker = markerText(badge.name);
  let nextLine: number;
  if (line.trim() === '') {
    // 空行：整行换成标记行
    editor.replaceRange(marker + '\n', { line: cursor.line, ch: 0 }, { line: cursor.line, ch: line.length });
    nextLine = cursor.line + 1;
  } else {
    // 非空行：标记行插到本行之后
    editor.replaceRange('\n' + marker + '\n', { line: cursor.line, ch: line.length });
    nextLine = cursor.line + 2;
  }
  // 光标落到标记行下一行行首：徽章立即渲染，继续打字不会破坏标记
  editor.setCursor({ line: nextLine, ch: 0 });
  void plugin.app.workspace.revealLeaf(view.leaf);
  editor.focus();
}

export class BadgeInsertModal extends SuggestModal<BadgeDef> {
  plugin: BadgePlugin;
  constructor(plugin: BadgePlugin) {
    super(plugin.app);
    this.plugin = plugin;
    this.setPlaceholder('输入标签名搜索…');
  }
  getSuggestions(query: string): BadgeDef[] {
    const q = query.trim().toLowerCase();
    return this.plugin.store.settings.badges.filter((b) => b.name.toLowerCase().includes(q));
  }
  renderSuggestion(badge: BadgeDef, el: HTMLElement): void {
    el.createSpan({ text: badge.name });
  }
  onChooseSuggestion(badge: BadgeDef): void {
    insertBadgeAtCursor(this.plugin, badge);
  }
}
