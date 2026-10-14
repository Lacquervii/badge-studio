import test from 'node:test';
import assert from 'node:assert/strict';
import { PRESET_FAMILIES } from '../src/core/presets.ts';

test('预设色系：包含多个分组且每组有配色', () => {
  assert.ok(PRESET_FAMILIES.length >= 5);
  for (const family of PRESET_FAMILIES) {
    assert.ok(family.name !== '', '分组名不为空');
    assert.ok(family.styles.length >= 5, `${family.name} 至少 5 个配色`);
  }
});

test('预设色系：色值合法、名字不重复', () => {
  const names = new Set<string>();
  for (const family of PRESET_FAMILIES) {
    for (const s of family.styles) {
      assert.ok(!names.has(s.name), `配色名重复：${s.name}`);
      names.add(s.name);
      assert.match(s.rightBg, /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/, `${s.name} 右块色值非法`);
      if (s.leftBg !== undefined) assert.match(s.leftBg, /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/, `${s.name} 左块色值非法`);
    }
  }
});

test('预设色系：覆盖莫兰迪等风格分组', () => {
  const names = PRESET_FAMILIES.map((f) => f.name);
  for (const expected of ['GitHub 经典', '莫兰迪', '马卡龙', '赛博朋克', '森林大地', '海洋']) {
    assert.ok(names.includes(expected), `缺少分组：${expected}`);
  }
});
