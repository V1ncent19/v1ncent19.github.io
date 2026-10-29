# Conventions — 设计基线、决策记录与 Agent 守则

来源：合并自 archive/ 中的 `DECISIONS.md`、`DESIGN_SYSTEM.md`、`UI_IMPLEMENTATION_GUIDE.md`、`AGENT_WORKFLOW.md`（2026-09 初的原始决策），**全量核对 2026-10-17；本轮相关规则专项更新 2026-10-25**。**带 ⚠️ 的行是被后续决策推翻或已过时的原始记录**，保留仅供考古；无标记的行仍然有效。

> 这份文件只回答「**该怎么做**」。系统长什么样见 `ARCHITECTURE.md`，进度见 `handover.md`。

---

## 一、Agent 工作守则（最高优先）

- **不自动 commit/push**；全部改动等用户显式验收。commit message 末尾附 `Co-Authored-By: Claude Code <noreply@anthropic.com>`。
- **多方案特性先用问题向用户确认**，不编造数据（不发明用户事实、发表物、项目、日期）。
- **移动端行为有显著变更的自适应组件，先确认预期行为再实施。**
- 有不确定实施方案时先问，不闷头猜。
- 不加后端，不做破坏静态导出的事，除非用户明确批准。
- 旧内容是素材不是指令；Stitch 导出（见 archive/）只是视觉参考，禁止把其占位文案当真实内容。
- 每轮改动走验证流水线（`handover.md` §5）；完成后维护 `structure_file/`，不依赖外部记忆文件。
- **新定案写到哪**：系统现状 → `ARCHITECTURE.md`；长期规则 → 本文档；功能细节 → 对应 `FEATURE_*.md`；试验、撤销与交互验收 → `INTERACTION_AUDIT.md`；进度 → `handover.md`。

## 二、锁定设计基线（v1，用户拍板，不得擅改）

- **主色**：light `#1ba7c9` / dark `#3ccfff`；tokens 定义在 `app/globals.css`。
- **双区块 masthead**、§ 标题样式（serif italic sky-blue § + 黑标题 + 灰说明行）、内容列宽（卡片页 max-w-5xl，prose 页 ~max-w-3xl）。
- **页头名**：`Tuorui "v1ncent19" Peng`，引号与 v1ncent19 天蓝 hover underline-glow；站训 "En voyage dans l'espace de Hilbert."。
- **全站 90% 页面缩放**（--page-scale:0.9）；px 细节不随缩放，与 rem 对齐必须用 rem 任意值。
- 主题三态 light/dark/system，class `.dark` + `data-theme`。

## 三、导航与路由

- 首页、总导航、标签和卡片确认的当前规则以 `FEATURE_HOME_NAVIGATION.md` 为准；不要恢复被撤销的留白调整或试验印章。
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
- 相册：瀑布流 + 灯箱，挂在 `/travel` 的「Stories & frames」；**只有两档 webp 上线**
  （`thumb/` + `large/`），全分辨率原图不上线、只在本地磁盘（`public/assets/photos/gallery/original/`，
  git-ignored，唯一副本），灯箱也就没有下载按钮 —— 除非某行手写了外部 `originalUrl`。
  加照片流程见 `GALLERY_ADDING_PHOTOS.md`。**已否决（2026-10-18）：原图随站发布 + 同源下载按钮**
  —— 142 MB 既过不了 `check:refs` 又推不上去（408），别再把它纳入版本控制。
- **双语内容只有一种写法**（2026-10-17 统一）：可翻译字段一律 `{ "en": …, "zh": … }`，
  读的时候只走 `lib/localized.ts` 的 `pick()`。`summaryZh` / `nameEn` / `place_en` / `hrefZh`
  这类后缀已全部废除，`npm run check:i18n`（挂 prebuild）会直接让 build 失败。
  长正文例外（`about/en.md` + `zh.md`；`project/*.md` 用 `<!-- zh -->` 分隔）；
  专名、引用、`alt` 这类语言中性的保持单字符串。全表见 `ARCHITECTURE.md § 双语模型`。
- **不要在组件里写 `text[lang]`** —— 它跳过回退，正是空字段能静默上线的原因。

## 五、Typography

