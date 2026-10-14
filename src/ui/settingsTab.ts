import { AbstractInputSuggest, Modal, PluginSettingTab, Setting, TFile } from 'obsidian';
import type { App } from 'obsidian';
import type { BadgeDef, StyleDef } from '../core/types.ts';
import type { BadgePlugin } from '../main.ts';
import { insertBadgeAtCursor } from './insert.ts';

/** 「链接」输入框的笔记联想：选中的是完整路径，天然区分同名文件 */
class FileSuggest extends AbstractInputSuggest<TFile> {
  private onPick: (file: TFile) => void;

  constructor(app: App, inputEl: HTMLInputElement, onPick: (file: TFile) => void) {
    super(app, inputEl);
    this.onPick = onPick;
  }

  protected getSuggestions(query: string): TFile[] {
    const q = query.trim().toLowerCase();
    const files = this.app.vault.getMarkdownFiles();
    const matched =
      q === '' ? files.slice(0, 30) : files.filter((f) => f.path.toLowerCase().includes(q));
    matched.sort((a, b) => {
      const ai = a.basename.toLowerCase().startsWith(q) ? 0 : 1;
      const bi = b.basename.toLowerCase().startsWith(q) ? 0 : 1;
      return ai - bi || a.basename.localeCompare(b.basename);
    });
    return matched.slice(0, 30);
  }

  renderSuggestion(file: TFile, el: HTMLElement): void {
    el.createDiv({ text: file.basename });
    el.createDiv({ cls: 'bs-suggest-path', text: file.path });
  }

  selectSuggestion(file: TFile): void {
    this.setValue(file.path);
    this.onPick(file);
    this.close();
  }
}

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

function addTextColor(
  control: HTMLElement,
  auto: boolean,
  color: string,
  onChange: (auto: boolean, color: string) => void,
): void {
  const cb = control.createEl('input', { attr: { type: 'checkbox' } });
  cb.checked = auto;
  const picker = control.createEl('input', { attr: { type: 'color', value: auto ? '#000000' : color } });
  picker.style.display = auto ? 'none' : 'inline-block';
  picker.style.marginLeft = '6px';
  picker.style.verticalAlign = 'middle';
  const label = control.createEl('span', { cls: 'bs-n', text: auto ? '自动' : '自定义' });
  label.style.marginLeft = '4px';
  cb.addEventListener('change', () => {
    picker.style.display = cb.checked ? 'none' : 'inline-block';
    label.setText(cb.checked ? '自动' : '自定义');
    onChange(cb.checked, picker.value);
  });
  picker.addEventListener('input', () => onChange(false, picker.value));
}

export class StyleEditModal extends Modal {
  plugin: BadgePlugin;
  existing: StyleDef | null;
  name = '';
  leftBg = '#555555';
  rightBg = '#ffd400';
  leftAuto = true;
  rightAuto = true;
  leftTextColor = '#000000';
  rightTextColor = '#ffffff';

  constructor(plugin: BadgePlugin, existing: StyleDef | null) {
    super(plugin.app);
    this.plugin = plugin;
    this.existing = existing;
    if (existing) {
      this.name = existing.name;
      this.leftBg = existing.leftBg;
      this.rightBg = existing.rightBg;
      this.leftAuto = existing.leftTextColor === '';
      this.rightAuto = existing.rightTextColor === '';
      if (existing.leftTextColor !== '') this.leftTextColor = existing.leftTextColor;
      if (existing.rightTextColor !== '') this.rightTextColor = existing.rightTextColor;
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
    const leftTextRow = new Setting(contentEl).setName('左块文字').setDesc('自动＝按底色亮度黑白');
    addTextColor(leftTextRow.controlEl, this.leftAuto, this.leftTextColor, (auto, color) => {
      this.leftAuto = auto;
      this.leftTextColor = color;
    });
    const rightTextRow = new Setting(contentEl).setName('右块文字').setDesc('自动＝按底色亮度黑白');
    addTextColor(rightTextRow.controlEl, this.rightAuto, this.rightTextColor, (auto, color) => {
      this.rightAuto = auto;
      this.rightTextColor = color;
    });
    new Setting(contentEl).addButton((b) => {
      b.setButtonText('保存').setCta();
      b.onClick(async () => {
        if (this.name.trim() === '') return;
        const patch = {
          name: this.name.trim(),
          leftBg: this.leftBg,
          rightBg: this.rightBg,
          leftTextColor: this.leftAuto ? '' : this.leftTextColor,
          rightTextColor: this.rightAuto ? '' : this.rightTextColor,
        };
        if (this.existing) {
          await this.plugin.store.updateStyle(this.existing.id, patch);
        } else {
          await this.plugin.store.addStyle(patch);
        }
        this.close();
      });
    });
  }
  onClose(): void {
    this.contentEl.empty();
  }
}

export class BadgeEditModal extends Modal {
  plugin: BadgePlugin;
  existing: BadgeDef | null;
  name = '';
  leftText = '';
  rightText = '';
  styleId: string;
  link = '';
  group = '';

