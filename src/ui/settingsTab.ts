import { App, Modal, PluginSettingTab, Setting } from 'obsidian';
import type { BadgeDef, StyleDef } from '../core/types.ts';
import type { BadgePlugin } from '../main.ts';

function addColor(control: HTMLElement, value: string, onChange: (v: string) => void): void {
  const picker = control.createEl('input', { attr: { type: 'color', value } });
  const text = control.createEl('input', { attr: { type: 'text', value, size: '8' } });
  picker.addEventListener('input', () => {
    text.value = picker.value;
    onChange(picker.value);
  });
  text.addEventListener('change', () => {
    const v = text.value.trim();
    if (/^#[0-9a-fA-F]{6}$/.test(v)) {
      picker.value = v;
      onChange(v);
    } else {
      text.value = picker.value;
    }
  });
}

class StyleEditModal extends Modal {
  plugin: BadgePlugin;
  existing: StyleDef | null;
  name = '';
  leftBg = '#555555';
  rightBg = '#ffd400';

  constructor(plugin: BadgePlugin, existing: StyleDef | null) {
    super(plugin.app);
    this.plugin = plugin;
    this.existing = existing;
    if (existing) {
      this.name = existing.name;
      this.leftBg = existing.leftBg;
      this.rightBg = existing.rightBg;
    }
  }

  onOpen(): void {
    const { contentEl } = this;
    this.setTitle(this.existing ? '编辑样式' : '新建样式');
    new Setting(contentEl).setName('名字').addText((t) => {
      t.setValue(this.name);
      t.onChange((v) => (this.name = v));
    });
    const leftRow = new Setting(contentEl).setName('左块颜色');
    addColor(leftRow.controlEl, this.leftBg, (v) => (this.leftBg = v));
    const rightRow = new Setting(contentEl).setName('右块颜色');
    addColor(rightRow.controlEl, this.rightBg, (v) => (this.rightBg = v));
    new Setting(contentEl).addButton((b) => {
      b.setButtonText('保存').setCta();
      b.onClick(async () => {
        if (this.name.trim() === '') return;
        if (this.existing) {
          await this.plugin.store.updateStyle(this.existing.id, { name: this.name.trim(), leftBg: this.leftBg, rightBg: this.rightBg });
        } else {
          await this.plugin.store.addStyle({ name: this.name.trim(), leftBg: this.leftBg, rightBg: this.rightBg });
        }
        this.close();
      });
    });
  }
  onClose(): void {
    this.contentEl.empty();
  }
}

class BadgeEditModal extends Modal {
  plugin: BadgePlugin;
  existing: BadgeDef | null;
  name = '';
  leftText = '';
  rightText = '';
  styleId: string;
  tag = '';
  link = '';

  constructor(plugin: BadgePlugin, existing: BadgeDef | null) {
    super(plugin.app);
    this.plugin = plugin;
    this.existing = existing;
    this.styleId = plugin.store.settings.defaultStyleId;
    if (existing) {
      this.name = existing.name;
      this.leftText = existing.leftText;
      this.rightText = existing.rightText;
      this.styleId = existing.styleId;
      this.tag = existing.tag;
      this.link = existing.link;
    }
  }

