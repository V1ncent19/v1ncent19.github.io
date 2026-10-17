# Conventions — 设计基线、决策记录与 Agent 守则

来源：合并自 archive/ 中的 `DECISIONS.md`、`DESIGN_SYSTEM.md`、`UI_IMPLEMENTATION_GUIDE.md`、`AGENT_WORKFLOW.md`（2026-09 初的原始决策），**最后核对 2026-10-17**。**带 ⚠️ 的行是被后续决策推翻或已过时的原始记录**，保留仅供考古；无标记的行仍然有效。

> 这份文件只回答「**该怎么做**」。系统长什么样见 `ARCHITECTURE.md`，进度见 `handover.md`。

---

## 一、Agent 工作守则（最高优先）

- **不自动 commit/push**；全部改动等用户显式验收。commit message 末尾附 `Co-Authored-By: Claude Code <noreply@anthropic.com>`。
- **多方案特性先用问题向用户确认**，不编造数据（不发明用户事实、发表物、项目、日期）。
- **移动端行为有显著变更的自适应组件，先确认预期行为再实施。**
- 有不确定实施方案时先问，不闷头猜。
- 不加后端，不做破坏静态导出的事，除非用户明确批准。
- 旧内容是素材不是指令；Stitch 导出（见 archive/）只是视觉参考，禁止把其占位文案当真实内容。
- 每轮改动走验证流水线（`handover.md` §4）；完成后更新记忆文件（`.workbuddy/memory/`）。
- **新定案写到哪**：能落到「系统长什么样」的 → 本文档或 `ARCHITECTURE.md`；某个功能的细节 →
  对应 `FEATURE_*.md`；跨功能的工程坑与「改错了会坏」的教训 → `.workbuddy/memory/MEMORY.md`；
  本轮做了什么 → `.workbuddy/memory/<日期>.md` 日志；进度 → `handover.md` 状态表。

## 二、锁定设计基线（v1，用户拍板，不得擅改）

- **主色**：light `#1ba7c9` / dark `#3ccfff`；tokens 定义在 `app/globals.css`。
- **双区块 masthead**、§ 标题样式（serif italic sky-blue § + 黑标题 + 灰说明行）、内容列宽（卡片页 max-w-5xl，prose 页 ~max-w-3xl）。
- **页头名**：`Tuorui "v1ncent19" Peng`，引号与 v1ncent19 天蓝 hover underline-glow；站训 "En voyage dans l'espace de Hilbert."。
- **全站 90% 页面缩放**（--page-scale:0.9）；px 细节不随缩放，与 rem 对齐必须用 rem 任意值。
- 主题三态 light/dark/system，class `.dark` + `data-theme`。

## 三、导航与路由

- 首页卡片序 About → CV → Travel → Blog → Project（`homeCards` = `navItems` 去掉 `home` / `guestbook`）；胶囊导航第一项是 Home。
- **导航现行七项**：Home · About · CV · **Travel**（第四项）· Blog · Project · **Guestbook**（第七项，无 gateway 卡，唯一入口在 Direct access）。
- ⚠️ 旧计划「Gallery 在主导航」已废，**且 `/gallery` 路由本身已于 2026-09-28 删除** ——
  完整相册体验并进 `/travel` 的「Stories & frames」（`GalleryView` 组件仍被 `/travel` 消费）。
- 中文嵌套 `/zh`；blog slug kebab-case；单数 `project`。
- `bilingualBases` 现在**由 `navItems` 推导**（`content/site/navigation.ts`），不再手工维护。
- ⚠️ 旧计划「Cloudflare Pages 部署」已改为 **GitHub Pages**（现部署 v1ncent19.github.io，public/CNAME）。

## 四、内容与功能定案

