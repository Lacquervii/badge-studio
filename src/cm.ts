import { syntaxTree } from '@codemirror/language';
import type { EditorView } from '@codemirror/view';

export function inCodeBlock(view: EditorView, pos: number): boolean {
  let node = syntaxTree(view.state).resolveInner(pos, 1);
  while (node) {
    if (/code|math|comment/i.test(node.name)) return true;
    node = node.parent as typeof node;
  }
  return false;
}
