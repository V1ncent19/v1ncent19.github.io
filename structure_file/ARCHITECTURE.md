# Architecture — 实际系统架构（全量核对 2026-10-17；Guatemala 专项更新 2026-10-28）

描述**现状**，不是规划。技术栈与全局约束见 `handover.md`。

## ⭐ 创作内容地图（"我写的东西在哪"）

| 你想改什么 | 去哪改 | 说明 |
|---|---|---|
| 博文 | `content/blog/*.md` | frontmatter：title/date/category；`_drafts/` 不发布 |
| About 正文 | `content/about/en.md` / `zh.md` | 手写双语，不自动翻译 |
| About 爱好/事实板、世界地图板 | `content/about/personality.json`、`travel.json`、`facts.tsx` | `facts.tsx` 是「封缄卡片」的富文本（含内联链接，所以是 tsx 不是 json）；组件只负责渲染 |
| 项目笔记 | `content/project/*.md` | frontmatter 的 `summary` 是 `{ en, zh }`；正文加一行 `<!-- zh -->` 就能上下分语言（见 § 双语模型） |
| CV 条目 | `content/cv/entries.ts` | TS 结构化（桌面双栏布局消费）；含 `cvSections` / `publications` / `cvHonors` / `cvInterests` / `cvRoute` |
| 相册照片地点/标题 | `content/travel/gallery/items.json` | 服务于 `/travel` 的「Stories & frames」；`place` / `placeLocal` / `title` 是 `{ en, zh }`；人工字段，`gallery:gen` 不会覆盖 |
| 站点身份（名字/站训/邮箱/GitHub） | `content/site/profile.json` | `lib/site.ts` 只是它的类型化出口，勿再硬编码 |
| 游记 trip 注册表（标题/日期/统计行） | `content/travel/<trip>/card.json` | 每 trip 一个，`lib/travel/trips.ts` 扫描目录，无中央注册表 |
| 游记叙事（每站文字） | ptes：`trip.json` + `scenes.json` + `attractions.json`（+ `diagnostics.json` 溯源）<br>巡礼：`page.json` 的 `overview` / `outro` / 各站 `note`<br>Guatemala：`story.json` | 构建期 import 进 bundle；Guatemala 的 `data.json` 是结合私有 GPS/EXIF 的派生输出，规则见 `FEATURE_GUATEMALA_TERRAIN_LOG.md` |
| 界面文案（按钮/标题/图例/标签） | `lib/i18n.ts`（双语字典） | 全站 UI copy 唯一出处；发现组件内硬编码文案应收拢到这里 |
| zh 首页文案 | `app/zh/page.tsx`（内嵌） | **有意保留**：手写翻译约定（zh 首页不走自动翻译，en/zh 是两个平行维护的页面） |
| 照片/字体素材 | `public/assets/`（上网）＋ `assets-src/`（原始，勿放 public） | 内部**按页面归属**，见下方 § public/assets 布局 |

### `content/` 布局 = 站点架构（2026-10-17）

**一个子目录对应一个路由段**，没有例外：

```
content/
  about/     → /about    · /about/zh
  blog/      → /blog     · /blog/zh      (+ _drafts/ 不发布)
  cv/        → /cv       · /cv/zh
  project/   → /project  · /project/zh
  travel/    → /travel   · /travel/zh
    gallery/items.json    ← /travel 页的「Stories & frames」照片墙，不是 trip
    <id>/                 ← 每趟旅行一个，见 content/travel/README.md
  site/      ← 不属于任何页面：navigation.ts（导航表）、profile.json（站点身份）
```

`travel/gallery/` 没有 `card.json`，`lib/travel/trips.ts` 扫目录时会跳过它 ——
「是不是 trip」由有没有 `card.json` 决定，不由目录位置决定。

#### 单实例页 vs 集合页（为什么 about/cv 的 content 里有"页面骨架"）

两种页面的 content 承担的角色不同，这不是历史遗留的疏忽：

- **集合页**（`blog` / `project` / `travel`）：content 里是 **N 个同形状条目**，骨架必须被参数化，
  所以只能住组件里（`BlogIndexView` / `ProjectDetail` / `GalleryView` / `TravelLog`）。
  条目的 md 可以随便加 `##` 标题，不影响页面结构。