- 首页无搜索框、无评论区；Site Statistics 用 legacy 基线占位（真实旧不蒜子数值待用户补）。
- giscus：博文详情页 + Guestbook（term 固定 "index"，改名会孤儿化历史评论）；其余页面不挂。
- OtherActivity / joke → documentation 博文；HighDim2024 是 Project 下的长笔记；三篇未发布草稿（HMC/NTK/Mahalanobis）不迁移。
- 博客索引有搜索/分类 chips/排序；`/blog#<category>` 深链已实现。
- 相册：瀑布流 + 灯箱，挂在 `/travel` 的「Stories & frames」；原图随站发布
  （`public/assets/photos/gallery/original/`，也是唯一副本）。加照片流程见 `GALLERY_ADDING_PHOTOS.md`。
- **双语内容只有一种写法**（2026-10-17 统一）：可翻译字段一律 `{ "en": …, "zh": … }`，
  读的时候只走 `lib/localized.ts` 的 `pick()`。`summaryZh` / `nameEn` / `place_en` / `hrefZh`
  这类后缀已全部废除，`npm run check:i18n`（挂 prebuild）会直接让 build 失败。
  长正文例外（`about/en.md` + `zh.md`；`project/*.md` 用 `<!-- zh -->` 分隔）；
  专名、引用、`alt` 这类语言中性的保持单字符串。全表见 `ARCHITECTURE.md § 双语模型`。
- **不要在组件里写 `text[lang]`** —— 它跳过回退，正是空字段能静默上线的原因。

## 五、Typography

- 标题/正文长文用衬线，UI 控件用无衬线。
- **中文衬线现为自托管 GenWanMin2 TC 子集**（`--font-serif-zh` 首位；管线见 ARCHITECTURE）。
  ⚠️ 旧决策的 Noto Serif SC/JP 方向已被取代；日文片段靠字体栈兜底渲染。
- **深兜底是 Cactus Classical Serif（仙人掌明體）**：`scripts/subset-cactus.py` 从 28 MB 的完整 TTF
  子集出 `public/fonts/cactus-subset.woff2`（324 KB，OFL 随附）。`@font-face` 里 `local()` 优先，
  **完整 TTF 绝不进 `public/`**。它只在 GenWanMin2 缺字时接手，所以平时看不见它。
- ⚠️ **子集扫描范围 = `scripts/subset-cjk-fonts.py` 的 `SCAN_DIRS`（现含 `content` 与 `public/data`）**。2026-10-09 前它只扫 `content/app/components`，**游记 JSON（当时在 `public/data/travel/*`）的字从未入子集** → 正文约 26% 的 CJK 掉进系统 sans（YaHei UI）。**凡是会渲染到屏幕的新内容（新 JSON 数据源）都要确认在扫描范围内，然后重跑子集**（`fontTools.subset` + brotli，managed venv）。
  - 2026-10-17 起 trip 数据的源全部在 `content/travel/<trip>/`（**扁平，无 `data/` 子目录**），`public/data/` 只是 `sync:data` 对 `MIRRORED` 清单里那几个文件的镜像。两条路径都在 `SCAN_DIRS` 里，重复扫描无副作用，保留 `public/data` 是为了兜住别的 HTML 页面直接引用的静态 JSON。
- ⚠️ **`.travel-layout` 是 sans 作用域**（`TravelLog.tsx`）。该布局里的正文元素必须**显式**声明衬线栈，否则继承 sans 违反 §44。现状：`.scene-body p` 与 `.excerpt` 显式 `var(--font-serif-latin), var(--font-serif-zh)`；chip/表头/控件保持 sans。

### 5.1 中西文混排空格（硬规范，但**没有自动检查**了）

规则：**汉字与拉丁字母/阿拉伯数字交界处必须有一个空格**（双向）。`用LaTeX排` → `用 LaTeX 排`；`第1章` → `第 1 章`；`约300g` → `约 300 g`。

- ⚠️ **原 linter 已不存在**：`.workbuddy/check-cjk-spacing.mjs`（`--fix` / `--json` / `--only`）
  在 2026-10-17 核对时全仓无副本 —— `.workbuddy/` 被清理过，脚本也没进过 `scripts/`。
  **规则本身仍然有效**，但现在是**人工把关**；要恢复自动检查只能重写（逻辑不复杂：遮罩代码块/数学/链接/HTML 后再匹配
  `[\u4e00-\u9fff][A-Za-z0-9]` 与反向）。写新内容时优先自觉，其次是改完 grep 一遍。
