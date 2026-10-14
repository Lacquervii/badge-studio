import { Plugin } from 'obsidian';
import { registerBadgeDrop } from './drop.ts';
import { freezeActiveNote, unfreezeActiveNote } from './freeze.ts';
import { registerMarkerSkin } from './markerskin.ts';
import { BadgeInsertModal } from './ui/insert.ts';
import { BadgeManagerView, MANAGER_VIEW_TYPE } from './ui/manager.ts';
import { BadgeSidebarView, SIDEBAR_VIEW_TYPE } from './ui/sidebar.ts';
import { BadgeSettingTab } from './ui/settingsTab.ts';
import { BadgeStore } from './store.ts';

export class BadgePlugin extends Plugin {
  store!: BadgeStore;
  version = 0;
  private listeners: Array<() => void> = [];

  async onload(): Promise<void> {
    this.store = new BadgeStore(this);
    await this.store.load();
    registerMarkerSkin(this);
    registerBadgeDrop(this);
    this.addCommand({
      id: 'insert-badge',
      name: '插入徽章：搜索并插入',
      callback: () => new BadgeInsertModal(this).open(),
    });
    this.addCommand({
      id: 'freeze-badges',
      name: '固化本篇徽章为图片（耐用形态）',
      callback: () => void freezeActiveNote(this),
    });
    this.addCommand({
      id: 'unfreeze-badges',
      name: '还原本篇徽章为标记',
      callback: () => unfreezeActiveNote(this),
    });
    this.registerView(SIDEBAR_VIEW_TYPE, (leaf) => new BadgeSidebarView(leaf, this));
    this.registerView(MANAGER_VIEW_TYPE, (leaf) => new BadgeManagerView(leaf, this));
    this.addRibbonIcon('shield', '徽章工坊：插入徽章', () => void this.revealSidebar());
    this.addCommand({
      id: 'open-badge-manager',
      name: '打开徽章工作台',
      callback: () => void this.revealManager(),
    });
    this.addSettingTab(new BadgeSettingTab(this.app, this));
  }

  async revealManager(): Promise<void> {
    const existing = this.app.workspace.getLeavesOfType(MANAGER_VIEW_TYPE)[0];
    if (existing) {
      await this.app.workspace.revealLeaf(existing);
      return;
    }
    const leaf = this.app.workspace.getLeaf('tab');
    await leaf.setViewState({ type: MANAGER_VIEW_TYPE, active: true });
    await this.app.workspace.revealLeaf(leaf);
  }

  async revealSidebar(): Promise<void> {
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

  bump(): void {
    this.version++;
    for (const cb of this.listeners) cb();
  }

  onChange(cb: () => void): () => void {
    this.listeners.push(cb);
    return () => {
      this.listeners = this.listeners.filter((f) => f !== cb);
    };
  }
}

export default BadgePlugin;