- 标题/正文长文用衬线，UI 控件用无衬线。
- **拉丁衬线是自托管 `"EB Garamond"`**（2026-10-25 用户选定，替换原 Palatino Linotype 系统栈）。
  可变字体 `wght 400–800`，两个文件（roman / italic）各 ~53 KB，覆盖全站用到的 400/500/600/700。
  字体栈后面仍保留 Palatino / Georgia / Times 作回退；**没有 `local()`**（EB Garamond 在
  Windows/macOS 上极少预装，装了也常是全字符版，与子集不一致）。
  **尺寸补偿仅放在 EB Garamond 的 `@font-face`，按字重分别校准**。
  roman/italic 的 400/500/600/700/800 字重 x-height 分别为 400/407/413/419/423（每 1000 em），
  `size-adjust` 分别为 117.5% / 115.479115% / 113.801453% / 112.171838% / 111.111111%，
  等价于旧的 0.47 / 各字重 x-height，保留英文大小。注册共用两个文件 URL，不增加字体下载。
  **不要恢复 `body` 上的 `font-size-adjust: ex-height 0.47`**：它会继承到中文与 UI，
  将源雲明體丹缩至 91.44%（0.47 / 0.514）。2026-10-25 移除后中文恢复约 9.36%，
  字号 token 与容器宽度保持原值；中文换行可能改变。两种补偿同时使用会抵消 `size-adjust`。
- **字号阶梯：小字单独抬一档（2026-10-25 用户选「保守档 B」）**。`--page-scale: 0.9` 会把**所有**
  rem 字号同比压缩，于是默认 0.75rem 的 `text-xs` 只剩 10.8px；`text-[10px]` 是字面 10px，不随根字号缩放。正文档（15.3–16.2px）在这个密度下可读，所以**只抬最小的两级**，见
  `app/globals.css` 的 "Small-type tier" 段：`--text-xs` 0.9rem（12.96px）、`--text-sm` 1.02rem（14.69px）。
  ⚠️ **两条规则缺一不可**：`text-[Npx]` 是**字面 px、不读 `--text-*`**（构建产物里实测仍是 `10px`），
  所以另有一条 `html :is(.text-\[9px\], … .text-\[11px\])` 把它们一并抬到 12.96px。
  **小字档不修改正文 token 与容器宽度**；小字及徽标自身尺寸变化仍可能导致局部重排，不能省略视觉验收。
  ⚠️ 想让正文也变大只能动 `--page-scale`，但那会连容器一起放大、**行长完全不变**（实测 cpl 恒 105/90.3），
  且要同步改按 0.9 校准过的绝对值（`globals.css` landing offset 的 79.2px）。见 `handover.md`。
- **行内代码 `code` 是 0.93em**（原 0.84em 在 15.3px 正文里只有 12.85px，2026-10-25 随小字档一起抬）。
- **中文衬线现为自托管 GenWanMin2 TC 子集**（`--font-serif-zh` 首位；管线见 ARCHITECTURE）。旧 Noto Serif SC/JP 方向已被取代；日文片段靠字体栈兜底渲染。
- **文章分类徽章单独使用 `.post-category-tag`**（首页 Recent Posts / Blog 列表和正文页）：0.8rem 字号、1.25 行高，padding 0.2rem 0.6rem，高约 20.2px。不要加回 text-[10px]/text-[11px]，否则会被全局小字抬升规则覆盖；分类筛选按钮保持原尺寸。
- 首页 Recent Posts 额外用 `.recent-post-tag`：0.7rem（10.08px）、padding 0.2rem 0.5rem，高约 18.4px。导航条、手机导航窗格及首页卡片的 Beta 统一用 `.beta-badge`：0.65rem（9.36px）、1.2 行高、padding 0.16rem 0.45rem，高约 15.8px；不要使用会触发全局抬升的任意值字号工具类。
- 其他辅助徽标使用 `.badge-text`（0.75rem / 10.8px、1.3 行高）或 `.badge-text-sm`（0.7rem / 10.08px、1.25 行高），不再附加 text-[9/9.5/10/10.5/11px]。适用 PDF、编号、分类数量、履历年份/类型、旅行日志徽标/地点及灯箱元信息胶囊。目录链接、正文/照片说明、标题和导航主文字保留原字号，不取消全局阅读字号规则。
- 包裹文字的徽标另加 `.badge-pill`，统一 inline-flex 居中与 padding 0.2rem 0.55rem；固定尺寸的编号圆/方块不加这层内边距，灯箱元信息胶囊保留自身较宽的内边距。
- **字重映射（2026-10-24 起，五个子集）**：EL/L/R/M/SB → `font-weight` **300/400/500/600/700**。
  早先只有 R/M/SB（400/500/600），任何 300–400 的请求都拿到 Regular，「想细一点」无从表达；
  现在 `font-medium`(500) 是 R、正文 400 是 L。**改 `@font-face` 的 weight 段时必须同步重跑
  `scripts/subset-cjk-fonts.py`**（脚本的 `FAMILIES.weights` 列了全部五档），否则 404 → 静默掉到系统字体。
