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
        const pos = view.posAtCoords({ x: event.clientX, y: event.clientY }) ?? view.state.selection.main.head;
        const line = view.state.doc.lineAt(pos);
        const marker = markerText(name);
        if (line.text.trim() === '') {
          const insert = marker + '\n';
          view.dispatch({
            changes: { from: line.from, to: line.to, insert },
            selection: { anchor: line.from + insert.length },
            userEvent: 'input.drop',
          });
        } else {
          const insert = '\n' + marker + '\n';
          view.dispatch({
            changes: { from: line.to, insert },
            selection: { anchor: line.to + insert.length },
            userEvent: 'input.drop',
          });
        }
        view.focus();
        return true;
      },
    }),
  );
}
