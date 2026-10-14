# Logo 生成提示词（image 2.5）

## 三条决定成败的建议

1. **一定要写「应用图标 / app icon」这个词。** 模型对 app icon 的视觉惯例非常熟：圆角方底 + 居中主符号 + 留足安全边距 + 柔和投影。带上这个词，成品立刻从"随手画的图"变成"像产品的图标"。
2. **颜色写死，且不超过两种。** 我们的品牌色是白 + 天空蓝渐变（`#5bc8ff → #0ea5e9`），底色深蓝黑（`#22303f → #141d27`）。多写一个颜色，廉价感就上来一分。
3. **负面约束要写全。** AI 画 logo 最大的破坏力是"自作主张加东西"——加文字、加装饰边、加光晕、加一堆小元素。把"不要文字/字母/水印/边框/复杂背景"原话写进去。

> 定位提醒：AI 出来的是**位图**，适合社交头像、找灵感、看方向；正式场合（GitHub 仓库、README、应用商店）继续用我们已经做好的矢量版 `assets/logo/badge-studio-logo.svg`。

---

## 主提示词：保持现有 logo 的品牌，重新精致化

适合"喜欢现在的构图，但想要一版更有质感的"。配参考图使用（上传 `assets/logo/logo-512.png`）：

```
一枚应用图标（app icon），1:1 正方形，圆角方底（圆角约为边长的 22%），底色深蓝黑竖向渐变（#22303f → #141d27）。

参考图 [LOGO] 是现有图标：深蓝黑圆角方底上，一枚横向胶囊形徽章——左半白色渐变，右半明亮的天空蓝渐变（#5bc8ff 到 #0ea5e9），徽章右上角一颗白色四角星光。

请保持它的构图、比例与配色不变，只做质感重绘：更柔和的渐变过渡、顶部一道细腻高光、图标底部轻微投影、圆角更接近超椭圆。主符号占画布约 60%，四周留足安全边距。

不要出现：任何文字、字母、数字、水印、签名、多余装饰、复杂背景纹理。
```

英文版（模型对英文提示更敏感时用）：

```
A modern app icon, 1:1 square, rounded-square background (corner radius about 22% of the edge), deep navy-black vertical gradient (#22303f to #141d27).
Reference [LOGO]: the current icon — a horizontal pill-shaped badge on the dark base, left half a white gradient, right half a bright sky-blue gradient (#5bc8ff to #0ea5e9), with a small white four-point sparkle at its top-right.
Keep the composition, proportions and palette exactly as the reference; only re-render with higher quality: softer gradients, a thin top highlight, a soft drop shadow under the icon, slightly squircle corners. Main symbol occupies about 60% of the canvas with generous safe margins.
Avoid: any text, letters, numbers, watermark, signature, extra decoration, busy background texture.
```

---

## 三个方向变体（不锁定现有 logo，纯探索）

### A · 徽章矩阵（呼应"徽章库"）

```
一枚应用图标，1:1 正方形，圆角方底，底色深蓝黑渐变（#22303f → #141d27）。
画面正中是一个 2×2 的胶囊形徽章矩阵：四枚徽章排成田字格，每枚都由左右两段拼成——左段白色、右段天空蓝渐变（#5bc8ff 到 #0ea5e9）。
矩阵中央微微凸起，整体带柔和投影与顶部高光，几何感、对称、克制、现代。
不要出现：任何文字、字母、数字、水印、边框装饰、复杂背景。
```

### B · 字母 B（Badge Studio）

```
一枚应用图标，1:1 正方形，圆角方底，底色深蓝黑渐变（#22303f → #141d27）。
正中一枚粗壮的字母 B：左竖笔为白色，上下两段弧线为天空蓝渐变（#5bc8ff 到 #0ea5e9），圆头笔画、几何化处理，笔画粗细约为画布的 9%。
字母右上角一颗小的白色四角星光。极简、现代、开发者工具的气质。
不要出现：任何文字说明、数字、水印、边框、复杂背景。
```

### C · 印章压印（浅色高级版）

```
一枚应用图标，1:1 正方形，浅灰白背景（#f4f5f7）。
画面正中一枚横向胶囊形徽章，像被印章压在纸上：左半白色，右半明亮的天空蓝（#5bc8ff 到 #0ea5e9），整体轻微倾斜约 -8 度，边缘有细腻的压印凹痕与柔和投影，纸面带极淡的纹理。
克制、高级、像 Apple 或 Muji 的产品图，留白充足。
不要出现：任何文字、字母、数字、水印、其他装饰。
```

---

## 挑图的四条标准

1. **缩到 32px 还认得出主形状**（拿不准就把小图发我）
2. 颜色数 ≤ 3，且是品牌色
3. 对称居中——或者不对称得一眼看出是"故意设计"而不是画歪了
4. 画面里没有文字、没有小装饰、没有多余光晕

尺寸建议：1:1，起步 1024×1024，再各导一份 16/32/64/128/256/512（要 PNG 我可以帮你跑导出）。
