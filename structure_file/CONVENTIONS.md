# Conventions — 设计基线、决策记录与 Agent 守则

来源：合并自 archive/ 中的 `DECISIONS.md`、`DESIGN_SYSTEM.md`、`UI_IMPLEMENTATION_GUIDE.md`、`AGENT_WORKFLOW.md`（2026-09 初的原始决策），并更新至 2026-09-28 现状。**带 ⚠️ 的行是被后续决策推翻或已过时的原始记录**，保留仅供考古；无标记的行仍然有效。

---

## 一、Agent 工作守则（最高优先）

- **不自动 commit/push**；全部改动等用户显式验收。commit message 末尾附 `Co-Authored-By: Claude Code <noreply@anthropic.com>`。
- **多方案特性先用问题向用户确认**，不编造数据（不发明用户事实、发表物、项目、日期）。
- **移动端行为有显著变更的自适应组件，先确认预期行为再实施。**
- 有不确定实施方案时先问，不闷头猜。
- 不加后端，不做破坏静态导出的事，除非用户明确批准。
- 旧内容是素材不是指令；Stitch 导出（见 archive/）只是视觉参考，禁止把其占位文案当真实内容。
- 每轮改动走验证流水线（`handover.md` §4）；完成后更新记忆文件（`.workbuddy/memory/`）。
- 新决策应记录到 `.workbuddy/memory/MEMORY.md`（细粒度 UI 定案）并更新 `handover.md` 状态表。

## 二、锁定设计基线（v1，用户拍板，不得擅改）

- **主色**：light `#1ba7c9` / dark `#3ccfff`；tokens 定义在 `app/globals.css`。
- **双区块 masthead**、§ 标题样式（serif italic sky-blue § + 黑标题 + 灰说明行）、内容列宽（卡片页 max-w-5xl，prose 页 ~max-w-3xl）。
- **页头名**：`Tuorui "v1ncent19" Peng`，引号与 v1ncent19 天蓝 hover underline-glow；站训 "En voyage dans l'espace de Hilbert."。
- **全站 90% 页面缩放**（--page-scale:0.9）；px 细节不随缩放，与 rem 对齐必须用 rem 任意值。
- 主题三态 light/dark/system，class `.dark` + `data-theme`。

## 三、导航与路由

- 首页卡片序 About → CV → Gallery → Blog → Project；胶囊导航第一项是 Home。
- **导航现行七项**（2026-09-25 起）：… Travel 第四项、Guestbook 第七项（无 gateway 卡，唯一入口在 Direct access）。
- ⚠️ 旧计划「Gallery 在主导航」已废：/gallery 保留双语但退出导航。
- 中文嵌套 `/zh`；blog slug kebab-case；单数 `project`。
- ⚠️ 旧计划「Cloudflare Pages 部署」已改为 **GitHub Pages**（现部署 v1ncent19.github.io，public/CNAME）。

## 四、内容与功能定案

- 首页无搜索框、无评论区；Site Statistics 用 legacy 基线占位（真实旧不蒜子数值待用户补）。
- giscus：博文详情页 + Guestbook（term 固定 "index"，改名会孤儿化历史评论）；其余页面不挂。
- OtherActivity / joke → documentation 博文；HighDim2024 是 Project 下的长笔记；三篇未发布草稿（HMC/NTK/Mahalanobis）不迁移。
- 博客索引有搜索/分类 chips/排序；`/blog#<category>` 深链已实现。
- 相册：瀑布流 + 灯箱，原图不发布（originalUrl 指向用户网盘）；加照片流程见 `GALLERY_ADDING_PHOTOS.md`。

## 五、Typography

- 标题/正文长文用衬线，UI 控件用无衬线。
- **中文衬线现为自托管 GenWanMin2 TC 子集**（`--font-serif-zh` 首位；管线见 ARCHITECTURE）。
  ⚠️ 旧决策的 Noto Serif SC/JP 方向已被取代；日文片段靠字体栈兜底渲染。
- ⚠️ **子集扫描范围 = `scripts/subset-cjk-fonts.py` 的 `SCAN_DIRS`（现含 `public/data`）**。2026-10-09 前它只扫 `content/app/components`，**游记 JSON（`public/data/travel/*`）的字从未入子集** → 正文约 26% 的 CJK 掉进系统 sans（YaHei UI）。**凡是会渲染到屏幕的新内容（新 JSON 数据源）都要确认在扫描范围内，然后重跑子集**（`fontTools.subset` + brotli，managed venv）。
- ⚠️ **`.travel-layout` 是 sans 作用域**（`TravelLog.tsx`）。该布局里的正文元素必须**显式**声明衬线栈，否则继承 sans 违反 §44。现状：`.scene-body p` 与 `.excerpt` 显式 `var(--font-serif-latin), var(--font-serif-zh)`；chip/表头/控件保持 sans。

### 5.1 中西文混排空格（2026-10-08 起有 linter 把关）

规则：**汉字与拉丁字母/阿拉伯数字交界处必须有一个空格**（双向）。`用LaTeX排` → `用 LaTeX 排`；`第1章` → `第 1 章`；`约300g` → `约 300 g`。

