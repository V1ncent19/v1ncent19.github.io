# Handover — 站点现状与新功能启动入口

**最后更新：2026-10-17。** 这是 `structure_file/` 的主入口。接手时**先读这一份**，再按需查：
`ARCHITECTURE.md`（系统怎么搭的）、`CONVENTIONS.md`（该怎么做）、`FEATURE_PILGRIMAGE.md`（巡礼页）。

---

## 1. 一句话现状

Next.js 16 静态导出的个人站（分支 `nextjs-rebuild`，HEAD `cb5cfd1`）已完全取代旧 Jekyll 站：
全部主路由（Home / About / CV / Blog / Project / Travel / Guestbook）上线真实内容，中文 `/zh` 覆盖主路由
（`/about/zh` 是亲笔原文，其余挂机翻声明条）。
**Travel 是当前最重的模块**：hub（地球仪 + 游记 tiles + 相册墙 + 心愿单）、ptes-2025 互动游记、just-because 巡礼地图。
工作区有大规模未提交改动，**等用户验收，agent 不代提交**。

## 2. 技术栈（勿改）

- Next.js **16.3.4** App Router + React 19 + TS strict + Tailwind **v4**（CSS-var tokens），`output: "export"` → `out/`
- 部署目标：GitHub Pages（v1ncent19.github.io，`public/CNAME` 已就位）；**静态导出约束一切——禁止 server-only 特性**
- 评论 giscus（`@giscus/react`）；中文字体自托管子集化（GenWanMin2 TC + Cactus 深兜底）
- 地图 MapLibre GL（`/travel` 地球仪、ptes-2025、just-because）

## 3. 当前状态（2026-10-17）

| 项 | 状态 |
|---|---|
| **content/ 组织** | 已按路由段重排（`about/ blog/ cv/ project/ travel/ site/`），双语统一为 `{en,zh}` 一种写法 |
| **public/assets/** | 已按页面归属重排（`about/ home/ cv/ project/ gallery/ photos/`）—— **整个新树还没入库**，见 §4 |
| Travel hub | MapLibre 地球仪 + 游记 tiles + 「Stories & frames」相册墙 + 心愿单清单 + 双向 hover 联动 |
| ptes-2025 游记 | 沉浸式互动游记（粘性地图 + 胶囊吸顶 + 进度条 + 幕布动画），景点标点 73 个，正文 14.8k 字按 GPS 投放 |
| 巡礼地图 | `/travel/just-because`（+zh）已上线：36 个对比点 + 273 点环线 + 可缩放相机 + 滚动联动。**还差用户填 `outro` 与 36 条 `note`** |
| Blog 索引 | md 文章 + 游记卡合并（`lib/blog-travel.ts`，读取时合并，按日期倒序），无「假 md」 |
| 双语 | 全站只有一种写法 + `npm run check:i18n` 守卫；`/project/zh/*` 曾显示英文摘要的 bug 已修 |
| 遗留 | 底图合规、ptes-2025 隐私（两条都等用户拍板）；9 处 anitabi 标点歧义；中文子集需覆盖 `content/travel/` |

## 4. ⚠️ 提交前必看

**工作区有 440 个变更条目，其中 265 个是 `public/assets/` 旧路径的删除、新路径全部未跟踪。**
只提交已暂存的部分 = **线上图片全断**（旧路径删了、新路径没进去）。

- 提交时必须让 **删除 + 新增进同一个 commit**：先 `git add public/assets/`，再 `git status` 核对
  「新路径是 `A` 而不是 `??`」。
- **禁用 `git add -A` / `git add .`**（`b3baff4` 曾误提交 158 个构建产物）。按路径显式 add。
- `public/assets/photos/gallery/original/` 被 gitignore（142 MB，**相册原图唯一副本**，别 `rm`）。
- `mv` 而非 `git mv` 之后索引会留**幻影路径**：提交前查 `git diff --cached --name-status | grep RD`。
- 撤销误提交用 **mixed reset**（`git reset HEAD~1`）；`--soft` 会把文件留在暂存区，之后加 `.gitignore` 对它无效。

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
