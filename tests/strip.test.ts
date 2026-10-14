import test from 'node:test';
import assert from 'node:assert/strict';
import { stripBadgeReferences } from '../src/core/strip.ts';

test('删除徽章：标记行整行移除', () => {
  const text = ['开头', 'badge: 时间', '结尾'].join('\n');
  assert.equal(stripBadgeReferences(text, '时间', '001'), ['开头', '结尾'].join('\n'));
});

test('删除徽章：连续标记排只移除匹配的那一行', () => {
  const text = ['badge: 时间', 'badge: 状态-进行中', 'badge: 时间'].join('\n');
  assert.equal(stripBadgeReferences(text, '时间', '001'), 'badge: 状态-进行中');
});

test('删除徽章：同名之外的行原样保留', () => {
  const text = ['badge: 其他', '普通 badge: 不是标记', '# 标题'].join('\n');
  assert.equal(stripBadgeReferences(text, '时间', '001'), text);
});

test('删除徽章：已固化的单徽章图片行整行移除', () => {
  const text = ['正文', '![[徽章素材/badge-001.svg]]', '更多正文'].join('\n');
  assert.equal(stripBadgeReferences(text, '时间', '001'), ['正文', '更多正文'].join('\n'));
});

test('删除徽章：已固化的成排图片只移除本徽章', () => {
  const text = ['正文', '![[徽章素材/badge-001.svg]] ![[徽章素材/badge-002.svg]]', '更多'].join('\n');
  assert.equal(stripBadgeReferences(text, '时间', '001'), ['正文', '![[徽章素材/badge-002.svg]]', '更多'].join('\n'));
});

test('删除徽章：带链接的固化图片行整行移除', () => {
  const text = ['正文', '[![[徽章素材/badge-001.svg]]](https://x.com)', '更多'].join('\n');
  assert.equal(stripBadgeReferences(text, '时间', '001'), ['正文', '更多'].join('\n'));
});

test('删除徽章：markdown 图片语法同样移除', () => {
  const text = ['正文', '![时间](徽章素材/badge-001.svg)', '更多'].join('\n');
  assert.equal(stripBadgeReferences(text, '时间', '001'), ['正文', '更多'].join('\n'));
});

test('删除徽章：其他徽章的图片不受影响', () => {
  const text = ['正文', '![[徽章素材/badge-002.svg]]', '更多'].join('\n');
  assert.equal(stripBadgeReferences(text, '时间', '001'), text);
});
