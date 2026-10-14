import { Plugin } from 'obsidian';

export default class BadgePlugin extends Plugin {
  async onload(): Promise<void> {
    console.log('badge-studio loaded');
  }
}