- **页头主标题用 `font-medium`（500）而非 `font-semibold`（600）**（2026-10-24 用户反馈「字有点加粗了，
  没有体现出字体曲线感」）：当时的 Palatino 在 54–72 px 下 600 会把粗细对比压平；500 保留层次。
  tracking 同步从 `-0.025em` 收到 `-0.02em`，避免细的接笔粘连。**别再往 600/700 调回去**。
  （2026-10-25 换成 EB Garamond 后这条仍然适用且更明显：它的可变轴在 600 以上对比会掉，
  500 才是这一档标题的甜点。已实测页头视觉无变化。）
- **深兜底是 Cactus Classical Serif（仙人掌明體）**：`scripts/subset-cactus.py` 从 28 MB 的完整 TTF
  子集出 `public/fonts/cactus-subset.woff2`（324 KB，OFL 随附）。`@font-face` 里 `local()` 优先，
  **完整 TTF 绝不进 `public/`**。它只在 GenWanMin2 缺字时接手，所以平时看不见它。
- ⚠️ **子集扫描范围 = `scripts/subset-cjk-fonts.py` 的 `SCAN_DIRS`（现含 `content` 与 `public/data`）**。2026-10-09 前它只扫 `content/app/components`，**游记 JSON（当时在 `public/data/travel/*`）的字从未入子集** → 正文约 26% 的 CJK 掉进系统 sans（YaHei UI）。**凡是会渲染到屏幕的新内容（新 JSON 数据源）都要确认在扫描范围内，然后重跑子集**（`fontTools.subset` + brotli，managed venv）。
  - 2026-10-17 起 trip 数据的源全部在 `content/travel/<trip>/`（**扁平，无 `data/` 子目录**），`public/data/` 只是 `sync:data` 对 `MIRRORED` 清单里那几个文件的镜像。两条路径都在 `SCAN_DIRS` 里，重复扫描无副作用，保留 `public/data` 是为了兜住别的 HTML 页面直接引用的静态 JSON。
  - ⚠️ **子集是「字符集快照」，不是「只增不减」**：每次重跑都从零重建，**只保留当时扫描得到的字**。2026-10-25 核对发现 `75edc94` 重新生成 m/r/sb 时把 挖 / 掘 / 灣 三个字弄丢了（2282 → 2398 字形，多 119 少 3），已用 `git checkout 9c122fc -- public/fonts/genwanmin2tc-{m,r,sb}.woff2` 字节级还原，并在脚本里加了 `PINNED_CHARS = "挖掘灣"` 兜底（并入 `harvest_chars()` 的初始集合）。
  - **改字重映射 / 重跑子集之前先备份 woff2，跑完 diff cmap**：`set(new.getBestCmap()) - set(old.getBestCmap())` 的两个方向都要看，`old - new` 非空就是这次掉字。
- ⚠️ **`.travel-layout` 是 sans 作用域**（`TravelLog.tsx`）。该布局里的正文元素必须**显式**声明衬线栈，否则继承 sans 违反 §44。现状：`.scene-body p` 与 `.excerpt` 显式 `var(--font-serif-latin), var(--font-serif-zh)`；chip/表头/控件保持 sans。
- ⚠️ **页面根节点不要设 `font-family`**。巡礼页的 `.pj-page` 曾写 `var(--font-ui)`，整页正文/评论/概述全部静默变无衬线，而标题因为各自**又**声明了一遍衬线所以没坏 —— 表象是「标题衬线、正文无衬线」，扫一遍看不出来（2026-10-24 修）。现在 `.pj-page` 与 `body` 一致是衬线，UI 例外逐个元素显式声明（`.pj-kicker`、`.pj-overview-meta`、公共 `.travel-log-scroll-*` / `.travel-log-facts`、`.pj-time-plate`、`.pj-tool-btn`、`.pj-back`、`.pj-outro-hint`、`.pjr-tip`，以及两页共用、声明在基础规则里的 `.pj-attrib / .map-attrib`）。**新加巡礼页元素时直接在自己的规则里写清楚**，别去父级加一行。

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

