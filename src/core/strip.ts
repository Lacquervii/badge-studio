import { parseBadgeMarker } from './parse.ts';

const BADGE_TOKEN_RE =
  /\[(?:!\[[^\]]*\]\([^)]*\)|!?\[\[[^\]]*\]\])\]\([^)]*\)|!?\[\[[^\]]*\]\]|!\[[^\]]*\]\([^)]*\)/g;

function removeEmbedsFromLine(line: string, id: string): string {
  const cleaned = line.replace(BADGE_TOKEN_RE, (token) => (token.includes(`badge-${id}.svg`) ? '' : token));
  if (cleaned === line) return line;
  return cleaned.replace(/[ \t]{2,}/g, ' ').trim();
}

/**
 * 删除徽章时清空正文引用：
 * - 标记行 `badge: 名字`（整行删除）
 * - 已固化的徽章图片行（整行删除；同排有其他徽章时只移除本徽章）
 */
export function stripBadgeReferences(text: string, name: string, id: string): string {
  const out: string[] = [];
  for (const line of text.split('\n')) {
    const markerName = parseBadgeMarker(line);
    if (markerName !== null && markerName === name) continue;
    if (/badge-\d+\.svg/.test(line)) {
      const cleaned = removeEmbedsFromLine(line, id);
      if (cleaned !== line) {
        if (cleaned.trim() !== '') out.push(cleaned);
        continue;
      }
    }
    out.push(line);
  }
  return out.join('\n');
}