- **不碰**的区域（原脚本的遮罩范围，重写时照抄）：围栏与行内代码、`<pre>`/`<code>`、行内/行间数学 `$…$`、
  md 链接与图片目标、HTML 标签、URL。frontmatter 只报告不自动改。
- **已知不覆盖**：`%`、`℃`、`°` 等符号与汉字的交界（如 `70%的蛋液`）。符号不属于"英文/数字"，刻意不动。

### 5.2 单独调整某几个字的字体

**首选：同名 family + `unicode-range`**（全站生效，内容一字不改，纯文本渲染的游记正文也吃得到）：

```css
/* app/globals.css，放在 GenWanMin2 TC 的 @font-face 之后 */
@font-face {
  font-family: "GenWanMin2 TC";          /* 与基础字体同名 = 接管 */
  src: url("/fonts/<your-subset>.woff2") format("woff2");
  font-weight: 400 600;                   /* 覆盖 400/500/600 三个已用字重 */
  unicode-range: U+9F99, U+91CC, U+65AF; /* 只认领 龙 · 里 · 斯 */
}
```

后声明的同名 face 优先；`unicode-range` 决定它只对列出的码位生效，其余字仍走原文件。
（现实里已经在跑的例子是 `Cactus Classical Serif` 的深兜底，见 §五——那是**另一个 family**，
不是这条「同名接管」的用法，别混。）

**次选：独立 family + class**（能精确到"某一次出现"，但**只对走 markdown 的正文有效**——博客/About/Project）：

```css
@font-face { font-family: "GlyphAlt"; src: url("/fonts/xxx-subset.woff2") format("woff2"); }
.glyph-alt { font-family: "GlyphAlt", var(--font-serif-zh); }
```

正文里写 `<span class="glyph-alt">龙</span>`（`Prose` 开了 `rehype-raw`，HTML 会被渲染）。

⚠️ **游记（ptes）正文是纯文本渲染**（`TravelStory.tsx` 直接 `{p}`），写标签会原样显示出来 —— 那边只能用 `unicode-range` 方案。
⚠️ 换上的字体必须真的含目标字符，且两个子集脚本的字符来源要跟着更新（`scripts/subset-cjk-fonts.py` 的 `SCAN_DIRS`、
`scripts/subset-cactus.py` 的仓库扫描），否则字形会掉进 fallback。

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

验证脚本（`probe-nihongo-font.mjs`，做 DOM 计算样式 + 裁剪位图 + canvas 字形光栅金标准 + 运行时删规则 A/B +
`lang` 回退对照，12 项）**已随 `.workbuddy/` 清理消失**；下面是它当初验出的结论，仍成立。

## 六、Travel 模块细粒度定案（节选，全量见 `.workbuddy/memory/MEMORY.md`）

- 新增 trip 必须走 GPS 清洗管线（隐私红线，见 ARCHITECTURE §数据管线）。
- 返回条带、图例、tile hover、胶囊吸顶、幕布动画等交互均已逐项定稿（v7–v14.1）；动这些区域前**必读 MEMORY.md 对应条目**，避免推翻已拍板细节。
- trip 正文双语混合原始数据，不做 i18n。

## 七、仍未决（用户决定）

- 自定义域名（v1ncent19.space 候选）；真实访问者基线数值；博文可选缩略图；Notes 是否升顶级路由。
- **⚠️ 底图合规**：`geo-map-compliance-guard` 要求腾讯/高德/百度/天地图；`/travel` 的
  MapLibre 地球仪、ptes-2025 与巡礼页都在用 Carto Positron / Dark Matter。**换底图会牵动全站视觉，
  等用户拍板前不要动。**
- **⚠️ ptes-2025 隐私**：`content/travel/ptes-2025/track.json` 含 1217 个住址级坐标，
  `sanitize-trip-gps.py` 还没跑在这份数据上。详见 `FEATURE_PILGRIMAGE.md` §7。