- **单实例页**（`about` / `cv`）：只有一页，没有"多种实例共用模板"的压力，内容文件就直接是那一页 ——
  结构跟着内容走。两处硬契约，改之前必须知道：
  - `content/about/{en,zh}.md` 在**第一个 `## ` 标题处**被 `getAboutParts()` 切成两半
    （前半渲染在 General Information 之上，后半在其下）。挪动那个标题 = 改布局。
  - `content/cv/entries.ts` 的 `CvSectionId`（`education` / `research` / `activities`）
    被 `lib/i18n.ts` 反向 import 当字典键；加一个 section id 会直接编译不过。
    `marker` / `lines[]` 的形状是照着双栏 bento 的槽位定的（layout 反向决定了 data shape）。

**但"单实例"不等于"文案可以住在组件里"**（2026-10-17 收口）：这两页各有一块文本曾经在
`components/` 里，现已全部搬进 `content/` ——

| 原来在哪 | 现在在哪 | 说明 |
|---|---|---|
| `components/about/facts-board.tsx` 的 `FACT_GROUPS` | `content/about/facts.tsx` | 富文本 + 内联 `<InlineLink>`，所以是 tsx；封面上的编号/封印/计数器仍留在组件 |
| `components/cv/cv-folio.tsx` 的 `HONORS` | `content/cv/entries.ts` 的 `cvHonors` | 圆点颜色是表现，留在组件（`HONOR_TONES`，按位置取） |
| 同上 `INTERESTS` / `INTERESTS_ZH` | `cvInterests` | 按语言分组的字符串数组 |
| 同上内联的 from / route 事实与标签 | `profile.json` 的 `location` / `affiliation`、`cvRoute`、`i18n.cvFolio.route` | 事实进 content，标签进 i18n |

判据不变：**组件只描述"长什么样"，文本一律来自 `content/` 或 `lib/i18n.ts`。**

#### 语言：`blog/` 不分语言（2026-10-17 定案）

一篇博文 = 一个文件。`/blog` 与 `/blog/zh` 消费**同一批** `content/blog/*.md`，差别只有外壳文案
（`lib/i18n.ts`）。`lang` 是从正文数 CJK / Latin 字符算出的**展示标签**（`lib/blog.ts` 的
`detectLang`），既不是目录划分，也不是 frontmatter 字段。

**不要为了"补全双语"给某篇文章再建一份中文副本** —— `getBlogPosts()` 有同路径去重守卫，
两篇落到同一 `/blog/<year>/<slug>` 会直接 build 失败。

#### 索引条目可以不是博文：游记进 `/blog`（2026-10-17）

`content/travel/<id>/` 的每个行程也会出现在 Blog 索引里，但**没有对应的 md**。做法是**读取时合并**：

```
lib/blog-travel.ts
  tripCardsAsPosts(lang)   card.json → BlogPostCard（title/blurb/date/start，链接指 /travel/<id>）
  blogIndexCards(lang)     md 文章 + 行程，按日期倒序，两个索引页唯一的入口
```

- **不许在 `content/blog/` 写"假 md"当跳板**：摘要把被复制成第二份副本，立刻和 `card.json` 走偏，
  而且 `getBlogPosts()` 会为已经存在的页面再发一个 URL。
- `card.json` 是唯一真源：标题 = `title`、摘要 = `blurb`、日期 = `start`、CTA = `blog.readTravel`、
  元信息 = `tripFacts()`（与 /travel 卡片同一实现）。
- `BlogPostCard` 因此有三个**只有非博文条目才用**的可选字段：`href`（链接目标）、`meta`
  （替换"≈ N 分钟"）、`cta`（替换"阅读"）。真博文一律不填，卡片照旧从 `date`/`minutes` 推导。
- 分类 `travel` 用 gallery 的 `--curated` 橙红（`components/blog/post-tone.ts`）；
  首页 Recent Posts 直接消费 `blogIndexCards()`，因此游记也会出现在首页 feed
  （2026-10-23 起；此前只列 md 文章，游记永远不上首页）。
- 新增行程 = 加一个目录，Blog 索引自动多一条，**无需改任何代码**。

#### 双语模型：一个字段一种写法（2026-10-17 统一）

此前同一站里有 **9 种**写法、**3 个方向相反**的回退（`summaryZh || summary` vs `nameEn || name`），
而且键名写错是**静默的**（`placeEn` 是合法 JSON 键，只是渲染成空字符串）。现在只有三层：

