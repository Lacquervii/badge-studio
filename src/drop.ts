import { EditorView } from '@codemirror/view';
import type { Plugin } from 'obsidian';
import { markerText } from './core/parse.ts';

export const BADGE_MIME = 'application/x-badge-studio';

export function registerBadgeDrop(plugin: Plugin): void {
  plugin.registerEditorExtension(
    EditorView.domEventHandlers({
      drop(event: DragEvent, view: EditorView): boolean {
        const name = event.dataTransfer?.getData(BADGE_MIME);
        if (!name) return false;
        event.preventDefault();
        // 阻止 Obsidian / 其他插件对同一次拖放再插入一遍（防止内容重复）
        event.stopPropagation();
        const pos = view.posAtCoords({ x: event.clientX, y: event.clientY }) ?? view.state.selection.main.head;
        const line = view.state.doc.lineAt(pos);
        const marker = markerText(name);
        if (line.text.trim() === '') {
          // 空行：直接替换为标记行，光标落到下一行行首
          view.dispatch({
            changes: { from: line.from, to: line.to, insert: marker + '\n' },
            selection: { anchor: line.from + marker.length + 1 },
            userEvent: 'input.drop',
          });
        } else {
          // 有内容的行：标记行插到该行之后，光标落到标记行下一行行首
          view.dispatch({
            changes: { from: line.to, insert: '\n' + marker + '\n' },
            selection: { anchor: line.to + marker.length + 2 },
            userEvent: 'input.drop',
          });
        }
        // drop 事件内同步 focus 会被随后的 dragend 默认行为抢走，延迟再聚焦一次
        view.focus();
        setTimeout(() => view.focus(), 0);
        return true;
      },
    }),
  );
}
