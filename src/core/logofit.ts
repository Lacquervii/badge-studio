import type { LogoSpec } from './types.ts';

/** 整段 <svg>…</svg> */
const SVG_RE = /<svg\b([^>]*)>([\s\S]*?)<\/svg>/i;
const VIEWBOX_RE = /viewBox\s*=\s*["']\s*([-\d.]+)[\s,]+([-\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)\s*["']/i;
const ATTR_RE = /([a-zA-Z-]+)\s*=\s*["']\s*([\d.]+)(?:px)?\s*["']/g;
/** 纯 path 数据：以 M/m 开头的绘图指令串 */
const PATH_RE = /^[Mm]\s*[-+.\d]/;

/** 是否属于「自定义图形」写法（含标签，或以 M 开头的 path 数据） */
export function isCustomShape(raw: string): boolean {
  const s = raw.trim();
  return s.includes('<') || PATH_RE.test(s);
}

function num(v: number): string {
  const s = v.toFixed(4).replace(/0+$/, '').replace(/\.$/, '');
  return s === '-0' || s === '' ? '0' : s;
}

/** 写死的颜色换成 currentColor，让图标跟随徽章文字色 */
function toCurrentColor(inner: string): string {
  return inner
    .replace(/\bfill\s*=\s*"(?!none|currentColor)[^"]*"/gi, 'fill="currentColor"')
    .replace(/\bfill\s*=\s*'(?!none|currentColor)[^']*'/gi, 'fill="currentColor"')
    .replace(/\bstroke\s*=\s*"(?!none|currentColor)[^"]*"/gi, 'stroke="currentColor"')
    .replace(/\bstroke\s*=\s*'(?!none|currentColor)[^']*'/gi, 'stroke="currentColor"');
}

/** 把 [x,y,w,h] 视口等比映射到 24×24 画布中央 */
function fitTransform(x: number, y: number, w: number, h: number): string {
  const scale = 24 / Math.max(w, h);
  const dx = (24 - w * scale) / 2 - x * scale;
  const dy = (24 - h * scale) / 2 - y * scale;
  if (Math.abs(scale - 1) < 1e-6 && Math.abs(dx) < 1e-6 && Math.abs(dy) < 1e-6) return '';
  return `translate(${num(dx)} ${num(dy)}) scale(${num(scale)})`;
}

function viewBoxOf(attrs: string): [number, number, number, number] | null {
  const vb = VIEWBOX_RE.exec(attrs);
  if (vb) {
    const box: [number, number, number, number] = [Number(vb[1]), Number(vb[2]), Number(vb[3]), Number(vb[4])];
    return box[2] > 0 && box[3] > 0 ? box : null;
  }
  let w = 0;
  let h = 0;
  const re = new RegExp(ATTR_RE.source, 'g');
  let m: RegExpExecArray | null;
  while ((m = re.exec(attrs)) !== null) {
    const key = m[1].toLowerCase();
    if (key === 'width') w = Number(m[2]);
    else if (key === 'height') h = Number(m[2]);
  }
  return w > 0 && h > 0 ? [0, 0, w, h] : null;
}

/**
 * 把用户粘贴的图形整理成 24×24 视口内、用 currentColor 着色的 SVG 片段。
 * 支持三种写法：整段 <svg>…</svg>（按 viewBox 自动缩放居中）、
 * 片段（如 <path d="…"/>）、纯 path 数据（M 开头）。
 */
export function fitCustomFragment(raw: string): LogoSpec | null {
  const src = raw.trim();
  if (src === '') return null;

  const svg = SVG_RE.exec(src);
  if (svg) {
    const attrs = svg[1];
    const inner = toCurrentColor(svg[2].trim());
    if (inner === '') return null;
    const box = viewBoxOf(attrs);
    const t = box ? fitTransform(box[0], box[1], box[2], box[3]) : '';
    // 外层是描边图标（fill="none" 或只给了 stroke）时保持描边，否则按填充画
    const stroked = /fill\s*=\s*["']?none/i.test(attrs) || (/\bstroke\s*=/i.test(attrs) && !/\bfill\s*=/i.test(attrs));
    return { inner: t === '' ? inner : `<g transform="${t}">${inner}</g>`, filled: !stroked };
  }

  if (PATH_RE.test(src)) return { inner: `<path d="${src}"/>`, filled: true };

  const inner = toCurrentColor(src);
  return inner === '' ? null : { inner, filled: true };
}
