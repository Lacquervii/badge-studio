import { FONT_STACK, LOGO_GAP, LOGO_PAD, LOGO_SIZE, PAD, resolveTextColor } from '../core/svg.ts';
import type { ChipSpec, LogoSpec } from '../core/types.ts';

/** 单个图标的 <svg>：颜色跟随所在段落的文字色 */
function iconSvg(logo: LogoSpec, color: string, size: number): SVGSVGElement {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('width', String(size));
  svg.setAttribute('height', String(size));
  svg.style.display = 'block';
  if (logo.filled) {
    svg.setAttribute('fill', color);
  } else {
    svg.setAttribute('fill', 'none');
    svg.setAttribute('stroke', color);
    svg.setAttribute('stroke-width', '2');
    svg.setAttribute('stroke-linecap', 'round');
    svg.setAttribute('stroke-linejoin', 'round');
  }
  svg.innerHTML = logo.inner.replace(/currentColor/g, color);
  return svg;
}

/**
 * 一组图标：背景与所在段落一致。
 * lead＝段首（最左一枚贴段边），trail＝段尾（最右一枚贴段边）；图标之间与图标-文字之间留 LOGO_GAP。
 */
function iconGroup(
  logos: LogoSpec[],
  bg: string,
  color: string,
  side: 'lead' | 'trail',
  size = LOGO_SIZE,
): HTMLSpanElement {
  const wrap = document.createElement('span');
  wrap.style.background = bg;
  wrap.style.display = 'inline-flex';
  wrap.style.alignItems = 'center';
  wrap.style.gap = `${LOGO_GAP}px`;
  wrap.style.paddingLeft = `${side === 'lead' ? LOGO_PAD : LOGO_GAP}px`;
  wrap.style.paddingRight = `${side === 'lead' ? LOGO_GAP : LOGO_PAD}px`;
  for (const logo of logos) wrap.appendChild(iconSvg(logo, color, size));
  return wrap;
}

/** 单个图标块（编辑弹窗里的预览用） */
export function makeLogoEl(logo: LogoSpec, bg: string, color: string, size = LOGO_SIZE): HTMLSpanElement {
  return iconGroup([logo], bg, color, 'lead', size);
}

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

  const two = spec.leftText !== '';
  // 紧挨着图标的文字去掉那一侧的内边距：间距交给图标块，避免叠成一大段空白
  const seg = (text: string, bg: string, custom: string, leftPad: number, rightPad: number = PAD) => {
    const s = document.createElement('span');
    s.style.padding = `0 ${rightPad}px 0 ${leftPad}px`;
    s.style.background = bg;
    s.style.color = resolveTextColor(bg, custom);
    s.textContent = text;
    return s;
  };

  const leftColor = resolveTextColor(spec.leftBg, spec.leftTextColor);
  const rightColor = resolveTextColor(spec.rightBg, spec.rightTextColor);
  // 单段徽章没有左段：两枚「左」图标一起排到唯一那段的开头
  const rightLead = (two ? [spec.logoRightInner] : [spec.logoLeft, spec.logoRightInner]).filter(
    (x): x is LogoSpec => x !== null,
  );

  if (two) {
    if (spec.logoLeft) chip.appendChild(iconGroup([spec.logoLeft], spec.leftBg, leftColor, 'lead'));
    chip.appendChild(
      seg(spec.leftText, spec.leftBg, spec.leftTextColor, spec.logoLeft ? 0 : PAD, spec.logoLeftInner ? 0 : PAD),
    );
    if (spec.logoLeftInner) chip.appendChild(iconGroup([spec.logoLeftInner], spec.leftBg, leftColor, 'trail'));
  }
  if (rightLead.length > 0) chip.appendChild(iconGroup(rightLead, spec.rightBg, rightColor, 'lead'));
  chip.appendChild(
    seg(spec.rightText, spec.rightBg, spec.rightTextColor, rightLead.length > 0 ? 0 : PAD, spec.logoRight ? 0 : PAD),
  );
  if (spec.logoRight) chip.appendChild(iconGroup([spec.logoRight], spec.rightBg, rightColor, 'trail'));
  return chip;
}
