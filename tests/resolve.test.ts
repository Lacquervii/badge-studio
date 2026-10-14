import test from 'node:test';
import assert from 'node:assert/strict';
import { classifyLink, matchBadgeForTag } from '../src/core/resolve.ts';
import { defaultSettings } from '../src/core/defaults.ts';

test('matchBadgeForTag 按 tag 字段精确匹配，空 tag 不匹配', () => {
  const badges = defaultSettings().badges.map((b, i) =>
    i === 0 ? { ...b, tag: '现代汉语' } : b,
  );
  assert.equal(matchBadgeForTag('现代汉语', badges)?.id, '001');
  assert.equal(matchBadgeForTag('不存在', badges), undefined);
  assert.equal(matchBadgeForTag('', badges), undefined);
});

test('classifyLink 三分支', () => {
  assert.deepEqual(classifyLink(''), { kind: 'none' });
  assert.deepEqual(classifyLink('  '), { kind: 'none' });
  assert.deepEqual(classifyLink('https://x.com/a'), { kind: 'url', url: 'https://x.com/a' });
  assert.deepEqual(classifyLink('HTTP://x.com'), { kind: 'url', url: 'HTTP://x.com' });
  assert.deepEqual(classifyLink('我的笔记'), { kind: 'note', name: '我的笔记' });
});
