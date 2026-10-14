import { MarkdownView, Notice, SuggestModal } from 'obsidian';
import { markerText } from '../core/parse.ts';
import type { BadgeDef } from '../core/types.ts';
import type { BadgePlugin } from '../main.ts';

export function insertBadgeAtCursor(plugin: BadgePlugin, badge: BadgeDef): void {
  const view = plugin.app.workspace.getActiveViewOfType(MarkdownView);
  if (!view || !view.file) {
    new Notice('请先打开一篇笔记再插入徽章');
    return;
  }
  view.editor.replaceRange(markerText(badge.name) + '\n', view.editor.getCursor());
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
