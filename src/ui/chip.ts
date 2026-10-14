import { FONT_STACK, textColorFor } from '../core/svg.ts';
import type { ChipSpec } from '../core/types.ts';

export function makeChip(spec: ChipSpec): HTMLSpanElement {
  const chip = document.createElement('span');
  chip.className = 'bs-chip';
  chip.style.display = 'inline-flex';
  chip.style.height = '20px';
  chip.style.borderRadius = '4px';
  chip.style.overflow = 'hidden';
  chip.style.fontFamily = FONT_STACK;
  chip.style.fontSize = '11px';
  chip.style.fontWeight = 'bold';
  chip.style.lineHeight = '20px';
  chip.style.verticalAlign = 'middle';
  chip.style.whiteSpace = 'nowrap';

  const seg = (text: string, bg: string) => {
    const s = document.createElement('span');
    s.style.padding = '0 7px';
    s.style.background = bg;
    s.style.color = textColorFor(bg);
    s.textContent = text;
    return s;
  };

  if (spec.leftText !== '') chip.appendChild(seg(spec.leftText, spec.leftBg));
  chip.appendChild(seg(spec.rightText, spec.rightBg));
  return chip;
}