  constructor(plugin: BadgePlugin, existing: BadgeDef | null, presetGroup?: string) {
    super(plugin.app);
    this.plugin = plugin;
    this.existing = existing;
    this.styleId = plugin.store.settings.defaultStyleId;
    if (presetGroup !== undefined) this.group = presetGroup;
    if (existing) {
      this.name = existing.name;
      this.leftText = existing.leftText;
      this.rightText = existing.rightText;
      this.styleId = existing.styleId;
      this.link = existing.link;
      this.group = existing.group;
    }
  }

  onOpen(): void {
    const { contentEl } = this;
    this.setTitle(this.existing ? '编辑徽章' : '新建徽章');
    new Setting(contentEl).setName('名字（用于搜索/列表）').addText((t) => t.setValue(this.name).onChange((v) => (this.name = v)));
    new Setting(contentEl).setName('左字（留空＝单段）').addText((t) => t.setValue(this.leftText).onChange((v) => (this.leftText = v)));
    new Setting(contentEl).setName('右字').addText((t) => t.setValue(this.rightText).onChange((v) => (this.rightText = v)));
    new Setting(contentEl).setName('样式').addDropdown((d) => {
      for (const s of this.plugin.store.settings.styles) d.addOption(s.id, s.name);
      d.setValue(this.styleId);
      d.onChange((v) => (this.styleId = v));
    });
    const linkRow = new Setting(contentEl).setName('链接（选填：网址或笔记名）');
    const hint = contentEl.createDiv({ cls: 'bs-link-hint' });
    const updateHint = (): void => {
      const v = this.link.trim();
      if (v === '') {
        hint.setText('留空＝徽章不带链接，点击不跳转');
        return;
      }
      if (/^https?:\/\//i.test(v)) {
        hint.setText('外部网址，点击时用浏览器打开');
        return;
      }
      const base = v.split('/').pop()?.replace(/\.md$/, '') ?? v;
      const sameName = this.plugin.app.vault.getMarkdownFiles().filter((f) => f.basename === base);
      const dest = this.plugin.app.metadataCache.getFirstLinkpathDest(v, '');
      if (dest) {
        hint.setText(
          sameName.length > 1
            ? `→ ${dest.path}（库里有 ${sameName.length} 个同名笔记，建议从下拉选完整路径）`
            : `→ ${dest.path}`,
        );
      } else {
        hint.setText('⚠ 找不到这篇笔记，点击时会按这个名字打开（可能新建空笔记）');
      }
    };
    linkRow.addText((t) => {
      t.setValue(this.link);
      t.onChange((v) => {
        this.link = v;
        updateHint();
      });
      new FileSuggest(this.plugin.app, t.inputEl, (file) => {
        this.link = file.path;
        updateHint();
      });
    });
    updateHint();
    new Setting(contentEl).setName('分组（选填）').addText((t) => {
      t.setValue(this.group).onChange((v) => (this.group = v.trim()));
      t.inputEl.setAttribute('list', 'bs-group-datalist');
    });
    const dl = contentEl.createEl('datalist', { attr: { id: 'bs-group-datalist' } });
    for (const g of this.plugin.store.groups()) dl.createEl('option', { attr: { value: g } });
    const submit = async (insert: boolean): Promise<void> => {
      if (this.name.trim() === '' || this.rightText.trim() === '') return;
      const patch = {
        name: this.name.trim(),
        leftText: this.leftText.trim(),
        rightText: this.rightText.trim(),
        styleId: this.styleId,
        link: this.link.trim(),
        group: this.group,
      };
      let badge: BadgeDef;
      if (this.existing) {
        await this.plugin.store.updateBadge(this.existing.id, patch);
        badge = { ...this.existing, ...patch };
      } else {
        badge = await this.plugin.store.addBadge(patch);
      }
      this.close();
      if (insert) insertBadgeAtCursor(this.plugin, badge);
    };
    new Setting(contentEl)
      .addButton((b) => b.setButtonText('保存').onClick(() => void submit(false)))
      .addButton((b) => b.setButtonText('保存并插入').setCta().onClick(() => void submit(true)));
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

    new Setting(containerEl).setName('默认样式').setDesc('新建徽章、临时徽章未选样式时的默认配色；也是条目样式被删后的兜底').addDropdown((d) => {
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
      if (badge.group !== '') row.setDesc(`分组：${badge.group}`);
      row.controlEl.createEl('img', { attr: { src: svg, style: 'margin-right:8px', draggable: 'false' } });
      row.addButton((b) => b.setButtonText('编辑').onClick(() => new BadgeEditModal(this.plugin, badge).open()));
      row.addButton((b) => b.setButtonText('删除').setWarning().onClick(async () => {
        await this.plugin.store.deleteBadge(badge.id);
        this.display();
      }));
    }
    new Setting(containerEl).addButton((b) => b.setButtonText('新建标签').setCta().onClick(() => new BadgeEditModal(this.plugin, null).open()));
  }
}