| 层 | 写法 | 读法 |
|---|---|---|
| **字段级**（标题、摘要、地名、CTA） | `{ "en": …, "zh": … }` | `pick(text, lang)` |
| **长正文** | 一个语言一个文件（`about/en.md` + `about/zh.md`）或一个文件里用 `<!-- zh -->` 分隔 | 各自直接读 |
| **语言中性**（专名、论文引用、`alt`、坐标、`PDF`/`SECT` 这类缩写） | 普通 `string` | 直接用 |

**唯一的回退规则**在 `lib/localized.ts` 的 `pick()` / `pickList()` 里：**当前语言优先，缺则用另一种，
再缺是空串**。`en` 是基准，所以缺 `zh` → 显示英文；极少数只有中文的遗留行 → 两个页面都显示中文，
而不是空白。**不要在组件里写 `text[lang]`** —— 那样跳过回退，正是空字段能上线的原因。

```ts
// lib/localized.ts
export interface Localized     { en?: string;  zh?: string  }   // 至少一边；pick()
export interface Bilingual     { en: string;   zh: string   }   // 两边必填；nav / 游记卡
export interface LocalizedList { en?: string[]; zh?: string[] } // CV 条目要点；pickList()
```

各处的实际形状（**加新内容前先对照此表**）：

| 位置 | 形状 | 备注 |
|---|---|---|
| `about/{en,zh}.md` | 两个文件 | 散文 + 内联 HTML，无法放进字段 |
| `project/*.md` frontmatter | `summary: { en, zh }` | 标题是专名，保持 `string` |
| `project/*.md` 正文 | 无标记 = 两种语言共用；有 `<!-- zh -->` = 上英下中 | `projectBody()` 切分 |
| `cv/entries.ts` | `title` / `institution` / `sub` / `lines` 均为嵌套 | `period`、`marker`、`publications` 保持 `string` |
| `travel/gallery/items.json` | `place` / `placeLocal` / `title` 嵌套 | `alt` 单语；两边全空则**整个字段省略** |
| `travel/<id>/card.json` | `title` / `blurb` / `stops` … 嵌套 | 都已成对，无回退 |
| `about/travel.json` | `name` / `note` 嵌套 | 曾是唯一方向相反的字段（中文为基准） |
| `about/personality.json` | 单语 | MBTI 代号与日期本身中性 |
| `site/navigation.ts` | `label` / `summary` / `href` 嵌套 | `href` 曾是 `href` + `hrefZh` |
| `site/profile.json` | `role` 嵌套；`cv: { en, zh }` | `cv.zh` 为 `null` = 没有中文版 PDF |
| `blog/*.md` | 单语 | 见上一节 |

**守卫：`npm run check:i18n`**（挂进 `prebuild` / `predev`）。它扫 `content/`，出现
`foo_en` / `foo_zh` / `fooZh` / `fooEn` 或两端全空的 `{ en, zh }` 直接 build 失败；
某一侧缺失只报告不拦截（英文基准侧缺得多就该去补）。`check-refs` 只管 `/assets/` 路径，
TypeScript 看不见 JSON —— 这类错误以前没人管。

**为什么不做"翻译回退链"之外的事**：没有机器翻译兜底，也没有"中文缺就显示英文"以外的策略。
缺就是缺，`check:i18n` 会把它列出来，补不补是编辑决定。

### 中文页的「机翻草稿」声明条（`TranslationNotice`）

组件：`components/translation-notice.tsx`，视觉是纯 Tailwind（无 CSS 类，无全局状态）。
它是**不可关闭**的读者告知，不是 UI 提示，所以没有 × 按钮。

**挂载点（2026-10-17 覆盖全部中文导航页）**：

| 中文页 | 挂载位置 | 英文原页 |
|---|---|---|
| `/zh` | `app/zh/page.tsx` | `/` |
| `/cv/zh` | `components/cv/cv-folio.tsx`（`isZh` 时） | `/cv` |
| `/blog/zh` | `app/blog/zh/page.tsx` | `/blog` |
| `/project/zh` | `app/project/zh/page.tsx` | `/project` |
| `/travel/zh` | `app/travel/zh/page.tsx` | `/travel` |
| `/guestbook/zh` | `app/guestbook/zh/page.tsx` | `/guestbook` |

**⚠️ 唯一例外是 `/about/zh`**：那一页的中文是**用户亲笔原文**，不是译文，**永远不要挂**。

**怎么撤掉一条**（用户写好某一页中文后）：只改一个文件，两步——
1. 删掉那一页里的 `<TranslationNotice href="…" />` 一行；
2. 删掉随之无用的 `import { TranslationNotice } from "@/components/translation-notice";`。

