import { Plugin } from 'obsidian';
import { registerTagSkin } from './tagskin.ts';
import { BadgeInsertModal } from './ui/insert.ts';
import { BadgeSidebarView, SIDEBAR_VIEW_TYPE } from './ui/sidebar.ts';
import { BadgeStore } from './store.ts';

export class BadgePlugin extends Plugin {
  store!: BadgeStore;
  version = 0;
  private listeners: Array<() => void> = [];

  async onload(): Promise<void> {
    this.store = new BadgeStore(this);
    await this.store.load();
    registerTagSkin(this);
    this.addCommand({
      id: 'insert-badge',
      name: '插入徽章：搜索并插入',
      callback: () => new BadgeInsertModal(this).open(),
    });
    this.registerView(SIDEBAR_VIEW_TYPE, (leaf) => new BadgeSidebarView(leaf, this));
    this.addRibbonIcon('shield', '徽章工坊：插入徽章', () => void this.revealSidebar());
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
