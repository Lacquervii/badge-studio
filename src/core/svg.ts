import type { Measure, StyleDef } from './types.ts';

export const BADGE_HEIGHT = 20;
export const PAD = 7;
export const CORNER = 4;
export const FONT_STACK = "Verdana,Geneva,'PingFang SC','Microsoft YaHei',sans-serif";

export function escapeXml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function textColorFor(bg: string): string {
  let hex = bg.replace('#', '');
  if (hex.length === 3) hex = hex.split('').map((c) => c + c).join('');
  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);
  return (r * 299 + g * 587 + b * 114) / 1000 >= 128 ? '#000000' : '#ffffff';
}

/** 自定义文字色优先，为空时按底色亮度自动黑白 */
export function resolveTextColor(bg: string, custom: string): string {
  return custom !== '' ? custom : textColorFor(bg);
}

function textEl(content: string, x: number, textLen: number, fill: string): string {
  return `<text x="${x}" y="14" font-family="${FONT_STACK}" font-size="11" font-weight="bold" fill="${fill}" textLength="${textLen}" lengthAdjust="spacingAndGlyphs">${escapeXml(content)}</text>`;
}

export function buildBadgeSvg(
  badge: { leftText: string; rightText: string },
  style: StyleDef,
  measure: Measure,
): string {
  const two = badge.leftText !== '';
  const leftTextLen = two ? Math.ceil(measure(badge.leftText)) : 0;
  const rightTextLen = Math.ceil(measure(badge.rightText));
  const lw = two ? leftTextLen + PAD * 2 : 0;
  const rw = rightTextLen + PAD * 2;
  const w = lw + rw;

  const parts: string[] = [];
  parts.push(`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${BADGE_HEIGHT}" viewBox="0 0 ${w} ${BADGE_HEIGHT}" role="img">`);
  parts.push(`<clipPath id="r"><rect width="${w}" height="${BADGE_HEIGHT}" rx="${CORNER}"/></clipPath>`);
  parts.push(`<g clip-path="url(#r)">`);
  if (two) parts.push(`<rect width="${lw}" height="${BADGE_HEIGHT}" fill="${style.leftBg}"/>`);
  parts.push(`<rect x="${lw}" width="${rw}" height="${BADGE_HEIGHT}" fill="${style.rightBg}"/>`);
  parts.push(`</g>`);
  if (two) parts.push(textEl(badge.leftText, PAD, leftTextLen, resolveTextColor(style.leftBg, style.leftTextColor)));
  parts.push(textEl(badge.rightText, lw + PAD, rightTextLen, resolveTextColor(style.rightBg, style.rightTextColor)));
  parts.push(`</svg>`);
  return parts.join('');
}
