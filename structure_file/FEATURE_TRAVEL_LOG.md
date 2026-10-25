# FEATURE — 统一地图旅行日志框架

2026-10-24。适用 `/travel/ptes-2025/`、`/travel/just-because/` 及其 `/travel/zh/<id>/` 镜像。

## 组织边界

旅行日志是 Travel 的详情内容；`card.json` 经 `lib/travel/trips.ts` 自动进入 Travel、Blog 与首页动态，只有一个正式详情 URL，不建立博客跳板。

```
路由 page.tsx
  → lib/travel/log/definitions/<id>.ts（本篇的内容、类型与加载地址）
  → components/travel/log/TravelLogPage.tsx（公共服务端入口）
  → TravelLog / PilgrimageLog（内容类型适配器）
  → TravelLogShell（公共外壳）
      ├─ TravelMap / PilgrimageMap（各自的轨迹和镜头）
      ├─ TravelStory / PilgrimageStory（各自的正文）
      └─ ChapterNavigation / MapToolbar / 返回按钮与幕布
```

`TravelLog` 是可复用的 journal 类型适配器，内部不再导入 PTES 数据。新增 journal 不需要修改它。两种类型都由可序列化的 `TravelLogDefinition` 描述，判别字段为 `kind: "journal" | "pilgrimage"`。每篇定义单独导入自己的 JSON，避免中央注册表把所有旅行正文打进同一个内容模块。

## 公共部分

| 模块 | 职责 |
|---|---|
| `components/travel/log/TravelLogPage.tsx` | 解析期沉浸/幕布脚本；连接语言与内容类型；生成页面 metadata |
| `TravelLogShell.tsx` | 公共框架、返回、离场动画、幕布就绪/超时/失败处理、加载与错误状态、布局 context |
| `ChapterNavigation.tsx` | 一份章节测量、阅读百分比、桌面轨道、移动端拖拽提示、目录与返回顶部逻辑；保留两套正文边栏的视觉 skin |
| `MapToolbar.tsx` | 公共主题控件与定位；地图专属按钮通过 children 接入 |
| `lib/travel/log/layout.tsx` | 1024px 断点、两类默认高度、按旅行 ID 的存储配置 |
| `lib/travel/log/reading-geometry.ts` | 地图遮挡后的正文可见区域、导航阅读线、文档进度与连续拖拽 |
| `lib/travel/log/navigation.ts` | 正文元素查询与 `navigateToChapter()`；支持 journal 阅读线落点和 pilgrimage CSS 落点策略 |
| `lib/travel/log/camera.ts` | `follow / overview / manual` 镜头所有权语义；真实手势进入 manual |
| `lib/travel/map-split.tsx` | 分隔条手势与尺寸发布；不认识具体旅行的 class 或 CSS 变量 |
| `lib/travel/log/validate.ts` | 两种数据形状的构建期校验 |

页面共同使用 `[data-travel-log]` 表示框架，`[data-log-map]` 表示地图列，`[data-log-section]` 表示正文章节。`LogChapter` 独立描述目录分组：一条目录项可以指向一天的第一个场景，而不必等同于一个正文小节。

## 独立部分与不变量

- journal：日分组、时段、夜间分隔、景点文字；叙事时间插值、飞行/地面/缺失轨迹及关键帧镜头仍由原组件负责。
- pilgrimage：对比图、插叙与评论；拍摄时间/`routeIdx` 定位、站点镜头、弹窗的 active/open/dismissed 状态仍独立。
- 文档阅读百分比不等于旅行时间或路线百分比。导航按文档滚动范围计算，地图位置由各类型适配器计算。
- PTES 的光标与镜头继续使用同一条缓动阅读线。正文日期进度通过实例内 `readTime()` 读取，已移除 `window.__ttime` 内部通信；原地图调试接口不参与正文通信。
- 巡礼导航直接消费正文 observer 得出的当前章节，不再自行运行第二套章节评分。
- 手动探索不因后续滚动恢复；显式恢复回到当前阅读位置；巡礼查看全程后保持 overview。
- 入场幕布完整加载时由解析期脚本设置 body 类，Next Link 导航由 `useLayoutEffect` 在绘制前补齐；统一通过 `body::before` 绘制。禁止水合前插入真实 DOM 幕布。动画监听同时检查名称与 `pseudoElement`，失败及超时应释放幕布，卸载须清理类。

## 布局与样式

