import { Plugin } from 'obsidian';
import { registerTagSkin } from './tagskin.ts';
import { BadgeInsertModal } from './ui/insert.ts';
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
