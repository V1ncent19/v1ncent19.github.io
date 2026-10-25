# 首页、总导航与标签：当前定稿

最后核对：2026-10-25。本文记录当前实现；交互试验与被撤销方案见 `INTERACTION_AUDIT.md`，不要将旧参数当作现行规则。

## 文件与职责

| 文件 | 职责 |
|---|---|
| `app/page.tsx`、`app/zh/page.tsx` | 双语首页文案、导航卡片、Recent Posts；两份首页独立维护但交互规则同步 |
| `components/layout/site-header.tsx` | 页头、当前栏目识别、移动导航菜单；路径匹配先去掉尾斜杠 |
| `components/layout/desktop-nav.tsx` | 桌面导航的共享胶囊底板、鼠标/焦点跟随、位置测量 |
| `components/home/gateway-link.tsx` | 首页导航卡片确认，等待 360ms 后使用 router.push |
| `lib/use-card-launch.ts` | 首页/画廊卡片的确认计时器、重复点击保护、返回复位 |
| `components/gallery/gallery-view.tsx` | StoryTile 的 320ms 确认、站内路由、画廊返回设置恢复 |
| `lib/travel/log/entry-transition.ts` | Travel 卡片源页蓝幕及目标页接管；详细机制见 `FEATURE_TRAVEL_LOG.md` |
| `app/globals.css` | 导航底板、标题胶囊、确认图形及辅助标签样式 |

## 首页导航卡片

- 保留左侧 About 大卡、右侧四张小卡的网格、原断点及尺寸规则。
- 卡内顶部为编号/状态；下方只保留标题和一句说明，不恢复关键词行。
- About 英文说明保留 “Who I am & what I do, plus a few fun facts.”；中文对应“我是谁、在做什么，以及一些趣事。”。
- 标题与说明左对齐；磨砂标题胶囊保留。featured 标题做字形光学校准：英文 `translate: 0.02em -0.1em`，中文 `0.05em 0.01em`；字体、行盒和卡片外框不变。
- 此前对所有卡片留白和标题位置的微调已撤销。**About 整组文字桌面端再下移的建议尚未实施**：测得英文约 12px、中文约 9px 可与下排标题基线对齐，仅是候选方案；手机布局不因此改变。

## 总导航

- 桌面是一个浅色胶囊底板在栏目之间移动，`transform/width/height` 过渡为 200ms；快速切换直接衔接当前动画，不排队、不回弹。
- 鼠标离开后回到当前栏目；键盘仍聚焦在导航内时跟随焦点。当前栏文字保持主题色，另有细小下划线。
- 下划线位于 `.primary-nav-label::after`，按**文字**居中，不能将 Travel 的 Beta 纳入宽度；底部 3px、宽 0.6rem、高 2px。
- 链接原布局及 15px 字号保留。底板、链接回退背景均为完整胶囊圆角，尤其不能让 Home 左端重新出现圆角矩形。
- `ResizeObserver`、字体就绪及路由变化后重新测量。减少动态效果时直接定位；无 JS 时保留逐项背景。
- 当前页点击仍回到顶部；修饰键/中键保持原生新标签页行为。手机继续使用原 FAB 菜单、Escape 关闭与滚动锁，不强行套用悬浮移动。

## 点击确认与返回

- 首页恢复历史提交 `c752b37` 的图形：soft 圆底、主题色右箭头，阴影 `0 6px 18px rgb(0 0 0 / .14)` 加 4px surface 淡色外圈。不是后续试验的双细描边印章。
- 同一支中央箭头在 hover/focus 时出现，点击后保持原位，只让圆底、阴影及外圈执行 `gw-stamp-pop`（0.4 → 1.1 → 1、280ms）；总确认等待 360ms。
- Travel StoryTile 保留自己的 320ms 确认与原来的完整徽章/箭头描线，不照搬首页同位箭头样式。
- 共享 hook 在跳转前及 pagehide/pageshow/popstate、effect 清理时清除确认类和计时器。保留原生链接、重复点击保护和 reduced-motion 零延迟导航。
- StoryTile 的 `data-return-idle` 防止浏览器返回时恢复 hover/focus 而自动展开封面，保留可见焦点框；真实鼠标移动/按下或重新 Tab 聚焦后恢复效果。返回标记在客户端路由和瀑布流重新分列挂载之间保留，不能在首次挂载时提前消费。
- 画廊的排序、精选开关、随机种子和列数在当前标签页的返回访问中恢复，不写入持久用户偏好。