## 六、Travel 模块细粒度定案

- **统一旅行日志框架（2026-10-24）**：公共布局、控件位置、分隔拖拽、章节导航与幕布只维护一份，详见 `FEATURE_TRAVEL_LOG.md`。断点 1024px，移动端默认地图比例由内容类型配置（journal 40vh、pilgrimage 58vh）；正文排版与镜头策略保持独立。下方返回条旧类名已由公共 `.travel-log-back*` 替代，几何与 opacity-only 规则继续有效。

- 新增 trip 必须走 GPS 清洗管线（隐私红线，见 ARCHITECTURE §数据管线）。
- **游记的「发布日期」用 `end`，不用 `start`**（2026-10-25 定案）。游记要等行程
  完整结束才会写，所以它在首页 / `/travel` hub / Blog 索引里按**返程日**排序与显示。
  统一走 `lib/travel/trips.ts` 的 `tripPostedAt(trip)`，**不要再在三处各自写 `trip.start`**。
  两处**不**改：`TravelStory` 里 `{trip.start} → {trip.end}` 是行程窗口本身，
  `readTripCards()` 的 `cards.sort((a,b) => a.start…)` 是「**最早出发的排最前**」
  的稳定注册表顺序，hub 会另按发布日期排序；二者都不是发布日期显示逻辑。
- **相册「精选集」是置顶，不是筛选**（2026-10-25 定案，**推翻 2026-09-05「精选行不再置顶」**）。
  开着的时候 `featured: true` 的行排在最前、其余照片接在后面，**墙上永远显示全部**。
  实现是 `ordered` 里一次稳定分区（`filter(featured)` ++ `filter(!featured)`），
  **不要再写 `items.filter(i => i.featured)`** —— 那会让新加的、`featured: false` 的照片
  从墙面上消失（2026-10-25 加 `img-6308` 时正是这个假象被当成「图没进去」）。
  `flow` 先把照片与 StoryTile 按当前模式排成一条序列，再依次做 pinned / featured 稳定
  分区。不要把全部游记重新做成独立置顶队列，否则会脱离同日的精选照片，造成
  Acatenango 一类排序错误。
- **旅行日志默认都是 featured 导航入口**（2026-10-29 修正语义）：card 使用
  `featured: true`，与 `featured` 照片进入同一精选带，并按 `tripPostedAt()` 的日期一起排序；
  它们不是独立置顶区。关闭精选开关后，游记与全部照片合成一条完整日期时间线。
- **三层优先级固定为 `pinned` → `featured` → 当前排序**：`pinned` 是最高优先级且不受
  精选开关影响，目前仅 PTES 使用；其余日志不要因为是导航入口就自动 pinned。
  `featured` 控制精选带归属，`showPinnedBadge` 只控制可见图标（默认 false）。目前仅 PTES
  显示图标。