没有注册表、没有配置项、没有 pathname 判断——**不要去改布局或加白名单**。
给新页面加：`<TranslationNotice href="/英文路由" />` 作为页面返回值的第一个兄弟节点
（它自己带 `section.shell`，所以通常要把页面包进 `<>…</>` 而不是塞进页面自己的 `section`）。
`/project/zh/[slug]`、`/travel/zh/<id>` 这类详情页目前**没挂**（前者内容仍是英文摘要，
后者是沉浸式全屏页，加条会挤压布局）——要加时按上面一行搞定。

### ~~句末引导链接 = CTA 胶囊~~ —— 已回滚（2026-10-17 当天）

试过把句末行动链接做成胶囊（`.cta-inline`），用户看过实际效果后否掉了：「效果不太好」。
about 首段的 CV 与 travel 段的 `Travel →` 已恢复成普通 markdown 链接 / 普通加粗链接，
`globals.css` 里的 `.cta-inline` 段已整段删除。**别再重做。**

### `public/assets/` 布局（2026-10-17 重组）

**两条判据，按顺序问：**
1. **是我做的吗？** 不是 → `public/data/vendor/`（第三方地理数据，`LICENSE.md` 记来源）。
2. **是页面的一部分，还是内容创作？**
   - **页面的一部分**（页头页脚要用的图、按钮位、印章）→ `assets/<页面>/`
   - **内容创作**（帖子/游记正文里出现的照片）→ `assets/photos/<主题>/`

```
public/assets/
  about/           cal.png（about 页练字样图）
  home/            avatar.jpg + nav/{7 张}.webp（首页导航窗格预览，按 SectionId 动态拼 URL）
  cv/              v1ncent19-cv-en.pdf
  project/<slug>/  各项目页的 PDF
  gallery/         badges/*.svg（手绘印章，页面元数据；build-badges 的输入源）
  photos/          ← 内容创作，按主题
    gallery/{large,thumb}/            相册墙两档入库 webp（同一批照片的派生）
    gallery/original/                 49 张全分辨率原图（145 MB）—— **本地母版兼管线源目录，git-ignored、不上线**
    blog_photo/                       散篇配图 + 菜谱（15 篇共 25 张）+ boxcox.png
    joke_photo/                       单帖多图（20 张）
    nihongo_photo/                    单帖多图（5 张）
    pilgrimage/<trip>/{compare/*.webp, cover.png}
public/data/vendor/  ← 第三方：land-110m.json（Natural Earth）、worldOutlineLow.svg（amCharts）
```

