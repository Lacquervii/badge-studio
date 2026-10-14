import { Plugin } from 'obsidian';
import { BadgeStore } from './store.ts';

export class BadgePlugin extends Plugin {
  store!: BadgeStore;
  version = 0;
  private listeners: Array<() => void> = [];

  async onload(): Promise<void> {
    this.store = new BadgeStore(this);
    await this.store.load();
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
