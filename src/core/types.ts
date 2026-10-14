/** 一组配色。徽章自带配色；样式库里的样式也是同一套字段，只用来快速取色 */
export interface Palette {
  leftBg: string;
  rightBg: string;
  leftTextColor: string;
  rightTextColor: string;
}

export interface StyleDef extends Palette {
  id: string;
  name: string;
}

export interface BadgeDef extends Palette {
  id: string;
  name: string;
  leftText: string;
  rightText: string;
  link: string;
  group: string;
  /**
   * 图标：四个位置，各自填内置图标名（如 github）或自定义 SVG；空＝无图标。
   * logoLeft 是默认位（左段最左，单段徽章时即段首），界面上直接可见；
   * 其余三个藏在「高级」里。
   */
  logoLeft: string;
  /** 左段内侧：贴在左右两段的分界左侧 */
  logoLeftInner: string;
  /** 右段内侧：贴在分界右侧 */
  logoRightInner: string;
  /** 徽章最右端 */
  logoRight: string;
}

/** 已解析好的图标：inner 为 24×24 viewBox 内的 SVG 片段 */
export interface LogoSpec {
  inner: string;
  filled: boolean;
}

/** 侧栏视图：list＝徽章+名字+引用数的列表；grid＝纯徽章图片堆放 */
export type SidebarViewKind = 'list' | 'grid';

export interface BadgeSettings {
  assetsFolder: string;
  /** 新建徽章时的初始配色取自哪个样式 */
  defaultStyleId: string;
  /** 侧栏默认视图 */
  sidebarView: SidebarViewKind;
  groups: string[];
  refsPreview: boolean;
  styles: StyleDef[];
  badges: BadgeDef[];
}

export type Measure = (text: string) => number;

export interface ChipSpec {
  leftText: string;
  rightText: string;
  leftBg: string;
  rightBg: string;
  leftTextColor: string;
  rightTextColor: string;
  logoLeft: LogoSpec | null;
  logoLeftInner: LogoSpec | null;
  logoRightInner: LogoSpec | null;
  logoRight: LogoSpec | null;
}
