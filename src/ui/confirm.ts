import { Modal, Setting } from 'obsidian';
import type { App } from 'obsidian';

export class ConfirmModal extends Modal {
  private text: string;
  private confirmText: string;
  private onConfirm: () => void;

  constructor(app: App, text: string, onConfirm: () => void, confirmText = '确认删除') {
    super(app);
    this.text = text;
    this.onConfirm = onConfirm;
    this.confirmText = confirmText;
  }

  onOpen(): void {
    const { contentEl } = this;
    contentEl.createEl('p', { text: this.text });
    new Setting(contentEl)
      .addButton((b) => b.setButtonText('取消').onClick(() => this.close()))
      .addButton((b) =>
        b
          .setButtonText(this.confirmText)
          .setWarning()
          .onClick(() => {
            this.close();
            this.onConfirm();
          }),
      );
  }

  onClose(): void {
    this.contentEl.empty();
  }
}