**为什么 gallery 的 badge 留在 assets/ 而照片进了 photos/**：badge 是页面装饰（贴在每张卡片上的印章），按你的话属于"页面的一部分"；而 `photos/gallery/` 是同一批照片的三个尺寸档，属于内容创作。两者名字里都有 gallery，归属不同，别被名字骗了。

> **判断规则**
> - "写给人看的正文" → `content/`
> - "界面上的固定文字" → `lib/i18n.ts`
> - "原始素材" → `assets-src/`（git-ignored）
> - "要原样上网的数据文件" → 也放 `content/`，由 `sync:data` 镜像到 `public/data/`
>
> **`public/` 只有一个用处：给需要 URL 的东西一个 URL**（图片、PDF、字体，以及必须 `fetch()` 才能不进 bundle 的数据）。
> 它不是"文件型内容的家"，是"构建产物的出口"，所以判据是**「它能不能 import」**：
> 能 import 就留在 `content/`（只有一份，改哪份就是哪份）；只有大到不能进 bundle 的（目前只有 ptes 的 `track.json`）才需要 public 那一份。
>
> **"不用人工维护" ≠ "构建产物"**：`public/` 里还有一类是**生成器产出但无可再生源**的文件
> （巡礼页的 `route.json`、anitabi 快照）。它们放 `public/` 是因为没人手改，但**必须入库** —— 删掉就没了。
> 判据不是"要不要维护"，而是"**能不能从仓库里重新跑出来**"。

## 地图旅行日志公共框架（2026-10-24）

三篇日志及中英文镜像已接入 `components/travel/log/TravelLogPage.tsx` → 类型适配器 → `TravelLogShell.tsx`。公共外壳统一沉浸/返回/幕布、1024px 断点、地图分隔拖拽和工具栏；`ChapterNavigation.tsx` 共用章节目录、进度条和跳转。journal / pilgrimage / terrain 的正文与镜头策略独立，Guatemala 细节见 `FEATURE_GUATEMALA_TERRAIN_LOG.md`。

每篇的数据入口在 `lib/travel/log/definitions/<id>.ts`；`TravelLog` 不再导入 PTES JSON。`TravelNav` 只做日期→章节适配，巡礼不再有单独的 `PilgrimageRail`。原 PTES 的 styled-jsx 样式已移至 `app/travel-journal.css`、`app/travel-navigation.css`，公共样式为 `app/travel-log.css`。完整职责、接口、新增流程与验收见 `FEATURE_TRAVEL_LOG.md`。

## 路由树（app/）

```text
/                        首页（hero 自介 + Sections + Recent Posts + Direct access + Site Statistics）
/about, /about/zh        分层信息（基础信息公开，爱好/追星藏于交互后；含 travel-board）
/cv, /cv/zh              结构化 CV（桌面双栏；正文 "Experience"/"经历"）
/blog, /blog/zh          博客索引（客户端搜索 + 分类 chips + 排序）；/blog/[year]/[slug] 详情
                        索引条目 = md 文章 + 游记卡（`lib/blog-travel.ts` 读取时合并）
/project, /project/zh    项目索引与详情
/travel, /travel/zh      旅行志 hub（MapLibre 地球仪 + 游记 tiles + 相册墙 Stories & frames + 心愿单清单）——导航第四项
/travel/ptes-2025(+/zh)  互动游记（粘性地图 + 文字流 + 幕布动画 + 总进度条）
/travel/just-because(+/zh) 巡礼地图（MapLibre + 36 站滚动联动 + 可缩放相机）
/travel/guatemala-2026(+/zh) 三维地形游记（DEM + 等高线 + GPS 路线 + 照片/章节滚动联动）
/guestbook, /guestbook/zh 留言板（giscus，term 固定 "index"，勿动）
/zh/*                    双语镜像（`bilingualBases` 由 `navItems` 推导，不再手工维护）
```

> **`/gallery` 已删除**（2026-09-28 用户决定）：完整的相册体验并进 `/travel` 的
> 「Stories & frames」，`GalleryView` 组件仍在 `components/gallery/` 里被 `/travel` 消费。

## 目录职责

| 目录 | 职责 | 关键点 |
|---|---|---|
| `components/travel/` | Travel 模块全部组件 | **ptes**：`TravelMap.tsx`、`TravelLog.tsx`、`TravelNav.tsx`、`TravelStory.tsx`；**hub**：`hub-globe.tsx`、`hub-hover-link.tsx`；**巡礼**：`PilgrimageLog.tsx`、`PilgrimageMap.tsx`、`PilgrimageStory.tsx`；**Guatemala terrain**：`TerrainTravelLog.tsx`（适配器）、`TerrainStory.tsx`（正文）、`TerrainMap.tsx`（DEM、等高线、路线、照片与章节镜头）。三类共用 `ResumeStoryButton.tsx` |
| `components/travel/log/` | 旅行日志公共组件 | `TravelLogPage`、`TravelLogShell`、`ChapterNavigation`、`MapToolbar`、`TravelLogFacts`、`TravelLogScrollCue`，详见 `FEATURE_TRAVEL_LOG.md` |
| `components/gallery/` | `gallery-view.tsx` 同文件承载照片画廊 + 游记 StoryTile + 排序条；`gallery-hover.css` 仅负责照片 tile 的磨砂条展开、文字淡入与 hover/focus 动画 | 被 `/travel` 消费（`/gallery` 路由 2026-09-28 已删）；排序条方向格移动端独立成行 |
| `lib/use-card-launch.ts` | 首页 GatewayLink 与画廊 StoryTile 的共享点击确认状态 | 跳转前清理 is-launching；在 pagehide/pageshow/popstate、effect 清理时取消计时器并复位。StoryTile 可启用 resetHoverOnReturn，返回后以 data-return-idle 抑制浏览器恢复的 hover/focus 封面，真实鼠标移动或重新 Tab 聚焦后恢复交互 |
| `components/background/` | `spacetime-canvas.tsx` 时空背景（质量引力井 warp 网格） | 维护接口：CONFIG；各井的**位移向量累加后一次性施加**（不可逐井原地改写），网格向视口外延伸 **Σstrength** 防「引力拉伸露边界」；静态井按**影响半径**剔除而非元素包围盒 |
| `components/layout/` | 导航、§ 锚点（`section-mark.tsx`）、页头、`lang-switch.tsx`；`desktop-nav.tsx` 负责单个胶囊底板随 hover/focus 移动 | 保留链接几何及字号，ResizeObserver/字体就绪后测量；当前栏目文字/小标记不随 hover 改变。全站 sticky 导航经 `.site-chrome-header{display:contents}` |
| `components/about/` | About 分层信息 + travel-board（世界地图足迹）+ `travel-globe.tsx`（地球仪与引力井） | MARKER radius 持续调优 |
| `lib/` | `i18n.ts`（双语 UI 字典）、`localized.ts`（`pick`/`pickList` 唯一回退）、`blog.ts`/`blog-travel.ts`/`content.ts`（内容装载；`blog-travel.ts` = 行程并入 Blog 索引）、`site.ts`、`theme.ts`（`useSyncExternalStore` 主题）、`lede-math.ts`（卡片摘要 KaTeX）、`travel/`（`trips.ts` trip 注册表 + **`tripPostedAt()`** = 游记发布日期（取 `end`，见 CONVENTIONS） + `pilgrimage.ts` 巡礼领域模型 + `types.ts` + `use-story-controller.ts` 滚动状态机：弹簧缓动的文档阅读线共同驱动标点时间与地图镜头，单调三次插值平滑分节速度，章节坐标按布局缓存 + `gps.ts` + **`use-scrub-track.ts`** 进度条拖拽 hook（ref 驱动，禁 `useState`）+ **`scrub-chapters.ts`** 拖动比例 ↔ 章节换算 + **`map-split.tsx`** 移动端地图/文字分割 `useMapSplit`） | |
| `lib/travel/log/` | 旅行日志公共模型、数据校验、章节与布局接口 | `definitions/<id>.ts` 为每篇内容入口；`reading-geometry.ts`、`navigation.ts` 共用测量与跳转；`camera.ts` 定义镜头所有权 |
| `content/` | `site/{profile.json,navigation.ts}`、`blog/*.md`、`travel/gallery/items.json`、`cv/`、`project/`、`travel/` | manifest 类文件「脚本生成 + 人工编辑」模式 |
| `public/data/travel/<trip>/` | 两个 trip 的**生成器产物**都在这里，但入库策略不同 | **ptes**：`track.json` 是 `sync:data` 的产物，gitignored；**just-because**：`route.json` + `anitabi-212278.json` 无仓库内可再生源（GPS 原始导出在 gitignored 的 `assets-src/`；anitabi 是时点快照），**必须入库**。共同点：都不用人工维护。**隐私红线见 §数据管线** |
| `scripts/` | 见下表「脚本清单」 | 四个挂 `prebuild`/`predev`（`badges → sync:data → check:refs → check:i18n`）；Guatemala 的四个生成脚本只手动运行，不在 CI 中下载数据 |
| `assets-src/` | 原始素材（字体 OTF、**travel 原始 GPS 数据**） | 绝不进 public/，git-ignored（部分） |

### 脚本清单（npm script 与手动工具）

| 脚本 | 命令 | 何时跑 | 作用 |
|---|---|---|---|
| `build-badges.mjs` | `npm run badges` | **prebuild/predev** | 合成 `components/gallery/badge-art.generated.ts`；改图标后需手动重跑 |
| `sync-trip-data.mjs` | `npm run sync:data` | **prebuild/predev** | 按 `MIRRORED`/`KEEP` 清单把 trip JSON 镜像进 `public/data/travel/`，其余 prune |
| `check-refs.mjs` | `npm run check:refs` | **prebuild/predev** | `content/` 里的 `/assets/…` 字符串引用解析不到 `public/` 就 exit 1 |
| `check-i18n.mjs` | `npm run check:i18n` | **prebuild/predev** | 旧式双语键（`*_en`/`*_zh`/`*Zh`/`*En`）或两端全空的 `{en,zh}` → exit 1 |
| `check-travel-log.mjs` | `node scripts/check-travel-log.mjs` | 改旅行日志后手动 | 四语言路由、布局、拖拽、导航、地图与错误兜底回归；需通过环境变量指定浏览器运行时 |
| `check-card-launch.mjs` | `node scripts/check-card-launch.mjs` | 改卡片导航/返回后手动 | 首页及两篇旅行日志重复进入/返回、悬浮复位、计时器；运行环境见 FEATURE 文档 |
| `check-travel-entry.mjs` | `node scripts/check-travel-entry.mjs` | 改源页/目标幕布交接后手动 | 逐帧检查蓝幕覆盖、同文档导航与横向溢出；支持 `--dark`、`--reduced --smoke` |
| `gallery.mjs` | `npm run gallery:gen` | 加照片时手动 | 相册两档 webp（thumb/large）+ `items.json` 合并（原图不再发布；源目录 = `public/assets/photos/gallery/original/`） |
| `subset-cjk-fonts.py` | — | 大改内容后手动 | GenWanMin2 TC 子集化 → `public/fonts/*.woff2` |
| `subset-cactus.py` | — | 手动 | 单字替换用的独立子集（见 `CONVENTIONS.md` §5.2） |
| `sanitize-trip-gps.py` | — | 新 trip **必须** | GPS 清洗（home anchor + radius），隐私红线 |
| `anitabi-points.mjs` | `npm run anitabi:snapshot` | 一次性 | anitabi 巡礼点快照 |
| `anitabi-images.mjs` | `npm run anitabi:images` | ⚠️ 已退出管线 | 动画截图兜底，用户不需要 |
| `pilgrimage-photos.mjs` | `npm run pilgrimage:photos` | 合成**之前** | 抽出 `photos.json`（位置真源） |
| `pilgrimage-route.mjs` | — | 换 GPS 数据时 | 从全年 GPS 裁巡礼当天 → `route.json` |
| `pilgrimage-derive.mjs` | `npm run pilgrimage:derive` | 加对比图后 | 母版 jpg → `compare/*.webp` + `cover.png` |
| `pilgrimage-map.mjs` | — | 上游数据变了 | 组装 `content/travel/just-because/page.json` |
| `guatemala-travel.mjs` | `npm run guatemala:build` | 换 GPS、照片、分段时间时 | 私有全年 GPS + EXIF 原图 → 裁切路线、去元数据 WebP 与 `data.json` |
| `guatemala-terrain.mjs` + `guatemala-terrain-style.mjs` + `guatemala-contours.mjs` | `npm run guatemala:terrain` | 地形范围/样式变化时 | 下载 Terrarium DEM，生成素色贴图和平滑等高线；需要网络，不进 prebuild |

巡礼全套见 `FEATURE_PILGRIMAGE.md`；相册见 `GALLERY_ADDING_PHOTOS.md`。

## 数据管线

- **相册**：`public/assets/photos/gallery/original/` 原图 → `npm run gallery:gen` → `public/assets/photos/gallery/{thumb,large}` + `content/travel/gallery/items.json`（人工字段保留）。详细流程见 `GALLERY_ADDING_PHOTOS.md`。**源目录 2026-10-25 移到树内**（原为仓库根 `GalleryPhoto/`，已不存在），脚本对源目录只读；该目录被 `.gitignore` 挡住，所以仍**不上线**（2026-10-18 决定，下载按钮随之取消；见 `.gitignore` 注释）。需要换源目录时用 `GALLERY_SRC=<dir>`，不改脚本。
- **Badge**：`npm run badges`（prebuild/predev 自动）合成 `badge-art.generated.ts`；改图标后需手动重跑。
- **中文字体**：`assets-src/fonts/GenWanMin2TC/` OTF → `scripts/subset-cjk-fonts.py` → `public/fonts/genwanmin2tc-{el,l,r,m,sb}.woff2`（对应 300/400/500/600/700，各 ~850 KB）；大改内容后用 venv python 重跑。
- **英文字体（2026-10-25）**：`assets-src/fonts/EBGaramond/` 可变字体 woff2（上游 583 KB）→ `scripts/subset-ebgaramond.py` → `public/fonts/ebgaramond-{roman,italic}.woff2`（共 **106 KB**）。**可变轴 `wght 400–800` 必须保留**（子集化不能加 `--instance`），一个文件覆盖全站用到的 400/500/600/700。许可证 OFL 1.1，`EBGaramond-OFL.txt` 随字体一起放 `public/fonts/`（OFL 要求）。
- **Travel GPS（隐私红线，最高优先）**：新增 trip = lab 预处理 → `scripts/sanitize-trip-gps.py` 清洗（home anchor 自动取轨迹首点、radius 3km 裁掉居家段并重排全部索引/bounds）→ 把结果拆两处：**人造内容（trip/scenes/attractions/diagnostics，~115 KB）直接放 `content/travel/<id>/`（import）；`track.json` 也放在同一层**，靠 `scripts/sync-trip-data.mjs` 的 `MIRRORED` 清单声明它需要 fetch —— **「要 URL」由清单表达，不由目录名表达**（早先的 `<id>/data/` 方案会把语义压在文件夹名上，且其 prune 曾清空过 `public/data/travel/ptes-2025/`）→ `npm run sync:data` 把它镜像到 `public/data/travel/<id>/`（产物，gitignored）→ `app/travel/<id>/page.tsx`(en+zh) + `content/travel/<id>/card.json`。**上网数据绝不含住址级 GPS；原始数据只留在 `assets-src/travel-data/`。注意 gitignored ≠ 私密：`public/` 里的一切仍然上网，只是不进版本控制。**
- **Guatemala terrain**：`assets-src/travel-data/` 全年 GPS + `assets-src/guatemala-masters/` EXIF 原图 → `npm run guatemala:build` → `content/travel/guatemala-2026/data.json` + `public/assets/photos/travel/guatemala-2026/*.webp`；地形由 `npm run guatemala:terrain` 生成到 `public/assets/terrain/guatemala*`。私有输入被忽略，裁切路线、照片位置、去元数据图和地形派生资源入库，完整边界见专项 FEATURE。
- **引用完整性**：`npm run check:refs`（prebuild/predev 自动）扫描 `content/` 中所有 `/assets/…` 之类的路径字符串，解析不到 `public/` 就中断构建。字符串引用没有类型检查，写错只会静默出一张空白图。

## 样式体系

- Tailwind v4 + `app/globals.css` CSS-var tokens（主色 light `#1ba7c9` / dark `#3ccfff`）；语义组件类包裹卡片/按钮/tags。
- 全站 90% 页面缩放：`:root --page-scale:0.9` + `html{font-size:calc(16px*var(--page-scale))}` —— 与 rem 元素做相对定位必须用 rem 任意值。
- 中文衬线栈 `--font-serif-zh`（首位 GenWanMin2 TC）。
- **字号阶梯分两层（2026-10-25）**：`--page-scale: 0.9` 会同比压缩**所有** rem 字号（默认 `text-xs` 的 0.75rem → 10.8px；`text-[10px]` 仍是字面 10px），所以 `globals.css` 里有一段 "Small-type tier"：
  `@theme { --text-xs: 0.9rem; --text-sm: 1.02rem }`（12.96 / 14.69px）负责 `text-xs`/`text-sm` 及其变体，
  再加一条 `html :is(.text-\[9px\], …, .text-\[11px\])` 把**不读主题变量的任意值 px** 一并抬到 12.96px。
  ⚠️ 后者不可省：`text-[Npx]` 在构建产物里是字面 `font-size:10px`。
  正文档与容器宽度不因小字档而改变；小字本身及徽标内边距仍可能影响局部换行，需验收。辅助标签使用独立语义类避开全局抬升；参数与首页/导航交互见 `FEATURE_HOME_NAVIGATION.md`。
- **拉丁衬线栈 `--font-serif-latin` 首位是自托管 `"EB Garamond"`**（2026-10-25 起），后面才是 Palatino Linotype / Georgia / Times 作回退。Latin `@font-face` 按 400/500/600/700/800 字重分别注册，`size-adjust` = 0.47 / 各字重 x-height（111.11%–117.5%，共用两个变量字体文件 URL），保留英文大小。已移除 `body` 的全局 `font-size-adjust`，避免中文被缩至 91.44%；中文恢复原始尺寸，约比旧效果大 9.36%。不要叠加两种补偿。
- 幕布/首帧级视觉用 `body::before` 伪元素 + body class 驱动（React hydration 安全），CSS 放 globals.css 而非 styled-jsx。
- **阴影按控件尺寸分档（2026-10-17）**：`--shadow-lift`（第二层 32px 模糊）是**卡片**阴影，
  用在 44–64px 的按钮/胶囊上会变成脱离本体的光晕（用户报「download CV 悬浮阴影太大」）。
  按钮尺寸的东西一律用 `--shadow-ctl`（12px 模糊 + **负 spread**，贴住轮廓）：
  `hover:shadow-ctl`。判据：元素高度 < ~96px 或它是"能点的" → `ctl`；是一块内容 → `lift`。

## 构建与环境

- `npm run build`（prebuild 自动跑 badges）→ `out/`；构建被安全 shim 阻断时 `NODE_OPTIONS= npm run build`。
- build 报 EBUSY rmdir out/ = 有静态服务器还在锁目录，先杀 4173。
- 验证流水线与 CDP 探针用法见 `handover.md` §4。
