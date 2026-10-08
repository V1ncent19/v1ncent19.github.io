# Handover — 站点现状与新功能启动入口

**最后更新：2026-10-07。** 这是 `structure_file/` 的主入口文件。任何 agent 接手工作时**先读这一个文件**，再按需查 `ARCHITECTURE.md`（系统怎么搭的）和 `CONVENTIONS.md`（设计基线与工作守则）。

---

## 1. 一句话现状

Next.js 16 静态导出的个人站（`nextjs-rebuild` 分支）已完全替代旧 Jekyll 站的规划阶段：全部主路由（Home/About/CV/Blog/Project/Guestbook/Travel）上线真实内容，双语 `/zh` 覆盖主路由；**当前迭代焦点是 Travel 模块**（互动旅行志 hub + ptes-2025 互动游记 + 景点标点），已迭代至 v18，全部改动**未 commit**（基线 `9281bd9`），等用户验收。

## 2. 技术栈（勿改）

- Next.js **16.3.4** App Router + React 19 + TS strict + Tailwind **v4**（CSS-var tokens），`output: "export"` → `out/`
- 部署目标：GitHub Pages（v1ncent19.github.io，CNAME 已就位）；静态导出约束一切——**禁止 server-only 特性**
- 评论 giscus（`@giscus/react`）；中文字体自托管子集化（GenWanMin2 TC）

## 3. 当前进行中的状态（2026-10-07）

| 项 | 状态 |
|---|---|
| 未提交改动 | ~80 个文件（v1 基线后的全部迭代）。**绝不擅自 commit/push，等用户显式验收** |
| Travel hub | MapLibre 地球仪 + 游记 tiles + 心愿单清单 + 双向 hover 联动，导航第四项 |
| ptes-2025 游记 | 沉浸式互动游记（粘性地图 + 胶囊吸顶 + 进度条 + 幕布动画）；**v15 换入 `游记.docx` 重写正文（14.8k 字）并按 GPS 单元投放**；v16 起景点标点为纯视觉标记（点击弹窗已删）；v17 全量核查 75 个景点坐标；**v18 按用户逐条报错再修 14 处、删 2 增 0 → 73 个**（含焦糖山改用本人轨迹的长时间停留点） |
| 移动端 | ptes 上下 4:6 布局、图例可收起（默认收起）、tile 极简、排序格独立成行 |
| 手机预览 | WorkBuddy 发布链 https://e7404f038b8749af93853f25d7c30b44.app.workbuddy.host （说「重新发布预览」即重新部署） |
| 截图相册线上发布 | **暂停**（v12 起按用户要求） |

## 4. 验证流水线（每轮改动必走）

```bash
npx tsc --noEmit                          # 1. 类型
npx eslint <改动的文件>                    # 2. lint
NODE_OPTIONS= npm run build               # 3. 静态导出（NODE_OPTIONS= 绕过安全 shim）
# 4. CDP 探针验证（见下）—— serve 用 python http.server，不用 npx serve！
```

**⚠️ 静态预览/探针的坑（2026-09-28 实测）：`npx serve` 会把所有目录路由 200 回退到根页面 HTML（假象 = React #418）。一律用：**

```bash
cd out && python -m http.server 4173 --bind 127.0.0.1   # 与探针同一命令块内启动
```

- 探针脚本沉淀（新轮次复制改）：`.workbuddy/probe-v12.mjs`（hub + ptes 回归 16 项 ×zh/en）、`probe-v13.mjs`（移动端/幕布/图例 14 项）、`probe-v15.mjs`（正文与 planned 标 9 项）、`probe-v16.mjs`（标点几何/无弹窗交互/日筛选 16 项）、`probe-v17.mjs`（**纯数据、无需 Chrome**：75 个景点坐标对 OSM 权威值 80m 内 + 增删改名锁定 40 项）、`probe-v18.mjs`（纯数据 23 项）、`probe-v18-page.mjs`（浏览器内读 `getSource("attractions")` 的**实际渲染坐标** 14 项）。
- 数据核查工具：`.workbuddy/audit-attractions.mjs`（Nominatim 全量审计，输出偏差表 + `audit-attractions.json`）、`.workbuddy/apply-v17-markers.mjs` / `apply-v18-markers.mjs`（**外科式字符串替换**，每处必须恰好命中 1 次，否则整体退出不写盘；改前先 `cp` 备份到 `.workbuddy/attractions.backup-v*.json`）。
- **景点坐标权威排序：OSM Overpass 的建筑 `way` 几何 `center` > Wikipedia infobox > Nominatim 单点**（Nominatim 常返回相邻建筑/公交站/同名街道，判据 ≥250m 才改）。用户报「偏南/偏东」时先查该建筑**完整 bbox**（OSM 常把一栋楼拆成多个 way）；「他实际停留的地方」用 `track.json` 按时间间隙分段聚类取中位数（见 `.workbuddy/shot-v18-map.mjs` 的取点写法）。
- 截图：`Page.captureScreenshot` **带 `clip` 会丢 WebGL 画布**（截出空白）→ 整视口截；只点日期胶囊会把相机停在当天第一个 scene（day1 第一个在里斯本）→ 再 `scrollIntoView` 到目标城市的 scene；跨城市的日子别用标点质心当相机中心。
- Chrome/serve/探针**必须同一命令块**启动（后台进程随块结束被杀）；Chrome 加 `--no-proxy-server` + `--user-data-dir` 绝对路径 + `--window-size=1600,900`。
- 更多工程坑（styled-jsx、sticky、z-index、字体栈、react-hooks 新规则等）见 `.workbuddy/memory/MEMORY.md` —— **那是最完整的长期教训库，动 travel/about/背景前必读**。

## 5. 新功能怎么启动（给 agent 的标准开场）

用户提出新功能时，agent 按 `structure_file/CONVENTIONS.md` 的守则执行，标准流程：

1. **先读**：`handover.md`（本文件）→ `ARCHITECTURE.md`（找相关模块的现有实现）→ `.workbuddy/memory/MEMORY.md`（工程坑与既有定案）。
2. **守则**：多方案先用问题确认；不编造数据；移动端行为有显著变更先确认预期；不自动 commit/push。
3. **实现**：改代码 → 走第 4 节验证流水线 → 视觉改动用 CDP 探针/截图目视验收。
4. **收尾**：追加 `.workbuddy/memory/<日期>.md` 日志；把新的长期定案沉淀进 `.workbuddy/memory/MEMORY.md`，并把本轮进度更新到本文件的「当前进行中的状态」表。

## 6. 文件地图

| 文件 | 内容 |
|---|---|
| `handover.md` | 本文件 —— 进度与启动入口 |
| `ARCHITECTURE.md` | 实际系统架构：路由树、目录职责、数据管线、脚本 |
| `CONVENTIONS.md` | 锁定的 v1 设计基线 + 历次决策记录 + agent 工作守则 |
| `GALLERY_ADDING_PHOTOS.md` | 相册加照片的操作流程（照做即可） |
| `archive/` | 2026-09 初的重建规划原稿（Stitch、迁移审计、实施规范等），仅考古用，**内容多已过时** |
