import { getIcon } from 'obsidian';
import { fitCustomFragment, isCustomShape } from './logofit.ts';
import type { LogoSpec } from './types.ts';

/** 图标贴进 SVG 时会被完整内联进徽章文件，这里按解析结果缓存 */
const cache = new Map<string, LogoSpec>();

/** 去掉脚本、事件属性与外部引用，避免破坏宿主 SVG */
function sanitize(inner: string): string {
  return inner
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/\son[a-z]+\s*=\s*"[^"]*"/gi, '')
    .replace(/\son[a-z]+\s*=\s*'[^']*'/gi, '')
    .replace(/\s(?:xlink:)?href\s*=\s*"(?!#)[^"]*"/gi, '')
    .trim();
}

/** 内置图标：lucide 线条图标，按描边着色 */
function fromBuiltin(name: string): LogoSpec | null {
  const svg = getIcon(name);
  if (!svg) return null;
  const inner = sanitize(svg.innerHTML);
  return inner === '' ? null : { inner, filled: false };
}

/** 自定义图标：粘贴整段 <svg>、片段或纯 path 数据，自动适配 24×24 并跟随文字色 */
function fromCustom(raw: string): LogoSpec | null {
  const spec = fitCustomFragment(raw);
  if (!spec) return null;
  const inner = sanitize(spec.inner);
  return inner === '' ? null : { inner, filled: spec.filled };
}

/**
 * 把徽章设置里的 logo 字段解析成可直接内联的 24×24 SVG 片段。
 * 填内置图标名（如 github、book）走 lucide；含 `<` 或 M 开头的 path 数据视为自定义图形。
 */
export function resolveLogo(raw: string): LogoSpec | null {
  const key = raw.trim();
  if (key === '') return null;
  const hit = cache.get(key);
  if (hit !== undefined) return hit;
  const spec = isCustomShape(key) ? fromCustom(key) : fromBuiltin(key);
  if (spec) cache.set(key, spec);
  return spec;
}
