@AGENTS.md

# 项目状态 — 写代码前先读

个人站，Next.js 16 静态导出（`output: "export"` → `out/`），部署 GitHub Pages，
分支 `nextjs-rebuild`。

## 先读什么

1. `structure_file/README.md` —— 文档索引（每份文档回答什么问题、改什么要同步哪份）
2. `structure_file/handover.md` —— 当前进度、提交前注意事项、验证流水线
3. `structure_file/ARCHITECTURE.md` —— 系统现状（content 布局、双语模型、路由树、脚本、数据管线）
4. `structure_file/CONVENTIONS.md` —— **Agent 守则**与已锁定的 v1 设计基线（配色、页头、§ 标题、容器宽度、Typography）
5. `.workbuddy/memory/MEMORY.md` —— 「改错了会坏」的工程坑清单

改某个具体功能前，再读它对应的深文档（目前只有 `structure_file/FEATURE_PILGRIMAGE.md`）。

## 硬约束（违反会让站点坏掉或丢数据）

- **不自动 commit / push**；多方案先用问题确认；不编造数据（用户事实、发表物、项目、日期）。
- **禁用 `git add -A` / `git add .`** —— 按路径显式 add，提交前 `git status` 核对。
- 移动端行为有显著变更的自适应组件，**先确认预期行为再实施**。
- 静态导出没有服务端：**禁止 server-only 特性**；渲染期禁止读 `localStorage` / `matchMedia`。
- `public/` 里的一切都会上网；**gitignored ≠ 私密**。GPS 原始数据只在 `assets-src/`。
- 设计基线（主色、双区块 masthead、§ 标题、`max-w-5xl`、全站 0.9 缩放）**不得擅自改**。

## 验证流水线（每轮必走）

```bash
npx tsc --noEmit
npx eslint <改动的文件>
NODE_OPTIONS= npm run build     # 绕过安全 shim
# 视觉验收：cd out && python -m http.server 4173 + Chrome 探针（见 handover.md §5）
```

prebuild 自动跑 `badges → sync:data → check:refs → check:i18n`。

## 收尾

追加 `.workbuddy/memory/<日期>.md`；定案落到 `structure_file/` 对应文档（分工见其 `README.md`）。