- `<1024px` 上下排列，`≥1024px` 左右排列；桌面地图宽 46%。移动端 journal 默认 40vh、pilgrimage 默认 58vh。
- 默认值唯一配置在 `LOG_LAYOUTS`；静态首帧的 CSS 默认值通过外壳发布。旧变量只作为现有正文样式的兼容接口。
- 分隔条范围保持 50px 至视口高度的 85%；拖动阈值 6px；存储键为 `travel-log-split:<旅行 id>`，不同旅行互不覆盖。现有两篇定义声明了旧存储键，已有拖拽尺寸继续作为回退读取，新拖动写入新键。
- 公共高度为 `--log-map-height`，公共落点为 `--log-landing` / `--log-band-top`，同时写入地图列与公共祖先。提交手势后发布 `MAP_SPLIT_EVENT`，导航和叙事控制器重新测量。
- `app/travel-log.css`：共享骨架与返回/工具栏；`app/travel-journal.css`：原 PTES 正文/地图样式；`app/travel-navigation.css`：原 journal 导航 skin；巡礼正文及导航 skin 仍在 `globals.css`。
- **`.travel-layout .map-container` 的定位选择器必须比 `.maplibregl-map` 更具体**。样式静态导入后，MapLibre CSS 可能晚到；同权重的 `position: relative` 会把绝对填充容器压成零高，画布仍存在但被裁掉，外层尺寸检查无法发现。验收须检查 canvas 的实际命中与可见性。

## 新增一篇旅行日志

1. 创建 `content/travel/<id>/card.json`；目录名与卡片 `id` 一致。此后各索引自动发现它。旅行日志 `pinned` 默认 true（featured 排位），`showPinnedBadge` 默认 false（可见图标）；目前只有 PTES 开启图标，Anitabi 仍为 featured。两者可选字段均校验为布尔值；不要为了隐藏图标取消 featured 排位。
2. 按现有 journal 或 pilgrimage 模型准备本篇内容。正文保留自己的创作语言；公共界面语言由路由传入。
3. 创建 `lib/travel/log/definitions/<id>.ts`，直接导入本篇小文件、调用对应校验器并提供 `kind/id/card/wordmark`。journal 另提供 `trip/scenes/attractions/trackUrl`，pilgrimage 提供 `data`。浏览器标题不同于卡片标题时可提供 `pageTitles`。
4. 添加两个薄入口：`app/travel/<id>/page.tsx`、`app/travel/zh/<id>/page.tsx`，只导入定义和 `TravelLogPage`，分别传 `lang="en"` / `"zh"`；metadata 调用 `logMetadata()`。
5. 大轨迹如果需要 URL，在 `scripts/sync-trip-data.mjs` 的 `MIRRORED` 明确声明。现有巡礼不可重建快照继续由 `KEEP` 保护，不改变原始数据归属。
6. 检查数据引用、双语字段、类型、lint 和静态导出；再验证两种语言及断点两侧。新增已有类型不需要修改公共导航、布局、返回与幕布。

新内容类型才需要扩展 `TravelLogDefinition`，提供自己的正文、旅行位置计算和地图组件；接入同一外壳、章节接口与工具栏。不要把新类型字段塞进旧类型的可选字段集合。

首页/导航卡片的确认图形、返回规则和辅助标签参数另见 `FEATURE_HOME_NAVIGATION.md`；照片的 `featured` 不等于旅行日志的 `pinned`。

## 验收方法

每阶段执行类型、改动文件 lint、静态构建，保留阶段截图；最终浏览器回归脚本为 `scripts/check-travel-log.mjs`。需要可用的 `playwright-core` 和 Chromium，通过 `PLAYWRIGHT_MODULE`（file URL）及 `CHROME_PATH` 指定；测试自行启动仅限 loopback 的静态服务器，读取 `out/`，不访问线上站点。

卡片入口的回退/缓存状态另用 `scripts/check-card-launch.mjs`（相同环境变量，先构建 out/）。检查中英文、1440/390px、首页和两篇旅行日志反复进入/返回、浏览器快照恢复、重复点击及遗留计时器取消。StoryTile 还需检查返回后封面不因恢复的 hover/focus 展开，新的鼠标移动和 Tab 聚焦可重新启用。Headless Chrome 不执行部分浏览器快捷键，脚本发送 Alt+Left 建立键盘输入状态后，必要时调用相同的 history.back 操作；不会把 DOMContentLoaded 当作缓存恢复事件。

