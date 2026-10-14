import { MarkdownView, Notice, Plugin } from 'obsidian';
import { registerBadgeDrop } from './drop.ts';
import { freezeActiveNote, unfreezeActiveNote } from './freeze.ts';
import { registerMarkerSkin } from './markerskin.ts';
import { BadgeInsertModal } from './ui/insert.ts';
import { BadgeSidebarView, SIDEBAR_VIEW_TYPE } from './ui/sidebar.ts';
import { BadgeSettingTab } from './ui/settingsTab.ts';
import { BadgeStore } from './store.ts';

export class BadgePlugin extends Plugin {
  store!: BadgeStore;
  version = 0;
  /** 最近一次处于前台的 Markdown 笔记视图（点侧栏后活动视图会切到侧栏，靠它回退） */
  lastMarkdownView: MarkdownView | null = null;
  private listeners: Array<() => void> = [];

  async onload(): Promise<void> {
    this.store = new BadgeStore(this);
    // 先把视图、命令等全部注册好，再做任何可能失败的 I/O。
    // 注册一旦被跳过，工作区里残留的侧栏标签页就会显示「插件不再活动」。
    this.registerView(SIDEBAR_VIEW_TYPE, (leaf) => new BadgeSidebarView(leaf, this));
    this.lastMarkdownView = this.app.workspace.getActiveViewOfType(MarkdownView);
    this.registerEvent(
      this.app.workspace.on('active-leaf-change', (leaf) => {
        const view = leaf?.view;
        if (view instanceof MarkdownView && view.file) this.lastMarkdownView = view;
      }),
    );
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
    this.addRibbonIcon('shield', '徽章工坊：插入徽章', () => void this.revealSidebar());
    this.addSettingTab(new BadgeSettingTab(this.app, this));

    // 数据装载放在注册之后（注册被跳过会显示「插件不再活动」），但同步等它完成：
    // 阅读视图渲染徽章时若数据还没到位，就会退回显示「badge: 名字」原文
    await this.loadStore();
  }

  /** 装载徽章数据；失败时退回默认数据并提示，保证插件可用 */
  private async loadStore(): Promise<void> {
    try {
      await this.store.loadSettings();
    } catch (e) {
      console.error('[badge-studio] 数据装载失败，已回退到默认数据', e);
      new Notice('徽章工坊：数据装载失败，已临时使用默认数据（详见开发者控制台）');
    }
    this.bump();
    // 已经渲染好的阅读视图可能处理过一次「找不到徽章」，这里让它重新跑一遍
    this.refreshPreviews();
    // 素材文件重生成放后台：启动早期库文件可能未就绪，失败也不影响插件
    void this.store.regenerateAll().catch((e) => {
      console.error('[badge-studio] 素材重生成失败（之后编辑徽章时会重新生成）', e);
    });
  }

  /** 让处于阅读模式的笔记重新渲染一次（刷新徽章显示） */
  private refreshPreviews(): void {
    for (const leaf of this.app.workspace.getLeavesOfType('markdown')) {
      const preview = (leaf.view as { previewMode?: { rerender?: (full?: boolean) => void } } | null)?.previewMode;
      try {
        preview?.rerender?.(true);
      } catch {
        /* 内部 API，失败就忽略 */
      }
    }
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
