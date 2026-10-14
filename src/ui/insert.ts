import { MarkdownView, Notice, SuggestModal } from 'obsidian';
import type { TFile } from 'obsidian';
import { classifyLink } from '../core/resolve.ts';
import type { BadgeDef } from '../core/types.ts';
import type { BadgePlugin } from '../main.ts';

export async function insertBadgeAtCursor(plugin: BadgePlugin, badge: BadgeDef): Promise<void> {
  const app = plugin.app;
  const view = app.workspace.getActiveViewOfType(MarkdownView);
  if (!view || !view.file) {
    new Notice('请先打开一篇笔记再插入徽章');
    return;
  }
  let svgFile = app.vault.getAbstractFileByPath(plugin.store.svgPath(badge)) as TFile | null;
  if (!svgFile) {
    await plugin.store.regenerateBadge(badge);
    svgFile = app.vault.getAbstractFileByPath(plugin.store.svgPath(badge)) as TFile | null;
  }
  if (!svgFile) {
    new Notice('徽章图片文件生成失败，请检查素材文件夹设置');
    return;
  }
  const embed = app.fileManager.generateMarkdownLink(svgFile, view.file.path, undefined, true);
  let text = embed;
  const lk = classifyLink(badge.link);
  if (lk.kind === 'url') {
    text = `[${embed}](${lk.url})`;
  } else if (lk.kind === 'note') {
    const target = app.metadataCache.getFirstLinkpathDest(lk.name, view.file.path);
    const dest = target ? app.fileManager.generateMarkdownLink(target, view.file.path) : lk.name;
    text = `[${embed}](${dest})`;
  }
  const editor = view.editor;
  editor.replaceRange(text, editor.getCursor());
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
  onChooseItem(badge: BadgeDef): void {
    void insertBadgeAtCursor(this.plugin, badge);
  }
}
