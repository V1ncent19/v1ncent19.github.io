# Handover — 站点现状与新功能启动入口

**最后更新：2026-10-29。** 这是 `structure_file/` 的主入口。接手时**先读这一份**，再按需查：
`ARCHITECTURE.md`（系统怎么搭的）、`CONVENTIONS.md`（该怎么做）、`FEATURE_TRAVEL_LOG.md`（公共日志）、`FEATURE_GUATEMALA_TERRAIN_LOG.md`（Guatemala 三维地形日志）、`FEATURE_PILGRIMAGE.md`（巡礼页）、`FEATURE_HOME_NAVIGATION.md`（首页、导航、标签与卡片）。

---

## 1. 一句话现状

Next.js 16 静态导出的个人站（分支 `nextjs-rebuild`）已完全取代旧 Jekyll 站：
全部主路由（Home / About / CV / Blog / Project / Travel / Guestbook）上线真实内容，中文 `/zh` 覆盖主路由
（`/about/zh` 是亲笔原文，其余挂机翻声明条）。
**Travel 是当前最重的模块**：hub（地球仪 + 游记 tiles + 相册墙 + 心愿单）、ptes-2025 互动游记、just-because 巡礼地图、guatemala-2026 三维地形游记。
2026-10-17 整棵新树（含 213 MB `public/assets/`）入库；**2026-10-18 首次部署成功并覆盖旧站**
（commit `2f2b7b7` / Actions run `39081897536` success，线上 `tuoruipeng.com` 已是新站，旧 Jekyll 的 `/gallery/` 等路由 404）。发布方式见 §4。

## 2. 技术栈（勿改）

- Next.js **16.3.4** App Router + React 19 + TS strict + Tailwind **v4**（CSS-var tokens），`output: "export"` → `out/`
- 部署目标：GitHub Pages（v1ncent19.github.io，`public/CNAME` 已就位）；**静态导出约束一切——禁止 server-only 特性**
- 评论 giscus（`@giscus/react`）；中文字体自托管子集化（GenWanMin2 TC + Cactus 深兜底）
- 地图 MapLibre GL（`/travel` 地球仪、ptes-2025、just-because）

## 旅行日志重构（2026-10-24）

两个日志已接入公共骨架、工具栏、章节导航、跳转与分隔拖拽；四个路由为薄入口。内容定义在 `lib/travel/log/definitions/`，正文和镜头仍分别维护。新增流程与验收命令见 `FEATURE_TRAVEL_LOG.md`。统一断点为 1024px，原 901–1023px 的 PTES 双栏调整为上下布局；默认比例和正文排版保持。此次不提交或发布。 开屏幕布随后修复为全屏覆盖后从左向右揭开；完整加载和 Next Link 导航均启动，动画过程验收使用 `check-travel-log.mjs --entry`。

## 本轮收尾（2026-10-25）

- 中英文首页保留原网格与悬浮效果、标题加一句说明；确认复用中央箭头，只呈现原版圆底与外圈。About 整组文字下移尚未实施，先前整体留白调整已撤销。
- 桌面导航共用完整胶囊底板，下划线按文字居中、排除 Beta；Recent Posts 分类胶囊与 Blog 大小写一致；全站辅助徽标独立控制字号与留白，不修改正文与导航主文字字号。
- Travel 卡片经同色源页蓝幕交接到日志幕布；浏览器返回清理确认与恢复悬浮状态，并保留本标签页画廊设置。Travel hub 的三层优先级为 pinned → featured → 当前排序：仅 PTES pinned，所有日志 featured，且仅 PTES 显示图钉图标。用户撤回后续 Anitabi 幕布故障报告，未据此再改幕布。
- 本地 Webpack 静态导出 70 页、类型、目标文件 lint、223 条资源引用检查通过；双语检查无错误，已有缺译提示保留。浏览器验收含 16 组导航、30 组字号比对、24 次卡片返回及明暗幕布交接，方法与限制见两份 FEATURE 文档及 `INTERACTION_AUDIT.md`。
- 本轮未 commit、push 或发布。此处记录的是本地验收，不能作为线上版本状态。

## Guatemala 三维地形日志（2026-10-28）