- 返回条带、图例、tile hover、胶囊吸顶、幕布动画等交互均已逐项定稿（v7–v14.1）；动这些区域前**必读 `FEATURE_TRAVEL_LOG.md`、`FEATURE_PILGRIMAGE.md` 及 `FEATURE_HOME_NAVIGATION.md` 对应条目**，避免推翻已拍板细节。
- **返回条 hover 只动 opacity，不动位移**（2026-10-24 定案，v13）：ptes 的
  `.tl-back-*` 与 just-because 的 `.pj-back-*` 都是两行网格
  `grid-template-rows: 1fr 14px 1fr` —— 箭头钉在中间 14px 车道，竖排标签
  **`grid-row: 1 / span 3` + `align-self: center`**。这样两个字形**任何一帧都不相交**，
  浮现也只有透明度过渡。**别把锚点合并、别给浮现加 `translateX`。**
  - **居中只能靠跨轨 + `align-self: center`**。`grid-row: 1` + `align-self: center`
    实测偏 -228.5px（900 高）/-363.5px（1440 高），**误差随窗口高度线性增长**
    —— 用户三次反馈「还是没居中」就是这个（2026-10-24 定的案，前两版都是错的）。
    跨 `span 3` 后包含块 = 整条，中心相等是几何恒等式，实测 640/720/900/1080/1440
    五档偏移全 **0.0**。
  - **`justify-items` 不能和 `align-items` 写在一起**：lightningcss 会把这对合并成
    `place-items` 并**重排轴**（`place-items: stretch center`），正好抵消
    `align-items: stretch`，轨道重新塌回内容高度。
  - **水平居中是三步，缺一步墨迹就还歪**（v18 定案，用户贴图打回两次之后）：
    ① `writing-mode: vertical-lr` —— `vertical-rl` 的行盒贴**右**边缘，墨迹偏
    **+19.5px**，文字全挤在视口边上；② `width: fit-content` 把盒子收缩到一个字列，
    否则行盒撑满、`text-align` 无处施展；③ `margin: 0 auto` —— 收缩后
    `justify-self` **失效**（实测盒子仍偏 10.5px），且 `margin-inline: auto` 在此
    上下文算出 0，**必须写 `margin` 简写**。三步齐上后两页 `inkOffset` 均 0.5px。
    **`justify-self` 也别写在容器上**：箭头是标签的兄弟 item，居中 item 对它无用。
  - **量竖排文字的居中，只能用 `document.createRange()`**：`range.selectNodeContents(label)`
    取的是真实字形矩形；`getBoundingClientRect()` 取的是**盒子**。盒子和墨迹在竖排
    里可以差 19.5px，而盒子永远是 0.5px —— 这正是连续两轮「测着已居中、看着没居中」的原因。
  - **图标居中同理，且 `getBoundingClientRect()` / `getBBox()` 都不含描边**（v20, 2026-10-24）：
    双箭头 `M11 17 6 12l5-5` + `M18 17l-5-5 5-5` 的几何跨度是 x∈[6,18]，**加
    `stroke-width: 2` 的圆头端帽后墨迹是 [5,19]，中心正好 12 = viewBox 中心**。
    所以 path 数据**不需要任何位移** —— 曾按端点中心 11.5 推算出「偏左 0.5 单位」并
    给两个 path 各加 +0.5，那是在**端点上算的、没算描边**，32px 下反而引入 0.67px 误差。
    判据：`svg.getBBox()` 返回的是**未描边**轮廓，要自己按 `stroke-width / 2` 外扩；
    最终验收仍然只能看**渲染像素**（PNG 列亮度直方图）。
  - **`border-left: 1px` 会把整列往右推 0.5px**（v20，用户「未悬浮左箭头还是贴左」的真凶）：
    `box-sizing: border-box` 下，单边边框让 48px 条带的内容盒缩成 46px 且左边界内移
    1px，**列中心 = stripCx + 0.5**。箭头与文字都在这个偏了 0.5px 的列里「完美居中」，
    所以任何以**列**为基准的探针都报 0.5px、而人眼拿**条带**做基准就看出歪。
    **修法是补一条同宽的 `border-right: 1px solid transparent`**，不要用
    `transform: translateX(-0.5px)`（那会让 hover 缩放也带上偏移），也不要改宽度。
    修后 2 页 × 1/2/3 倍屏，idle 与 hover 的 `dx` 全为 **0.00**、`gapL == gapR`。
  - 竖排标签的 `font-size` / `line-height` **写死 px**：写 `inherit` 会拿到祖先的
    15.3px × `line-height: 1.65`，每个字撑到 25px，整串高 6px，600px 高视口里
    裁掉最底部字形。`max-height: calc(50% - 20px)` 既是为这串 126px 字留公差，
    也负责把它关在上半区、不与箭头相交。