## 标签字号与外框

基准 `html` 字号为 14.4px（`--page-scale: 0.9`）：

| 样式 | 字号 | 行高 | 上下 / 左右 padding |
|---|---|---|---|
| `.post-category-tag` | 0.8rem / 11.52px | 1.25 | 0.2rem / 0.6rem |
| `.recent-post-tag` | 0.7rem / 10.08px | 继承上行 | 0.2rem / 0.5rem |
| `.beta-badge` | 0.65rem / 9.36px | 1.2 | 0.16rem / 0.45rem |
| `.badge-text` | 0.75rem / 10.8px | 1.3 | 由外框负责 |
| `.badge-text-sm` | 0.7rem / 10.08px | 1.25 | 由外框负责 |
| `.badge-pill` | 不设置字号 | 不设置行高 | 0.2rem / 0.55rem |

- Recent Posts 分类标签与 Blog 一样是胶囊，使用文案本身的大小写；不要加 `uppercase`。Beta 仍为全大写。
- `.badge-pill` 统一文字居中与留白；外形由组件的 `rounded-full` 等类决定。固定尺寸的编号框不加这层 padding；灯箱元信息胶囊保留自身较宽的内边距。
- 不给这些标签加回 `text-[9px]` / `text-[9.5px]` / `text-[10px]` / `text-[10.5px]` / `text-[11px]`，否则全局 `html :is(...)` 会将其强制抬到 12.96px。
- 正文、目录链接、照片说明、日期与导航主文字保留既有字号，不通过取消全局阅读字号规则来缩小标签。

## 旅行日志 featured 与可见图标

- 两篇 travel log 都是 featured 导航入口，位于照片流之前；新日志 `pinned` 默认 true，照片精选开关和排序不将它们混回照片中。
- `pinned` 控制排位，`showPinnedBadge` 控制可见图标，二者独立。
- **仅 PTES 显示置顶图标**：PTES 两字段均为 true；Anitabi 的 pinned 为 true、showPinnedBadge 为 false。新日志默认不显示图标。
- 卡片内容真源为 `content/travel/<id>/card.json`；字段及新增流程见 `FEATURE_TRAVEL_LOG.md` 与 `content/travel/README.md`。

## 验收与边界

- 导航：中英、明暗主题、1440/1024/768/390px；核对链接坐标/宽高/字号、连续 hover、离开回位、Tab/Enter、回顶、新标签页、手机菜单/Escape、reduced-motion。
- 标签：核对字号、行高、内边距、圆角和大小写；正文与导航主文字大小不变。瀑布流 DOM 可因布局重排，应按内容匹配比较，而非只比较 DOM 索引。
- 回退自动回归：`scripts/check-card-launch.mjs`；蓝幕连续交接：`scripts/check-travel-entry.mjs`（另支持 `--dark`、`--reduced --smoke`）；公共日志：`scripts/check-travel-log.mjs`。
- 浏览器脚本需先成功构建 `out/`，通过 `PLAYWRIGHT_MODULE`（playwright-core 的 file URL）和 `CHROME_PATH` 提供本地运行时；自行启动 loopback 静态服务器。
- Headless Chrome 不执行部分浏览器快捷键，回退脚本建立键盘输入状态后必要时调用 history.back；不会把 DOMContentLoaded 当作 BFCache 恢复事件。
- 最近验收覆盖 16 组导航状态、30 组正文/导航字号比对、明暗蓝幕连续交接、24 次进入/返回、画廊设置返回保留及中英文仅 PTES 图标。详情与截图记录见 `INTERACTION_AUDIT.md`。截图在本任务 visualizations 中，不属于站点发布资源。
- 本轮完成本地修改和验收，未据此执行 commit、push 或部署。用户已撤回“Anitabi 幕布未生效”的后续报告，撤回后未改幕布。