  onOpen(): void {
    const { contentEl } = this;
    this.setTitle(this.existing ? '编辑标签' : '新建标签');
    new Setting(contentEl).setName('名字（用于搜索/列表）').addText((t) => t.setValue(this.name).onChange((v) => (this.name = v)));
    new Setting(contentEl).setName('左字（留空＝单段）').addText((t) => t.setValue(this.leftText).onChange((v) => (this.leftText = v)));
    new Setting(contentEl).setName('右字').addText((t) => t.setValue(this.rightText).onChange((v) => (this.rightText = v)));
    new Setting(contentEl).setName('样式').addDropdown((d) => {
      for (const s of this.plugin.store.settings.styles) d.addOption(s.id, s.name);
      d.setValue(this.styleId);
      d.onChange((v) => (this.styleId = v));
    });
    new Setting(contentEl).setName('对应 #标签（选填）').addText((t) => t.setValue(this.tag).onChange((v) => (this.tag = v.replace(/^#/, ''))));
    new Setting(contentEl).setName('链接（选填：网址或笔记名）').addText((t) => t.setValue(this.link).onChange((v) => (this.link = v)));
    new Setting(contentEl).addButton((b) => {
      b.setButtonText('保存').setCta();
      b.onClick(async () => {
        if (this.name.trim() === '' || this.rightText.trim() === '') return;
        const patch = { name: this.name.trim(), leftText: this.leftText.trim(), rightText: this.rightText.trim(), styleId: this.styleId, tag: this.tag.trim(), link: this.link.trim() };
        if (this.existing) await this.plugin.store.updateBadge(this.existing.id, patch);
        else await this.plugin.store.addBadge(patch);
        this.close();
      });
    });
  }
  onClose(): void {
    this.contentEl.empty();
  }
}

export class BadgeSettingTab extends PluginSettingTab {
  plugin: BadgePlugin;
  constructor(app: App, plugin: BadgePlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();

    new Setting(containerEl).setName('把 #标签 渲染成徽章').setDesc('实时渲染；关闭或卸载插件后 #标签 恢复原样').addToggle((t) => {
      t.setValue(this.plugin.store.settings.renderTags);
      t.onChange(async (v) => {
        this.plugin.store.settings.renderTags = v;
        await this.plugin.store.save();
      });
    });

    new Setting(containerEl).setName('默认样式').setDesc('#标签 未匹配到条目时使用的样式').addDropdown((d) => {
      for (const s of this.plugin.store.settings.styles) d.addOption(s.id, s.name);
      d.setValue(this.plugin.store.settings.defaultStyleId);
      d.onChange(async (v) => {
        this.plugin.store.settings.defaultStyleId = v;
        await this.plugin.store.save();
      });
    });

    new Setting(containerEl).setName('素材文件夹名').setDesc('SVG 小图存放的库内文件夹；改名会自动搬迁文件').addText((t) => {
      t.setValue(this.plugin.store.settings.assetsFolder);
      t.inputEl.addEventListener('change', async () => {
        const v = t.getValue().trim();
        if (v === '' || v === this.plugin.store.settings.assetsFolder) return;
        await this.plugin.store.renameAssetsFolder(v);
        this.display();
      });
    });

    containerEl.createEl('h3', { text: '样式库' });
    for (const style of this.plugin.store.settings.styles) {
      const row = new Setting(containerEl).setName(style.name).setDesc(`左 ${style.leftBg} ／ 右 ${style.rightBg}`);
      row.controlEl.createSpan({ cls: 'bs-swatch', attr: { style: `background:${style.leftBg}` } });
      row.controlEl.createSpan({ cls: 'bs-swatch', attr: { style: `background:${style.rightBg}` } });
      row.addButton((b) => b.setButtonText('编辑').onClick(() => new StyleEditModal(this.plugin, style).open()));
      row.addButton((b) => b.setButtonText('删除').setWarning().onClick(async () => {
        await this.plugin.store.deleteStyle(style.id);
        this.display();
      }));
    }
    new Setting(containerEl).addButton((b) => b.setButtonText('新建样式').setCta().onClick(() => new StyleEditModal(this.plugin, null).open()));

    containerEl.createEl('h3', { text: '标签库' });
    for (const badge of this.plugin.store.settings.badges) {
      const svg = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(this.plugin.store.buildSvg(badge));
      const row = new Setting(containerEl).setName(badge.name);
      row.controlEl.createEl('img', { attr: { src: svg, style: 'margin-right:8px' } });
      row.addButton((b) => b.setButtonText('编辑').onClick(() => new BadgeEditModal(this.plugin, badge).open()));
      row.addButton((b) => b.setButtonText('删除').setWarning().onClick(async () => {
        await this.plugin.store.deleteBadge(badge.id);
        this.display();
      }));
    }
    new Setting(containerEl).addButton((b) => b.setButtonText('新建标签').setCta().onClick(() => new BadgeEditModal(this.plugin, null).open()));
  }
}