- **移动端进度条 = 普通可拖拽条 + 章节小方框**（2026-10-24 定案，v21，**推翻 v17 的水银温度计**）。
  用户原话：「进度条还是不要刻度了，做成一个普通的可拖动进度条就可以。不过在拖动的时候，
  端点上可以浮现出一个方框，标示拖到的是哪个章节。」
  - **刻度已全部删除**：`@media (max-width: 1023.9px)` 里 `.tnav-mark` / `.tnav-tick` /
    `.pjr-mark` / `.pjr-tick` 直接 `display: none`。v17 那套 `background: none !important`
    成组覆盖 `.read` / `.active` / `:hover` 的写法一并删掉 —— 前提是刻度不再显示，
    留着只会让人误以为刻度还在。
  - **拖拽逻辑抽成共享 hook** `lib/travel/use-scrub-track.ts`（两页共用），章节换算在
    `lib/travel/scrub-chapters.ts`（`chapterAtFraction` / `fractionOfChapter`，
    `ScrubMark.no` 是 `string | number`：ptes 按天数、anitabi 按站点 id）。
  - **拖拽状态必须全放 ref，不能进 `useState`**：帧循环每帧都在 `classList.toggle`
    写 `.read` / `.active`，`useState` 会让组件在手势中每秒重渲约 60 次，并与循环抢
    同一批 DOM 节点。所有视觉后果都直接写 DOM（`style.left` / `textContent` / `classList`）。
  - **`behavior: "instant"` 是硬性要求**：`smooth` 每帧重启一次滚动，永远追不上手指。
  - **`touch-action: none` 是手机能拖的前提**，没有它浏览器会把手势当成页面滚动，
    `pointermove` 根本不派发。
  - **章节方框必须是 `.tnav` / `.pjr-bar` 的子元素，绝不能放进 `.tnav-track` / `.pjr-track`**：
    track 有 `overflow: hidden`，放进去会**量到正确尺寸、`opacity` 报 1、就是看不见**。
    定位用 `bottom: calc(100% - 10px + 8px)` 贴住管子上沿。**判据只能用
    `document.elementsFromPoint()` 看栈顶，computed style 全对也可能被裁掉。**
  - 方框左右夹取 `inset = min(44, w/2)`，防止贴边时溢出屏幕；松手（`onRelease`）后移除 `is-on`。
  - 桌面竖轨**不受影响**：`.tnav-rail-fill` 的 `z-index` 必须是 `auto`，不能继承基类
    `.tnav-fill` 的 `2`（那个 2 是给移动端水银柱写的）—— 否则桌面轨道的填充会盖在
    12px 刻度点上，圆点与轨道焊成一根实心条。历史视觉规则见 `FEATURE_PILGRIMAGE.md`；现行进度条以 `FEATURE_TRAVEL_LOG.md` 为准。
- **☰ 目录按钮在进度条右侧（ptes）/ 左侧（anitabi），是底栏内的 flex 子元素**（v17 定案；
  下文「水银柱」是 v17 对填充的旧称，v21 起刻度已删、只剩一根实心填充条，几何未变）。
  v15 曾把它做成独立的 `position: fixed` 圆形 chip，用户随后改主意：「目录按钮就放在
  水银柱右边挺好的，不过高度或大小需要调整一下，让这个底栏看起来大小整体比较协调」。
  所以现在是 `.tnav` / `.pjr-bar` 里的 `flex: none` 子元素，**30×30、透明、无边框、
  无投影**，配 10px 管 + 10px 内边距 → 条带高 51px，上下留白相等，读起来是一个控件。
  ptes 放右侧（填充自左向右，按钮在终点侧），anitabi 放左侧——两页方向都是 L→R，
  用户对 anitabi 只要求「操作逻辑与 ptes 相同」，未指定位置。桌面 ≥1024px 三件
  （`.tnav-toc-btn` / `.pjr-toc` / backdrop / drawer）全部 `display: none`，
  竖轨自带百分比和回顶。
- trip 正文双语混合原始数据，不做 i18n。
- **flight 段的 marker 是飞机字形**（2026-10-24 定案）：`position-plane` symbol 层，
  机头沿航线切线（`headingAt` 的 mid-frame 平均，东向必须乘 cos(lat)），
  **`icon-rotation-alignment` 必须是 `"map"`** —— 改成 `viewport` 会让地图旋转时机头脱离航线。
  `ground`/`gap` 仍用蓝点，两套图层靠 `kind` 属性互斥过滤，别合并成一个带 case 的层。
  图标是 canvas 现场画的，**不是资源文件**（不进 public/，不参与 check:refs）。