- 检查/自动修：`node .workbuddy/check-cjk-spacing.mjs`（`--fix` 落盘，`--json` 出机器可读报告，`--only <substr>` 限定文件）。覆盖 `content/**/*.{md,json}` + ptes 的 `scenes.json`/`trip.json`/`attractions.json`。
- **不碰**的区域（脚本自动遮蔽）：围栏与行内代码、`<pre>`/`<code>` 里的代码（博客的 LaTeX 头文件就是这种）、行内/行间数学 `$…$`、md 链接与图片目标、HTML 标签、URL。frontmatter 只报告不自动改。
- **已知不覆盖**：`%`、`℃`、`°` 等符号与汉字的交界（如 `70%的蛋液`）。符号不属于"英文/数字"，脚本刻意不动；要改得单独提。
- ptes 正文在 JSON 里用 `\n` 转义，脚本对 `\n` 做遮蔽，避免把转义里的 `n` 误当拉丁字母。

### 5.2 单独调整某几个字的字体

**首选：同名 family + `unicode-range`**（全站生效，内容一字不改，纯文本渲染的游记正文也吃得到）：

```css
/* app/globals.css，放在 GenWanMin2 TC 的 @font-face 之后 */
@font-face {
  font-family: "GenWanMin2 TC";          /* 与基础字体同名 = 接管 */
  src: url("/fonts/cactus-subset.woff2") format("woff2");
  font-weight: 400 600;                   /* 覆盖 400/500/600 三个已用字重 */
  unicode-range: U+9F99, U+91CC, U+65AF; /* 只认领 龙 · 里 · 斯 */
}
```

后声明的同名 face 优先；`unicode-range` 决定它只对列出的码位生效，其余字仍走原文件。

**次选：独立 family + class**（能精确到"某一次出现"，但**只对走 markdown 的正文有效**——博客/About/Project）：

```css
@font-face { font-family: "GlyphAlt"; src: url("/fonts/xxx-subset.woff2") format("woff2"); }
.glyph-alt { font-family: "GlyphAlt", var(--font-serif-zh); }
```

正文里写 `<span class="glyph-alt">龙</span>`（`Prose` 开了 `rehype-raw`，HTML 会被渲染）。

⚠️ **游记（ptes）正文是纯文本渲染**（`TravelStory.tsx` 直接 `{p}`），写标签会原样显示出来 —— 那边只能用 `unicode-range` 方案。
⚠️ 换上的字体必须真的含目标字符，且子集脚本 `scripts/subset-cjk-fonts.py` 的字符白名单要跟着更新，否则字形会掉进 fallback。

### 5.3 中日字形切换（`lang` 属性 + `:lang()` 规则）

`app/globals.css` 的 `@layer base` 里有两条语言栈：

```css
:lang(zh) { font-family: var(--font-serif-latin), var(--font-serif-zh); }  /* GenWanMin2 TC 打头 */
:lang(ja) { font-family: var(--font-serif-latin), var(--font-serif-ja); }  /* Noto Serif JP 打头 */
```

- **`lang` 属性本身不会改字形**，改写字形的是上面这两条 CSS 规则；没有匹配规则时 `lang` 只影响**回退选字**（首个 family 不含该字时才起作用）。已实测：同一 `font-family` 下 `lang=zh`/`lang=ja`/无 `lang` 三者宽度与位图完全一致；但 family 换成不含 CJK 的（如 `Palatino Linotype`）后，`lang=zh` 与 `lang=ja` 的回退字体不同（223600 px 区域里 11193 px 不同）。
- ⚠️ **`--font-serif-ja` 全是系统字体**（`Noto Serif JP` / `Yu Mincho` / 泛型 `serif`），站点**没有**自托管日文 webfont。所以：访客机器上没装这三个，`lang="ja"` 的演示会静默塌回中文衬线 —— 中日对比会失效。要可靠，得自托管一个 JP 子集（同 §5.2 的管线）。
- 反例：需要**故意让中日两行同字体**时（`content/blog/nihongo.md` 的汉字编码对照表），给容器加 `class="unified-serif"` 即可压掉 `:lang(ja)`：

```html
<table class="unified-serif"> … <p lang="ja">系 海 写 認</p> … </table>
```
```css
/* app/prose.css —— 特异性 (0,2,0) > :lang(ja) 的 (0,1,0)，与顺序无关 */
.prose .unified-serif,
.prose .unified-serif :lang(zh),
.prose .unified-serif :lang(ja) { font-family: var(--font-serif-latin), var(--font-serif-zh); }
```

验证脚本：`.workbuddy/probe-nihongo-font.mjs`（DOM 计算样式 + 裁剪位图 + canvas 字形光栅金标准 + 运行时删规则 A/B + `lang` 回退对照，12 项）。

## 六、Travel 模块细粒度定案（节选，全量见 `.workbuddy/memory/MEMORY.md`）

- 新增 trip 必须走 GPS 清洗管线（隐私红线，见 ARCHITECTURE §数据管线）。
- 返回条带、图例、tile hover、胶囊吸顶、幕布动画等交互均已逐项定稿（v7–v14.1）；动这些区域前**必读 MEMORY.md 对应条目**，避免推翻已拍板细节。
- trip 正文双语混合原始数据，不做 i18n。

## 七、仍未决（用户决定）

- 自定义域名（v1ncent19.space 候选）；真实访问者基线数值；博文可选缩略图；Notes 是否升顶级路由。
