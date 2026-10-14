import test from 'node:test';
import assert from 'node:assert/strict';
import { classifyLink } from '../src/core/resolve.ts';

test('classifyLink 三分支', () => {
  assert.deepEqual(classifyLink(''), { kind: 'none' });
  assert.deepEqual(classifyLink('  '), { kind: 'none' });
  assert.deepEqual(classifyLink('https://x.com/a'), { kind: 'url', url: 'https://x.com/a' });
  assert.deepEqual(classifyLink('HTTP://x.com'), { kind: 'url', url: 'HTTP://x.com' });
  assert.deepEqual(classifyLink('我的笔记'), { kind: 'note', name: '我的笔记' });
});