### 移动端地图/文字分割（2026-10-24 定案）

- **两页都可拖动**（巡礼页默认 58vh、ptes 默认 40vh），范围 25vh–85vh，**只改高度不改上下顺序**，
  **无重置按钮**，高度存 localStorage（`pj-map-split` / `tl-map-split`）。实现见
  `lib/travel/map-split.tsx`（`useMapSplit`）。
- **手柄 = 整条 license 字条**，右侧竖排双箭头只是提示（绝对定位，不随文字折行）。
  字条本身**必须保持 `position: absolute; bottom: 0`** —— 移动端别再写 `position: relative`，
  那会让它跑到地图顶部、被时间牌盖住，点不到授权链接（2026-10-24 实测踩过）。
- **轻点 vs 拖动**：`DRAG_THRESHOLD = 6px`，轻点回放 `closest("a").click()`；
  拖动绝不触发链接。两条都要验，别只验一条。
- **两页堆叠断点不同，不能共用一条 media query**：巡礼页 1023px、ptes **900px**
  （`STACKED_QUERY` 里分开写）。共用会让 ptes 在 901–1023 双栏布局下出现手柄和
  `touch-action: none`。
- **落点偏移（`--pj-land`）只能由 JS 写给 `.pj-page` 的祖先**：`.pj-stop` 在故事列，
  与地图列是**兄弟**，自定义属性不跨兄弟继承。曾经写成
  `calc(var(--pj-map-h) …)` 直接失效（IVT，整条声明作废，静默回落到 1rem）。
- **拖动后要主动重算谁在阅读带里**：`ResizeObserver` 感知不到纯 CSS 变量改动，
  靠 `MAP_SPLIT_EVENT`（`map-split-change`）广播；PilgrimageStory 的 scorer、两条
  rail 的 `measure()`、`use-story-controller` 的 `bandY()` 都监听它。
  **`--pj-band-top` 在桌面必须清空**（`removeProperty`），否则 rail 会拿手机的带顶去判定。
- **`react-hooks/refs`（React 19）会把 hook 返回值的任何属性读取当成读 ref**：
  `split.dragging` / `split.handleProps` 全报错。所以 hook 直接返回**渲染好的手柄节点**
  （`renderHandle`），调用方解构 `{ mountColumn, renderHandle }`，渲染期不碰 `split.*`。
- **解析后的地图高度必须同时写到 frame**（`frameFor` → `.pj-page` / `.travel-layout`），
  不只写在有高度的那一列上。ptes 的 `.day-capsule { top: … }`、`.map-col` 的高度与灰线
  （`border-bottom`）、`.finale` 的 `min-height` 都在故事列里，只能通过共同祖先拿到。
  统一读 `var(--tl-map-h-mobile, var(--tl-map-h))` / ptes 同理，旧变量留作 no-JS fallback。
  只修 `.map-pane` 会出现「地图变高了、灰线留在中间」。
- **手柄的上下箭头不要再加动画**（2026-10-24 用户明确要求）。`tl-split-nudge` 关键帧已删除，
  只剩 hover / dragging 的着色过渡。
- **拖拽相关验证要分段 await**：胶囊的 `pinned` 类是 rAF 里算的，在同一个 `evaluate` 里
  连做 scroll + 读 rect 会读到上一帧的 `pinned: false` —— 这是测量假象，不是回归。

## 七、仍未决（用户决定）

- 自定义域名（v1ncent19.space 候选）；真实访问者基线数值；博文可选缩略图；Notes 是否升顶级路由。
- **⚠️ 底图合规**：`geo-map-compliance-guard` 要求腾讯/高德/百度/天地图；`/travel` 的
  MapLibre 地球仪、ptes-2025 与巡礼页都在用 Carto Positron / Dark Matter。**换底图会牵动全站视觉，
  等用户拍板前不要动。**
- **⚠️ ptes-2025 隐私**：`content/travel/ptes-2025/track.json` 含 1217 个住址级坐标，
  `sanitize-trip-gps.py` 还没跑在这份数据上。详见 `FEATURE_PILGRIMAGE.md` §7。
