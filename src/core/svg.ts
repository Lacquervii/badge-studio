import type { LogoSpec, Measure, Palette } from './types.ts';

export const BADGE_HEIGHT = 20;
export const PAD = 7;
export const CORNER = 4;
export const FONT_STACK = "Verdana,Geneva,'PingFang SC','Microsoft YaHei',sans-serif";

/** 图标绘制尺寸（24×24 viewBox 缩放而来） */
export const LOGO_SIZE = 12;
/** 图标到徽章左边缘的距离 */
export const LOGO_PAD = 5;
/** 图标与文字之间的间距 */
export const LOGO_GAP = 4;

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

/** 图标以 24×24 坐标绘制后整体缩放到 LOGO_SIZE，颜色跟随所在段落的文字色 */
function logoEl(logo: LogoSpec, x: number, color: string): string {
  const y = (BADGE_HEIGHT - LOGO_SIZE) / 2;
  const transform = `translate(${x} ${y}) scale(${LOGO_SIZE / 24})`;
  const paint = logo.filled
    ? `fill="${color}"`
    : `fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"`;
  // 图标自带 currentColor 时在独立 SVG 文件里会退成黑色，这里统一换成实际颜色
  return `<g transform="${transform}" ${paint}>${logo.inner.replace(/currentColor/g, color)}</g>`;
}

function iconsOf(...list: Array<LogoSpec | null | undefined>): LogoSpec[] {
  return list.filter((x): x is LogoSpec => x != null);
}

/** 段首图标区宽度：第一枚前面留 LOGO_PAD，图标之间与图标-文字之间留 LOGO_GAP */
function leadWidth(count: number): number {
  return count === 0 ? PAD : LOGO_PAD + count * (LOGO_SIZE + LOGO_GAP);
}

/** 段尾图标区宽度：最后一枚后面留 LOGO_PAD */
function trailWidth(count: number): number {
  return count === 0 ? PAD : count * (LOGO_GAP + LOGO_SIZE) + LOGO_PAD;
}

/** 段首图标：从段左边缘向内依次排开 */
function leadIcons(icons: LogoSpec[], segLeft: number, color: string): string {
  return icons.map((spec, i) => logoEl(spec, segLeft + LOGO_PAD + i * (LOGO_SIZE + LOGO_GAP), color)).join('');
}

/** 段尾图标：贴着段右边缘向内排开（列表最后一枚贴边） */
function trailIcons(icons: LogoSpec[], segRight: number, color: string): string {
  const n = icons.length;
  return icons
    .map((spec, i) => logoEl(spec, segRight - LOGO_PAD - LOGO_SIZE - (n - 1 - i) * (LOGO_SIZE + LOGO_GAP), color))
    .join('');
}

export function buildBadgeSvg(
  badge: {
    leftText: string;
    rightText: string;
    logoLeft?: LogoSpec | null;
    logoLeftInner?: LogoSpec | null;
    logoRightInner?: LogoSpec | null;
    logoRight?: LogoSpec | null;
  },
  palette: Palette,
  measure: Measure,
): string {
  const two = badge.leftText !== '';
  // 四个位置＝左段的首尾 + 右段的首尾；单段徽章没有左段，两枚「左」图标一起排到唯一那段的开头
  const lLead = two ? iconsOf(badge.logoLeft) : [];
  const lTrail = two ? iconsOf(badge.logoLeftInner) : [];
  const rLead = iconsOf(...(two ? [badge.logoRightInner] : [badge.logoLeft, badge.logoRightInner]));
  const rTrail = iconsOf(badge.logoRight);

  const leftTextLen = two ? Math.ceil(measure(badge.leftText)) : 0;
  const rightTextLen = Math.ceil(measure(badge.rightText));
  const lw = two ? leadWidth(lLead.length) + leftTextLen + trailWidth(lTrail.length) : 0;
  const rw = leadWidth(rLead.length) + rightTextLen + trailWidth(rTrail.length);
  const w = lw + rw;

  const parts: string[] = [];
  parts.push(`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${BADGE_HEIGHT}" viewBox="0 0 ${w} ${BADGE_HEIGHT}" role="img">`);
  parts.push(`<clipPath id="r"><rect width="${w}" height="${BADGE_HEIGHT}" rx="${CORNER}"/></clipPath>`);
  parts.push(`<g clip-path="url(#r)">`);
  if (two) parts.push(`<rect width="${lw}" height="${BADGE_HEIGHT}" fill="${palette.leftBg}"/>`);
  parts.push(`<rect x="${lw}" width="${rw}" height="${BADGE_HEIGHT}" fill="${palette.rightBg}"/>`);
  parts.push(`</g>`);
  if (two) {
    const color = resolveTextColor(palette.leftBg, palette.leftTextColor);
    if (lLead.length > 0) parts.push(leadIcons(lLead, 0, color));
    parts.push(textEl(badge.leftText, leadWidth(lLead.length), leftTextLen, color));
    if (lTrail.length > 0) parts.push(trailIcons(lTrail, lw, color));
  }
  const rColor = resolveTextColor(palette.rightBg, palette.rightTextColor);
  if (rLead.length > 0) parts.push(leadIcons(rLead, lw, rColor));
  parts.push(textEl(badge.rightText, lw + leadWidth(rLead.length), rightTextLen, rColor));
  if (rTrail.length > 0) parts.push(trailIcons(rTrail, w, rColor));
  parts.push(`</svg>`);
  return parts.join('');
}
