import { ItemView, Setting } from 'obsidian';
import type { WorkspaceLeaf } from 'obsidian';
import { BADGE_MIME } from '../drop.ts';
import { markerText } from '../core/parse.ts';
import type { BadgeDef } from '../core/types.ts';
import { freezeActiveNote, unfreezeActiveNote } from '../freeze.ts';
import type { BadgePlugin } from '../main.ts';
import { insertBadgeAtCursor } from './insert.ts';

export const SIDEBAR_VIEW_TYPE = 'badge-studio-sidebar';

export class BadgeSidebarView extends ItemView {
  plugin: BadgePlugin;
  private unsubscribe: (() => void) | null = null;
  private search = '';

  constructor(leaf: WorkspaceLeaf, plugin: BadgePlugin) {
    super(leaf);
    this.plugin = plugin;
  }

  getViewType(): string {
    return SIDEBAR_VIEW_TYPE;
  }
  getDisplayText(): string {
    return '徽章工坊';
  }
  getIcon(): string {
    return 'shield';
  }

  async onOpen(): Promise<void> {
    this.unsubscribe = this.plugin.onChange(() => this.render());
    this.render();
  }
  async onClose(): Promise<void> {
    if (this.unsubscribe) this.unsubscribe();
  }

  private dataUri(badge: BadgeDef): string {
    return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(this.plugin.store.buildSvg(badge));
  }

  private render(): void {
    const root = this.containerEl.children[1] as HTMLElement;
    root.empty();
    root.addClass('bs-sidebar');

    const listEl = root.createDiv({ cls: 'bs-list' });

    new Setting(root).addSearch((s) => {
      s.setPlaceholder('搜索标签…');
      s.onChange((v) => {
        this.search = v.trim().toLowerCase();
        this.renderList(listEl);
      });
    });

    this.renderList(listEl);

    const formWrap = root.createDiv({ cls: 'bs-temp-form', attr: { style: 'display:none' } });
    this.buildTempForm(formWrap);

    new Setting(root)
      .addButton((b) => {
        b.setButtonText('临时徽章').onClick(() => {
          formWrap.style.display = formWrap.style.display === 'none' ? 'block' : 'none';
        });
      })
      .addButton((b) => {
        b.setButtonText('固化本篇').onClick(() => void freezeActiveNote(this.plugin));
      })
      .addButton((b) => {
        b.setButtonText('还原本篇').onClick(() => unfreezeActiveNote(this.plugin));
      })
      .addButton((b) => {
        b.setButtonText('管理面板').onClick(() => void this.plugin.revealManager());
      })
      .addButton((b) => {
        b.setButtonText('打开设置').onClick(() => {
          (this.app as unknown as { setting?: { openTabById: (id: string) => unknown } }).setting?.openTabById(this.plugin.manifest.id);
        });
      });
  }

  private renderList(listEl: HTMLElement): void {
    listEl.empty();
    const badges = this.plugin.store.settings.badges.filter((b) => b.name.toLowerCase().includes(this.search));
    const byGroup = new Map<string, BadgeDef[]>();
    for (const b of badges) {
      const arr = byGroup.get(b.group) ?? [];
      arr.push(b);
      byGroup.set(b.group, arr);
    }
    const order = [...byGroup.keys()].filter((g) => g !== '').sort();
    if (byGroup.has('')) order.push('');
    for (const g of order) {
      if (g !== '') listEl.createDiv({ cls: 'bs-group-header', text: g });
      for (const badge of byGroup.get(g)!) {
        const row = listEl.createDiv({ cls: 'bs-row' });
        row.createEl('img', { attr: { src: this.dataUri(badge), draggable: 'false' } });
        row.createSpan({ text: badge.name });
        row.setAttribute('draggable', 'true');
        row.addEventListener('dragstart', (e) => {
          if (e.dataTransfer) {
            e.dataTransfer.setData(BADGE_MIME, badge.name);
            e.dataTransfer.setData('text/plain', markerText(badge.name));
            e.dataTransfer.effectAllowed = 'copy';
          }
        });
        row.onClickEvent(() => insertBadgeAtCursor(this.plugin, badge));
      }
    }
    if (badges.length === 0) listEl.createDiv({ cls: 'bs-empty', text: '没有匹配的标签' });
  }

  private buildTempForm(wrap: HTMLElement): void {
    let leftText = '';
    let rightText = '';
    let styleId = this.plugin.store.settings.defaultStyleId;
    new Setting(wrap).setName('左字（留空＝单段）').addText((t) => t.onChange((v) => (leftText = v)));
    new Setting(wrap).setName('右字').addText((t) => t.onChange((v) => (rightText = v)));
    new Setting(wrap).setName('样式').addDropdown((d) => {
      for (const s of this.plugin.store.settings.styles) d.addOption(s.id, s.name);
      d.setValue(styleId);
      d.onChange((v) => (styleId = v));
    });
    new Setting(wrap).addButton((b) => {
      b.setButtonText('生成并插入').setCta();
      b.onClick(async () => {
        if (rightText.trim() === '') return;
        const n = this.plugin.store.settings.badges.filter((x) => x.name.startsWith('临时')).length + 1;
        const badge = await this.plugin.store.addBadge({
          name: `临时 ${n}`,
          leftText: leftText.trim(),
          rightText: rightText.trim(),
          styleId,
          tag: '',
          link: '',
          group: '',
        });
        insertBadgeAtCursor(this.plugin, badge);
      });
    });
  }
}