- 新增 `/travel/guatemala-2026/` 与中文镜像，接入公共日志外壳的新 `terrain` 类型；中文正文、9 个章节、906 点路线、25 张去元数据照片与一张 Starbucks 占位图已可运行。
- 地图使用本地 Terrarium DEM、素色贴图与平滑 100 m 等高线，支持三维跟随、手动探索后恢复、卫星切换、首尾环绕、山峰/营地/起点标记及滚动联动照片框。
- 全年 GPS 与带 EXIF/QuickTime metadata 的原始媒体仅在 `assets-src/` 私有目录，均被 `.gitignore` 拦截；分支只提交裁切路线、位置展示数据、去元数据 WebP/MP4 与地形派生资源。另一台设备可直接继续正文、镜头和界面工作，重生成媒体/路线才需私下复制母版。
- 完整职责、生成命令、交互不变量与异机接续见 `FEATURE_GUATEMALA_TERRAIN_LOG.md`。本轮开发分支不触发 Pages；只有 `nextjs-rebuild` 会部署。
- 2026-10-29：三种日志共用开场阅读提示和三列元数据窗格；正文 autoplay 经体验后撤回，地图和不同密度内容继续由用户滚动协调。Guatemala 修复 PTES 式章节吸顶交接，并让地形/路线在幕布后预载、揭幕后直接环绕总览；路线联动、照片避让、相机校正和环绕均已限频/抽样。新增 8 张照片与 2 段去 metadata 的 H.264 MP4，地图对视频显示 WebP 代表帧；当前共 33 张发布照片、2 段视频及一张占位图。Guatemala 卡片显式显示 2026.06.01，排序以 `end` 为日期真源；除最高优先级的 PTES pinned 卡外，其余日志与 featured 照片共用同一精选时间线。

## 3. 当前状态（2026-10-25）

