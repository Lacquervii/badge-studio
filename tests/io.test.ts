import test from 'node:test';
import assert from 'node:assert/strict';
import { defaultSettings } from '../src/core/defaults.ts';
import { exportJson, mergeImport } from '../src/core/io.ts';

test('exportJson 导出 styles 与 badges', () => {
  const settings = defaultSettings();
  const data = JSON.parse(exportJson(settings)) as { styles: unknown[]; badges: unknown[] };
  assert.equal(data.styles.length, settings.styles.length);
  assert.equal(data.badges.length, settings.badges.length);
});

test('mergeImport 新增并映射 styleId，重名跳过', () => {
  const settings = defaultSettings();
  // 默认不再自带徽章，这里先放一枚用于验证「重名跳过」
  settings.badges.push({
    id: '001',
    name: '状态-进行中',
    leftText: '状态',
    rightText: '进行中',
    leftBg: '#555555',
    rightBg: '#ffd400',
    leftTextColor: '',
    rightTextColor: '',
    link: '',
    group: '状态',
    logoLeft: '',
    logoLeftInner: '',
    logoRightInner: '',
    logoRight: '',
  });
  const raw = {
    styles: [
      { id: 's900', name: '黄', leftBg: '#111111', rightBg: '#222222' },
      { id: 's901', name: '新样式', leftBg: '#333333', rightBg: '#444444' },
    ],
    badges: [
      { id: '900', name: '状态-进行中', leftText: '状态', rightText: '进行中', styleId: 's900' },
      { id: '901', name: '新徽章', leftText: '', rightText: '新', styleId: 's901', group: '导入组', logo: 'github' },
      { name: '缺右字', leftText: 'x' },
    ],
  };
  const result = mergeImport(settings, raw);
  assert.equal(result.error, undefined);
  assert.equal(result.stylesAdded, 1);
  assert.equal(result.badgesAdded, 1);
  assert.equal(result.skipped, 2);
  const added = settings.badges.find((b) => b.name === '新徽章');
  assert.ok(added);
  assert.equal(added.group, '导入组');
  // 旧导出文件的 logo 字段会迁移到 logoLeft
  assert.equal(added.logoLeft, 'github');
  // 旧格式（只有 styleId）导入时，把对应样式的颜色复制到徽章自己身上
  assert.equal(added.leftBg, '#333333');
  assert.equal(added.rightBg, '#444444');
});

test('mergeImport 导入导出往返一致', () => {
  const a = defaultSettings();
  const b = defaultSettings();
  b.badges.push({
    id: '100',
    name: '独有徽章',
    leftText: '独',
    rightText: '有',
    leftBg: '#555555',
    rightBg: '#4caf50',
    leftTextColor: '',
    rightTextColor: '',
    link: '',
    group: '测试',
    logoLeft: '',
    logoLeftInner: '',
    logoRightInner: '',
    logoRight: '',
  });
  const result = mergeImport(a, JSON.parse(exportJson(b)));
  assert.equal(result.error, undefined);
  assert.equal(result.badgesAdded, 1);
  // 新格式自带颜色：导入后颜色原样保留，不受本地样式库影响
  assert.ok(a.badges.some((x) => x.name === '独有徽章' && x.group === '测试' && x.rightBg === '#4caf50'));
});

test('mergeImport 拒绝坏数据', () => {
  const settings = defaultSettings();
  assert.ok(mergeImport(settings, 'not an object').error);
  assert.ok(mergeImport(settings, { styles: [] }).error);
});
