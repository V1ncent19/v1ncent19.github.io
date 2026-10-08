# Architecture — 实际系统架构（截至 2026-09-28）

描述**现状**，不是规划。技术栈与全局约束见 `handover.md`。

## ⭐ 创作内容地图（"我写的东西在哪"）

| 你想改什么 | 去哪改 | 说明 |
|---|---|---|
| 博文 | `content/blog/*.md` | frontmatter：title/date/category；`_drafts/` 不发布 |
| About 正文 | `content/about/en.md` / `zh.md` | 手写双语，不自动翻译 |
| About 爱好/事实板、世界地图板 | `content/about/personality.json`、`travel.json` | 数据驱动，组件只负责渲染 |
| 项目笔记 | `content/project/*.md` | |
| CV 条目 | `content/cv/entries.ts` | TS 结构化（桌面双栏布局消费） |
| 相册照片地点/标题 | `content/gallery/items.json` | 人工字段，`gallery:gen` 不会覆盖 |
| 站点身份（名字/站训/邮箱/GitHub） | `content/profile.json` | `lib/site.ts` 只是它的类型化出口，勿再硬编码 |
| 游记 trip 注册表（标题/日期/统计行） | `lib/travel/trips.ts` | TS，与 GPS 管线联动 |
| 游记叙事（每站文字） | `public/data/travel/<trip>/scenes.json` 等 | 清洗管线的产物；编辑请改上游/重跑 `scripts/sanitize-trip-gps.py` |
| 界面文案（按钮/标题/图例/标签） | `lib/i18n.ts`（双语字典） | 全站 UI copy 唯一出处；发现组件内硬编码文案应收拢到这里 |
| zh 首页文案 | `app/zh/page.tsx`（内嵌） | **有意保留**：手写翻译约定（zh 首页不走自动翻译，en/zh 是两个平行维护的页面） |
| 照片/字体素材 | `public/assets/`（上网）＋ `assets-src/`（原始，勿放 public） | |

> 判断规则：**"写给人看的正文"→ `content/`；"界面上的固定文字"→ `lib/i18n.ts`；"要原样上网的数据文件"→ `public/data/`；"原始素材"→ `assets-src/`。**

## 路由树（app/）

```text
/                        首页（hero 自介 + Sections + Recent Posts + Direct access + Site Statistics）
/about, /about/zh        分层信息（基础信息公开，爱好/追星藏于交互后；含 travel-board）
/cv, /cv/zh              结构化 CV（桌面双栏；正文 "Experience"/"经历"）
/blog, /blog/zh          博客索引（客户端搜索 + 分类 chips + 排序）；/blog/[year]/[slug] 详情
/project, /project/zh    项目索引与详情
/gallery*, /gallery/zh   瀑布流 + 灯箱（保留双语但已退出主导航；导航入口在 Direct access）
/travel, /travel/zh      旅行志 hub（MapLibre 地球仪 + 游记 tiles + 心愿单清单）——导航第四项
/travel/ptes-2025(+/zh)  互动游记（粘性地图 + 文字流 + 幕布动画 + 总进度条）
/guestbook, /guestbook/zh 留言板（giscus，term 固定 "index"，勿动）
/zh/*                    双语镜像（nested zh；gallery 在 bilingualBases 手动维护）
```

## 目录职责

| 目录 | 职责 | 关键点 |
|---|---|---|
| `components/travel/` | Travel 模块全部组件 | `TravelMap.tsx`（MapLibre，basemap 持久化到 localStorage）、`TravelLog.tsx`（游记布局/幕布/样式主体，styled-jsx）、`TravelNav.tsx`（总进度条）、`TravelStory.tsx`（数据→布局装配）、`hub-globe.tsx`（D3 正交投影地球仪）、`hub-hover-link.tsx`（hub 地球↔列表共享 hotId 桥） |
| `components/gallery/` | `gallery-view.tsx` 同文件承载照片画廊 + 游记 StoryTile + 排序条 | 排序条方向格移动端独立成行 |
| `components/background/` | `spacetime-canvas.tsx` 时空背景（质量引力井 warp 网格） | 维护接口：CONFIG；网格向视口外延伸 max-strength 防「引力拉伸露边界」 |
| `components/layout/` | 导航、§ 锚点（`section-mark.tsx`）、页头等 | 全站 sticky 导航经 `.site-chrome-header{display:contents}` |
| `components/about/` | About 分层信息 + travel-board（世界地图足迹） | MARKER radius 持续调优 |
| `lib/` | `i18n.ts`（双语字典）、`blog.ts`/`content.ts`（内容装载）、`site.ts`、`travel/`（`trips.ts` trip 注册表 + `types.ts` + `use-story-controller.ts` 滚动状态机 + `gps.ts`） | |
| `content/` | `profile.json`、`navigation.ts`、`blog/*.md`、`gallery/items.json`、`cv/`、`project/` | manifest 类文件「脚本生成 + 人工编辑」模式 |
| `public/data/travel/<trip>/` | 清洗后的 GPS 轨迹与 scenes | **隐私红线见 §数据管线** |
| `scripts/` | `gallery.mjs`（gallery:gen）、`build-badges.mjs`（prebuild/predev）、`subset-cjk-fonts.py`（字体子集）、`sanitize-trip-gps.py`（GPS 清洗） | |
| `assets-src/` | 原始素材（字体 OTF、**travel 原始 GPS 数据**、GalleryPhoto 原图） | 绝不进 public/，git-ignored（部分） |

## 数据管线

- **相册**：`GalleryPhoto/` 原图 → `npm run gallery:gen` → `public/assets/gallery/{thumb,large}` + `content/gallery/items.json`（人工字段保留）。详细流程见 `GALLERY_ADDING_PHOTOS.md`。
- **Badge**：`npm run badges`（prebuild/predev 自动）合成 `badge-art.generated.ts`；改图标后需手动重跑。
- **中文字体**：`assets-src/fonts/GenWanMin2TC/` OTF → `scripts/subset-cjk-fonts.py` → `public/fonts/genwanmin2tc-{r,m,sb}.woff2`；大改内容后用 venv python 重跑。
- **Travel GPS（隐私红线，最高优先）**：新增 trip = lab 预处理 → `scripts/sanitize-trip-gps.py` 清洗（home anchor 自动取轨迹首点、radius 3km 裁掉居家段并重排全部索引/bounds）→ `public/data/travel/<id>/` → `app/travel/<id>/page.tsx`(en+zh) + `lib/travel/trips.ts` 加行 + 统计字段同步。**public/ 上网数据绝不含住址级 GPS；原始数据只留在 `assets-src/travel-data/`。**

## 样式体系

- Tailwind v4 + `app/globals.css` CSS-var tokens（主色 light `#1ba7c9` / dark `#3ccfff`）；语义组件类包裹卡片/按钮/tags。
- 全站 90% 页面缩放：`:root --page-scale:0.9` + `html{font-size:calc(16px*var(--page-scale))}` —— 与 rem 元素做相对定位必须用 rem 任意值。
- 中文衬线栈 `--font-serif-zh`（首位 GenWanMin2 TC）。
- 幕布/首帧级视觉用 `body::before` 伪元素 + body class 驱动（React hydration 安全），CSS 放 globals.css 而非 styled-jsx。

## 构建与环境

- `npm run build`（prebuild 自动跑 badges）→ `out/`；构建被安全 shim 阻断时 `NODE_OPTIONS= npm run build`。
- build 报 EBUSY rmdir out/ = 有静态服务器还在锁目录，先杀 4173。
- 验证流水线与 CDP 探针用法见 `handover.md` §4。
