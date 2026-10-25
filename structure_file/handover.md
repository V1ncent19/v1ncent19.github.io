# Handover — 站点现状与新功能启动入口

**最后更新：2026-10-24。** 这是 `structure_file/` 的主入口。接手时**先读这一份**，再按需查：
`ARCHITECTURE.md`（系统怎么搭的）、`CONVENTIONS.md`（该怎么做）、`FEATURE_PILGRIMAGE.md`（巡礼页）。

---

## 1. 一句话现状

Next.js 16 静态导出的个人站（分支 `nextjs-rebuild`）已完全取代旧 Jekyll 站：
全部主路由（Home / About / CV / Blog / Project / Travel / Guestbook）上线真实内容，中文 `/zh` 覆盖主路由
（`/about/zh` 是亲笔原文，其余挂机翻声明条）。
**Travel 是当前最重的模块**：hub（地球仪 + 游记 tiles + 相册墙 + 心愿单）、ptes-2025 互动游记、just-because 巡礼地图。
2026-10-17 整棵新树（含 213 MB `public/assets/`）入库；**2026-10-18 首次部署成功并覆盖旧站**
（commit `2f2b7b7` / Actions run `39081897536` success，线上 `tuoruipeng.com` 已是新站，旧 Jekyll 的 `/gallery/` 等路由 404）。发布方式见 §4。

## 2. 技术栈（勿改）

- Next.js **16.3.4** App Router + React 19 + TS strict + Tailwind **v4**（CSS-var tokens），`output: "export"` → `out/`
- 部署目标：GitHub Pages（v1ncent19.github.io，`public/CNAME` 已就位）；**静态导出约束一切——禁止 server-only 特性**
- 评论 giscus（`@giscus/react`）；中文字体自托管子集化（GenWanMin2 TC + Cactus 深兜底）
- 地图 MapLibre GL（`/travel` 地球仪、ptes-2025、just-because）

## 3. 当前状态（2026-10-24）

| 项 | 状态 |
|---|---|
| **content/ 组织** | 已按路由段重排（`about/ blog/ cv/ project/ travel/ site/`），双语统一为 `{en,zh}` 一种写法 |
| **public/assets/** | 已按页面归属重排（`about/ home/ cv/ project/ gallery/ photos/`）；相册原图层除外（142 MB，不上线、git-ignored） |
| **部署** | ✅ 2026-10-18 上线（`2f2b7b7`）：主路由全 200，相册 48 张缩略图正常，旧 Jekyll 路由（`/gallery/`）404 |
| Travel hub | MapLibre 地球仪 + 游记 tiles + 「Stories & frames」相册墙 + 心愿单清单 + 双向 hover 联动 |
| ptes-2025 游记 | 沉浸式互动游记（粘性地图 + 胶囊吸顶 + 进度条 + 幕布动画），景点标点 73 个，正文 14.8k 字按 GPS 投放。**移动端进度条已改成可拖拽条（2026-10-24）** |
| 巡礼地图 | `/travel/just-because`（+zh）已上线：36 个对比点 + 273 点环线 + 可缩放相机 + 滚动联动。**还差用户填 `outro` 与 36 条 `note`** |
| 两页共用的进度条 | **移动端普通可拖拽条 + 拖动时浮出章节方框**（2026-10-24，v21，推翻 v17 水银温度计）；桌面竖轨圆点白环已修复。共享代码 `lib/travel/use-scrub-track.ts` + `lib/travel/scrub-chapters.ts` |
| Blog 索引 | md 文章 + 游记卡合并（`lib/blog-travel.ts`，读取时合并，按日期倒序），无「假 md」 |
| 双语 | 全站只有一种写法 + `npm run check:i18n` 守卫；`/project/zh/*` 曾显示英文摘要的 bug 已修 |
| 遗留 | 底图合规、ptes-2025 隐私（两条都等用户拍板）；9 处 anitabi 标点歧义；中文子集需覆盖 `content/travel/` |

## 4. 发布（GitHub Pages）

**唯一入口：`git push origin nextjs-rebuild`。** 推上去就自动部署 —— 不需要本地 `out/`，不需要 `gh-pages`
分支，也不用把 `out/` 提交进仓库。`.github/workflows/deploy.yml` 在 push 到 `nextjs-rebuild`
（或手动 `workflow_dispatch`）时执行 `npm ci` → `npm run build` → 上传 `out/` → `deploy-pages`。
**`main` 分支只是旧 Jekyll 树的备份，不参与部署，也不用为了上线去动它。**

一次性前提（已配好，换仓库才需要）：Settings → Pages → Build and deployment → **Source = GitHub Actions**。

当前线上：`main` 之外的 `nextjs-rebuild` 最新成功 run = `39081897536`（`2f2b7b7`）。之后每次 push
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
  判定，或用 PNG 解码后的像素行**（见 `.workbuddy/memory/` 里手写解码器的做法）。
- **找 `.read` / `.active` 元素要扫多个滚动位置**（0.15 / 0.25 / 0.35 …），单一位置经常
  一个都没有 → 探针拿到全白样本还"通过"。
- `next dev` 在本环境会反复死掉，所以验收一律走 `out/`。

## 6. 新功能怎么启动

1. **先读**：本文件 → `ARCHITECTURE.md`（找相关模块现有实现）→ `.workbuddy/memory/MEMORY.md`（工程坑）。
2. **守则**：多方案先问；不编造数据；移动端行为有显著变更先确认预期；不自动 commit/push。
3. **实现**：改代码 → 走 §5 → 视觉改动用探针截图目视验收。
4. **收尾**：追加 `.workbuddy/memory/<日期>.md`；定案落到 `structure_file/` 对应文档（分工见 `README.md`）。

## 7. 文档地图

| 文件 | 内容 |
|---|---|
| `README.md` | **文档索引**：每份文档回答什么问题、改什么要同步哪份 |
| `handover.md` | 本文件 —— 进度与启动入口 |
| `ARCHITECTURE.md` | 系统现状：创作内容地图、content 布局、双语模型、路由树、目录职责、脚本清单、数据管线、样式体系 |
| `CONVENTIONS.md` | Agent 守则 + 锁定的 v1 设计基线 + 历次决策（含已作废条目）+ Typography |
| `GALLERY_ADDING_PHOTOS.md` | 相册加照片的操作流程（照做即可；**注意 `GalleryPhoto/` 目前不存在**） |
| `FEATURE_PILGRIMAGE.md` | 巡礼地图：现状、管线、数据格式、实现不变量、待办、轮次记录 |
| `archive/` | 2026-09 初的重建规划原稿（Stitch 导出、迁移审计、实施规范），仅考古，**内容多已过时** |