Travel gallery 的 StoryTile 使用 Next Link/router.push，不再通过 window.location.href 整页跳转。行程卡片数据声明 travelLog: true；确认结束时 lib/travel/log/entry-transition.ts 先加 body.travel-log-launch，以同色全屏伪元素覆盖源页，目标 TravelLogShell 在 useLayoutEffect 先加 boot 再 clearTravelEntry 接管，之后按原逻辑从左向右展开。源页有取消/6s 超时清理，减少动态效果时不启动。沉浸页禁用 .route-fade 的通用 transform 动画并约束横向溢出，避免固定地图短暂错位及水平滚动条。

这条衔接另用 scripts/check-travel-entry.mjs 逐帧验收（同环境变量）：源页复位在全屏蓝幕之下、同一 document、两端幕布颜色一致、有实际展开阶段、全程无横向溢出、返回无残留。--dark 检查暗色；--reduced --smoke 检查手机中英文减少动态效果。GalleryView 在当前标签页内保存离开时的排序、精选开关、随机种子与列数，返回时恢复；use-card-launch 的返回标记保留至真实交互，不能在首次挂载时消费，否则手机瀑布流重分列再挂载会丢失标记。

检查四个语言路由、390/1023/1024/1440px、尺寸拖拽与保存、跨断点恢复、进度拖拽章节提示、目录跳转与 Escape、主题切换、地图手动探索与恢复、全程模式、轨迹失败及减少动态效果。截图需要目视检查地图和正文，并与重构前的正文几何、章节数量及控件位置对照。

本环境基线的 Turbopack 构建在 PostCSS 子进程连接处失败；阶段验收使用 `node node_modules/next/dist/bin/next build --webpack`，未更改项目默认构建命令。数据检查仍单独执行 `sync-trip-data.mjs --check`、`check-refs.mjs`、`check-i18n.mjs`。

## 本次验收记录（2026-10-24）

| 阶段 | 检查与结果 |
|---|---|
| 数据入口 / 外壳 | TypeScript、lint 与 Webpack 静态导出通过；四个语言路由生成成功；截图记录基线与第一阶段几何 |
| 布局 / 工具栏 / 分隔 | TypeScript、lint 与静态导出通过；390px 默认高度及 1440px 正文尺寸保持；960px PTES 按约定改为上下排列 |
| 章节导航 / 跳转 | TypeScript、lint 与静态导出通过；两类日志共用导航实现，日期/站点分组及各自落点策略保留 |
| 完整回归 | 四个语言路由通过分隔拖拽、尺寸保存、1023/1024/1440px 切换、进度拖拽提示、目录跳转、Escape、主题、手动镜头与恢复、返回主站检查 |
| 巡礼专属 | 实际点击地图点→正文定位；弹窗手动关闭在同一章节保持，换章节重新打开；overview 不被滚动抢回 |
| 兜底 / 兼容 | GPS 请求返回 503 时错误可见且幕布释放；减少动态效果时不启动幕布；旧尺寸偏好保留，其他旅行默认值不受影响 |
| 视觉对照 | 桌面 1440px、手机 390px 的正文高度、章节数量、地图列与控件几何和基线一致；目视核对地图、照片、正文及滚动联动截图 |

重构中发现静态 CSS 与 MapLibre 的加载顺序问题，已通过 `.travel-layout .map-container` 的选择器优先级修复，并在回归中增加画布填充检查及真实手势命中验证。最终 lint 无错误，`TravelMap` 原有的两条 effect 依赖警告保留；类型、引用、双语与数据镜像检查通过。没有改动原始内容、照片或轨迹，没有提交或发布。

## 开屏幕布修复（2026-10-24）

- 开屏应从全屏蓝色覆盖开始，再固定右边缘向右收走，使页面由左向右显露；返回则从右向左铺满。旧实现的 5%–8% 窄条已移除。
- 统一使用 `travel-log-entry-open` 与有定义的 `travel-log-entry-fallback`；释放规则放在兜底 shorthand 之后，明确重置延迟。动画时长 0.46s，兜底等待 3.5s；CSS-only 兜底也会隐藏竖排标题。
- `useLayoutEffect` 补齐 Next Link 进入时的启动类。监听仍过滤 `::before` 与动画名；迟到的就绪信号不能重新挂幕布；运行中切换 reduce 时立即清理。
- 验收命令 `node scripts/check-travel-log.mjs --entry`：1440px/390px × 两篇 × 两种语言，采样真实 CSS 动画的起始/中间/结束阶段，检查全屏覆盖、右侧固定原点、覆盖范围单调缩小、返回动画反向、清理后不残留类；另外检查真实 Blog Next Link 同文档导航、阻止应用脚本后的 CSS-only 退场、减少动态效果。
- 此修复补上了上一轮静态截图无法检查的动画过程验证。类型、lint 和 Webpack 静态导出通过。