| 项 | 状态 |
|---|---|
| **content/ 组织** | 已按路由段重排（`about/ blog/ cv/ project/ travel/ site/`），双语统一为 `{en,zh}` 一种写法 |
| **public/assets/** | 已按页面归属重排（`about/ home/ cv/ project/ gallery/ photos/`）；相册原图层除外（145 MB，不上线、git-ignored，**同时充当 `gallery:gen` 的源目录**） |
| **部署** | ✅ 2026-10-18 上线（`2f2b7b7`）：主路由全 200，相册 48 张缩略图正常，旧 Jekyll 路由（`/gallery/`）404 |
| Travel hub | MapLibre 地球仪 + 游记 tiles + 「Stories & frames」相册墙 + 心愿单清单 + 双向 hover 联动 |
| ptes-2025 游记 | 沉浸式互动游记（粘性地图 + 胶囊吸顶 + 进度条 + 幕布动画），景点标点 73 个，正文 14.8k 字按 GPS 投放。**移动端进度条已改成可拖拽条（2026-10-24）** |
| 巡礼地图 | `/travel/just-because`（+zh）已上线：36 个对比点 + 273 点环线 + 可缩放相机 + 滚动联动。**还差用户填 `outro` 与 36 条 `note`** |
| Guatemala 地形日志 | `/travel/guatemala-2026`（+zh）本地完成首轮：三维地形 + 等高线 + 906 点路线 + 25 张发布照片 + 9 章节镜头；当前在独立非部署分支继续打磨，线上尚未发布 |
| 两页共用的进度条 | **移动端普通可拖拽条 + 拖动时浮出章节方框**（2026-10-24，v21，推翻 v17 水银温度计）；桌面竖轨圆点白环已修复。共享代码 `lib/travel/use-scrub-track.ts` + `lib/travel/scrub-chapters.ts` |
| Blog 索引 | md 文章 + 游记卡合并（`lib/blog-travel.ts`，读取时合并，按日期倒序），无「假 md」。**游记卡日期用 `tripPostedAt()`（= `end`）** |
| 相册 | 49 张（含 2026-10-25 新加的 `img-6308`），源目录 = `public/assets/photos/gallery/original/`。`thumb` 宽 640、`large` 长边 1680。**「精选集」= 置顶不是筛选**（2026-10-25），墙上永远 49 张全在 |
| 双语 | 全站只有一种写法 + `npm run check:i18n` 守卫；`/project/zh/*` 曾显示英文摘要的 bug 已修 |
| 字体 | **拉丁 = 自托管 EB Garamond 可变字体**（2026-10-25，106 KB / 2 文件，OFL）；中文 = GenWanMin2 TC 子集。Latin 按 400–800 字重分别注册并校准 `size-adjust`（111.11%–117.5%，共用两个 URL）保留英文大小；已移除 body 全局补偿，让中文恢复约 9.36% |
| 字号 | **小字抬了一档，正文未动**（2026-10-25，用户选「保守档 B」）：`--text-xs` 12.96px / `--text-sm` 14.69px，另加一条 `html :is(...)` 把 9/9.5/10/10.5/11px 的任意值一并抬到 12.96px；`.prose code` 0.84em → 0.93em。辅助徽标另用语义字号与 padding，避开全局抬升；正文 token 与容器宽度保持，字体恢复可能改变中文换行。现行参数见 `FEATURE_HOME_NAVIGATION.md` |
| 遗留 | 底图合规、ptes-2025 隐私（两条都等用户拍板）；9 处 anitabi 标点歧义；中文子集需覆盖 `content/travel/`；**行宽未修**——blog cpl 90.3、首页 105，超出舒适区 60–75，用户暂未采纳收窄方案 |

## 4. 发布（GitHub Pages）

**唯一入口：`git push origin nextjs-rebuild`。** 推上去就自动部署 —— 不需要本地 `out/`，不需要 `gh-pages`
分支，也不用把 `out/` 提交进仓库。`.github/workflows/deploy.yml` 在 push 到 `nextjs-rebuild`
（或手动 `workflow_dispatch`）时执行 `npm ci` → `npm run build` → 上传 `out/` → `deploy-pages`。
**`main` 分支只是旧 Jekyll 树的备份，不参与部署，也不用为了上线去动它。**

一次性前提（已配好，换仓库才需要）：Settings → Pages → Build and deployment → **Source = GitHub Actions**。

2026-10-18 留存的部署验收快照（不是当前线上版本查询）：`nextjs-rebuild` 当时成功 run = `39081897536`（`2f2b7b7`）。之后每次 push
都会重新构建；构建失败时线上**保持上一次成功的产物**（不会变空），所以「推了但页面没变」先查 Actions。

### 发布前自检：本地绿 ≠ CI 绿

CI 是**干净检出**，只有被 git 跟踪的文件。凡是「本地有、却被 `.gitignore` 挡住」的资源，本地构建能过、CI 会挂：

```bash
# 用 HEAD 的内容复现 CI 的视野，再跑 prebuild 里最脆的那一环
rm -rf /tmp/ci-sim && mkdir -p /tmp/ci-sim
git archive HEAD | tar -x -C /tmp/ci-sim
cd /tmp/ci-sim && node scripts/check-refs.mjs      # 退出码必须为 0
```

2026-10-17 的 run #12 就是这么挂的：`content/travel/gallery/items.json` 里当时 48 处 `originalUrl` 指向
`public/assets/photos/gallery/original/`，而该目录被 `**/original/` 忽略规则扫了进去 → CI 拿不到这些文件 →
`check:refs` exit 1 → 构建阶段就失败，部署根本没发生。把 142 MB 原图入库后 push 又反复 HTTP 408 超时，
于是 **2026-10-18 取消「下载原图」功能**：清单不再有 `originalUrl`、灯箱不再有下载按钮、原图只留磁盘当母版
（git-ignored）。原因写在 `.gitignore` 与 `scripts/gallery.mjs` 头部注释里 —— 不要再把它入库。

改完之后，干净检出（`git archive HEAD`）里 `check-refs` 是 rc=0（221 条引用 / 65 个 content 文件全部解析），
这次 push 也只推了 9 个文本文件，秒过。

### 上线后验证

```bash
curl -s "https://api.github.com/repos/V1ncent19/v1ncent19.github.io/actions/runs?per_page=1"  # 看 conclusion
curl -o /dev/null -w '%{http_code}\n' https://tuoruipeng.com/travel/just-because/             # 新路由 200
curl -o /dev/null -w '%{http_code}\n' https://tuoruipeng.com/assets/about/cal.png             # 新资产路径 200
```

**2026-10-18 实测**：`/` `/travel/` `/travel/zh/` `/blog/` `/cv/` `/about/` `/project/`
`/travel/ptes-2025/` `/travel/just-because/` `/guestbook/` 全 200；`/travel/` 的 HTML 里 48 个
`/assets/photos/gallery/thumb/*.webp` 全部命中；`original/IMG_2408.jpeg` 404（**预期**，不上线）；
旧站 `/gallery/` 404 —— 覆盖完成。

页面有 `Cache-Control: max-age=600`，部署成功后旧页面可能还挂 10 分钟；`Last-Modified` 变了才算真换掉。

### 提交纪律

- **禁用 `git add -A` / `git add .`**（`b3baff4` 曾误提交 158 个构建产物）。按路径显式 add。
- `mv` 而非 `git mv` 之后索引会留**幻影路径**：提交前查 `git diff --cached --name-status | grep RD`。
- 撤销误提交用 **mixed reset**（`git reset HEAD~1`）；`--soft` 会把文件留在暂存区，之后加 `.gitignore` 对它无效。
- 删/移动资源时**必须让删除与新增进同一个 commit**，否则线上会出现「旧路径已删、新路径未上传」的全断图状态。
- agent 不代 commit/push，除非用户明确同意。

## 5. 验证流水线（每轮改动必走）

```bash
npx tsc --noEmit                    # 1. 类型
npx eslint <改动的文件>              # 2. lint
NODE_OPTIONS= npm run build         # 3. 静态导出（NODE_OPTIONS= 绕过安全 shim）
# 4. 视觉验收：serve out/ + Chrome 探针（见下）
```

prebuild 自动跑 `badges → sync:data → check:refs → check:i18n`，任何一环失败就不出包。

**⚠️ 静态预览与探针的坑**：

- `npx serve` 会把所有目录路由 200 回退到根页面 HTML（假象 = React #418）。一律用
  `cd out && python -m http.server 4173 --bind 127.0.0.1`。
- **Chrome / serve / 探针必须同一命令块启动**（后台进程随块结束被杀）；Chrome 加
  `--no-proxy-server --user-data-dir=<绝对路径> --window-size=1600,900`。
- 探针脚本必须放在 `C:/Users/V1nce/.workbuddy/binaries/node/workspace` 里跑
  （ESM 不认 `NODE_PATH`，放别处会 `Cannot find package 'playwright-core'`），**用完即删，别放进仓库**。
- **⚠️ build 失败时 `out/` 仍是上一次成功的产物**，探针照跑不报错、测出来全是旧数据 ——
  每次都要单独确认 build 成功。
- **`page.screenshot({ scale: "device" })` 在本机不生效**，输出仍是 CSS 像素（1440 宽页面
  只给 160×8，而非 640×32）。要读渲染像素就把 clip 按 CSS 像素放大，别指望 dpr。
- **样式表查不出层序问题**：两页 computed style 可以逐字段相同，而画面上一个「实心无边缘」、
  一个有白环 —— 差别只在绘制顺序。**视觉层级一律用 `document.elementsFromPoint()` 的栈顶
  判定，或用 PNG 解码后的像素行**（直接检查截图像素，不依赖样式表推断绘制顺序）。
- **找 `.read` / `.active` 元素要扫多个滚动位置**（0.15 / 0.25 / 0.35 …），单一位置经常
  一个都没有 → 探针拿到全白样本还"通过"。
- `next dev` 在本环境会反复死掉，所以验收一律走 `out/`。
- **相册网格是 round-robin 分列，DOM 顺序 ≠ 显示顺序**（2026-10-25）：`cols[i % columns].push(entry)`，
  所以「DOM 里前 6 个 `[data-gid]`」是第 0–1 轮，不是排序结果的前 6 个。探针还原 `flow`
  必须**每列轮流取一个**。另外行程卡（`story-*`）也带 `data-gid` 且排在最前，
  判「是不是照片」要对照 `items.json` 的 id 集合 —— 曾因此误判「置顶没生效」，其实是探针的算法错。

## 6. 新功能怎么启动

1. **先读**：本文件 → `ARCHITECTURE.md`（找相关模块现有实现）→ `CONVENTIONS.md` 和相关 `FEATURE_*.md`（规则与工程坑）。
2. **守则**：多方案先问；不编造数据；移动端行为有显著变更先确认预期；不自动 commit/push。
3. **实现**：改代码 → 走 §5 → 视觉改动用探针截图目视验收。纯文档整理只需核对引用、现行实现与 diff，不重复构建应用。
4. **收尾**：更新本文件当前状态；定案落到 `structure_file/` 对应文档，试验/撤销与交互验收追加 `INTERACTION_AUDIT.md`（分工见 `README.md`）。

## 7. 文档地图

| 文件 | 内容 |
|---|---|
| `README.md` | **文档索引**：每份文档回答什么问题、改什么要同步哪份 |
| `handover.md` | 本文件 —— 进度与启动入口 |
| `ARCHITECTURE.md` | 系统现状：创作内容地图、content 布局、双语模型、路由树、目录职责、脚本清单、数据管线、样式体系 |
| `CONVENTIONS.md` | Agent 守则 + 锁定的 v1 设计基线 + 历次决策（含已作废条目）+ Typography |
| `GALLERY_ADDING_PHOTOS.md` | 相册加照片的操作流程（照做即可；源目录 = `public/assets/photos/gallery/original/`，git-ignored） |
| `FEATURE_HOME_NAVIGATION.md` | 首页、总导航、标签、卡片点击与返回的最终规则及验收边界 |
| `FEATURE_TRAVEL_LOG.md` | 三类旅行日志公共骨架、独立边界、入口幕布与新增流程 |
| `FEATURE_GUATEMALA_TERRAIN_LOG.md` | Guatemala 三维地形日志：交互、镜头、照片、私有输入与派生资源管线 |
| `FEATURE_PILGRIMAGE.md` | 巡礼地图：现状、管线、数据格式、实现不变量、待办、轮次记录 |
| `archive/` | 2026-09 初的重建规划原稿（Stitch 导出、迁移审计、实施规范），仅考古，**内容多已过时** |
