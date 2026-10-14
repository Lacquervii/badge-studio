export interface StyleDef {
  id: string;
  name: string;
  leftBg: string;
  rightBg: string;
}

export interface BadgeDef {
  id: string;
  name: string;
  leftText: string;
  rightText: string;
  styleId: string;
  link: string;
  group: string;
}

export interface BadgeSettings {
  assetsFolder: string;
  defaultStyleId: string;
  groups: string[];
  styles: StyleDef[];
  badges: BadgeDef[];
}

export type Measure = (text: string) => number;

export interface ChipSpec {
  leftText: string;
  rightText: string;
  leftBg: string;
  rightBg: string;
}
