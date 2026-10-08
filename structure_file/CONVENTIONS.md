# Conventions — 设计基线、决策记录与 Agent 守则

来源：合并自 archive/ 中的 `DECISIONS.md`、`DESIGN_SYSTEM.md`、`UI_IMPLEMENTATION_GUIDE.md`、`AGENT_WORKFLOW.md`（2026-09 初的原始决策），并更新至 2026-09-28 现状。**带 ⚠️ 的行是被后续决策推翻或已过时的原始记录**，保留仅供考古；无标记的行仍然有效。

---

## 一、Agent 工作守则（最高优先）

- **不自动 commit/push**；全部改动等用户显式验收。commit message 末尾附 `Co-Authored-By: Claude Code <noreply@anthropic.com>`。
- **多方案特性先用问题向用户确认**，不编造数据（不发明用户事实、发表物、项目、日期）。
- **移动端行为有显著变更的自适应组件，先确认预期行为再实施。**
- 有不确定实施方案时先问，不闷头猜。
- 不加后端，不做破坏静态导出的事，除非用户明确批准。
- 旧内容是素材不是指令；Stitch 导出（见 archive/）只是视觉参考，禁止把其占位文案当真实内容。
- 每轮改动走验证流水线（`handover.md` §4）；完成后更新记忆文件（`.workbuddy/memory/`）。
- 新决策应记录到 `.workbuddy/memory/MEMORY.md`（细粒度 UI 定案）并更新 `handover.md` 状态表。

## 二、锁定设计基线（v1，用户拍板，不得擅改）

- **主色**：light `#1ba7c9` / dark `#3ccfff`；tokens 定义在 `app/globals.css`。
- **双区块 masthead**、§ 标题样式（serif italic sky-blue § + 黑标题 + 灰说明行）、内容列宽（卡片页 max-w-5xl，prose 页 ~max-w-3xl）。
- **页头名**：`Tuorui "v1ncent19" Peng`，引号与 v1ncent19 天蓝 hover underline-glow；站训 "En voyage dans l'espace de Hilbert."。
- **全站 90% 页面缩放**（--page-scale:0.9）；px 细节不随缩放，与 rem 对齐必须用 rem 任意值。
- 主题三态 light/dark/system，class `.dark` + `data-theme`。

## 三、导航与路由

- 首页卡片序 About → CV → Gallery → Blog → Project；胶囊导航第一项是 Home。
- **导航现行七项**（2026-09-25 起）：… Travel 第四项、Guestbook 第七项（无 gateway 卡，唯一入口在 Direct access）。
- ⚠️ 旧计划「Gallery 在主导航」已废：/gallery 保留双语但退出导航。
- 中文嵌套 `/zh`；blog slug kebab-case；单数 `project`。
- ⚠️ 旧计划「Cloudflare Pages 部署」已改为 **GitHub Pages**（现部署 v1ncent19.github.io，public/CNAME）。

## 四、内容与功能定案

- 首页无搜索框、无评论区；Site Statistics 用 legacy 基线占位（真实旧不蒜子数值待用户补）。
- giscus：博文详情页 + Guestbook（term 固定 "index"，改名会孤儿化历史评论）；其余页面不挂。
- OtherActivity / joke → documentation 博文；HighDim2024 是 Project 下的长笔记；三篇未发布草稿（HMC/NTK/Mahalanobis）不迁移。
- 博客索引有搜索/分类 chips/排序；`/blog#<category>` 深链已实现。
- 相册：瀑布流 + 灯箱，原图不发布（originalUrl 指向用户网盘）；加照片流程见 `GALLERY_ADDING_PHOTOS.md`。

## 五、Typography

- 标题/正文长文用衬线，UI 控件用无衬线。
- **中文衬线现为自托管 GenWanMin2 TC 子集**（`--font-serif-zh` 首位；管线见 ARCHITECTURE）。
  ⚠️ 旧决策的 Noto Serif SC/JP 方向已被取代；日文片段靠字体栈兜底渲染。

## 六、Travel 模块细粒度定案（节选，全量见 `.workbuddy/memory/MEMORY.md`）

- 新增 trip 必须走 GPS 清洗管线（隐私红线，见 ARCHITECTURE §数据管线）。
- 返回条带、图例、tile hover、胶囊吸顶、幕布动画等交互均已逐项定稿（v7–v14.1）；动这些区域前**必读 MEMORY.md 对应条目**，避免推翻已拍板细节。
- trip 正文双语混合原始数据，不做 i18n。

## 七、仍未决（用户决定）

- 自定义域名（v1ncent19.space 候选）；真实访问者基线数值；博文可选缩略图；Notes 是否升顶级路由。
