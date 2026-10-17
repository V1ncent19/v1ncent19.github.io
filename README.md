# v1ncent19.github.io

`Tuorui "v1ncent19" Peng` 的个人站。Next.js App Router + 静态导出（`output: "export"` → `out/`），
部署到 GitHub Pages（`v1ncent19.github.io`，`public/CNAME`）。

## 结构

```text
app/           路由（每个子目录 = 一个路由段，中文镜像在 /zh）
components/    按页面归属的组件（about / blog / cv / gallery / travel / layout / background …）
content/       所有可读文本与数据（一个子目录对应一个路由段；site/ 放站点级配置）
public/        需要 URL 的东西：图片、字体、PDF、被 fetch 的 JSON
assets-src/    原始素材（git-ignored，绝不进 public/）
scripts/       构建期与内容管线脚本
structure_file/ 工程文档（入口见 structure_file/README.md）
```

## 命令

```bash
npm install
npm run dev       # 本地开发
npm run build     # 静态导出到 out/（prebuild 自动跑 badges → sync:data → check:refs → check:i18n）
```

`next dev` 在某些环境下会不稳定；验收一律用 `cd out && python -m http.server` + 浏览器。
构建被安全 shim 阻断时用 `NODE_OPTIONS= npm run build`。

## 文档

**先读 [`structure_file/README.md`](structure_file/README.md)**（工程文档索引），
再看 [`handover.md`](structure_file/handover.md)（进度与入口）、
[`ARCHITECTURE.md`](structure_file/ARCHITECTURE.md)（系统现状）、
[`CONVENTIONS.md`](structure_file/CONVENTIONS.md)（守则与设计基线）。

## 技术栈

- Next.js 16 App Router + React 19 + TypeScript（strict）
- 静态导出（`output: "export"`），产物在 `out/`
- Tailwind CSS v4 + CSS 变量 tokens
- MapLibre GL（旅行志地图）、D3（地球仪）、giscus（评论）
