# FEATURE — Guatemala 三维地形旅行日志

2026-10-28。适用 `/travel/guatemala-2026/` 与 `/travel/zh/guatemala-2026/`。
本篇是旅行日志公共框架中的第三种内容类型 `kind: "terrain"`；正文目前为中文，路由语言只控制公共按钮、提示与 metadata。

## 页面组成

```
app/travel/{,zh/}guatemala-2026/page.tsx
  → lib/travel/log/definitions/guatemala-2026.ts
  → components/travel/log/TravelLogPage.tsx
  → components/travel/TerrainTravelLog.tsx
      ├─ TerrainMap.tsx       MapLibre 三维地形、路线、照片与镜头
      ├─ TerrainStory.tsx     中文正文与照片流
      └─ TravelLogShell       公共章节导航、工具栏、返回与分隔布局
```

内容入口是 `content/travel/guatemala-2026/`：

- `card.json`：Travel / Blog 卡片；
- `story.json`：唯一应手工维护的标题、段落、分段时间、照片编排与相机关键帧；
- `data.json`：`guatemala:build` 根据私有 GPS、照片 EXIF 与 `story.json` 生成的页面数据。当前为 906 个路线点、9 个场景、25 张发布照片加 1 张 Starbucks 占位图。

`lib/travel/terrain.ts` 定义路线、照片、场景、地点与相机数据形状；`lib/travel/log/validate.ts` 在构建期验证数据。不要把 Guatemala 的字段塞进 journal 或 pilgrimage 的可选字段。

## 交互与视觉不变量

- 地图默认跟随正文；用户手动拖动、缩放或旋转后进入 manual，并浮出 `Resume story` 恢复按钮。
- 章节标题与进度导航使用 PTES 的动态标题、吸顶和跳转几何；章节跳转后仍必须恢复滚动驱动的地图。
- 相机按场景关键帧移动。山上以偏东侧向西、较低俯角展示高差；Fuego 往返、下山和完成总览保持连贯的东北—西南 / 东西向构图。具体数值以 `story.json` 与 `TerrainMap.tsx` 为准。
- 首尾总览可自动环绕；手动操作立即停止环绕。山峰标签面向屏幕，不应随三维地面倾斜或在环绕时抖动。
- 地图默认是素色三维地形与平滑的 100 m 等高线；可切换卫星模式。工具栏只显示图标，文字在 hover / focus tooltip 中出现。
- 路线使用全站旅行日志的蓝色；照片标点与照片框连接虚线使用橙色。照片框应靠近对应点、避开主要路线；连接线必须从真实地理点连到框边缘。
- `Trail start` 与 `Camp` 在总览中只显示图标，路线进行到附近时才浮出标签。
- 完整路线从 Antigua 到 trail start、登山、Fuego 往返、下山，再回到 Antigua；完成页不得在山脚提前结束。

## 私有输入与可提交输出

两类母版都在 `.gitignore` 中，**不能提交、不能放进 `public/`**：

```
assets-src/travel-data/2026.01.01-2026.12.31.csv  全年 GPS，含不应公开的位置
assets-src/guatemala-masters/*.jpg                手机原图，含 EXIF GPS 与时间
```

另一台设备仅继续编辑正文、镜头和界面时，不需要这些母版：本分支提交了已经裁切、简化的路线和去元数据派生图。只有重新选照片或重建路线时，才需通过私密渠道把母版复制到相同的忽略目录。

可提交、也是页面运行所需的派生输出：

```
content/travel/guatemala-2026/data.json
public/assets/photos/travel/guatemala-2026/*.webp
public/assets/terrain/guatemala/                   Terrarium DEM，z8–z14
public/assets/terrain/guatemala-tint/              素色贴图
public/assets/terrain/guatemala-contours.geojson   平滑 100 m 等高线
```

发布照片由 Sharp 重新编码成最长边 2200px、quality 84 的 WebP；生成器会拒绝仍含 EXIF/XMP 的输出。`data.json` 仍包含为地图展示所需的照片位置、拍摄时间与裁切后的路线，因此它是公开数据，不应混入全年 GPS。

## 生成命令

| 命令 | 输入 | 输出 / 何时运行 |
|---|---|---|
| `npm run guatemala:build` | 私有全年 GPS、照片母版、`story.json` | 重建 `data.json` 与照片 WebP；改正文后通常不必跑，改时间/照片/GPS 时才跑 |
| `npm run guatemala:terrain` | AWS Mapzen Terrarium tiles | 下载 DEM，再生成素色贴图与等高线；需要网络，日常镜头编辑不跑 |
| `npm run guatemala:contours` | 已存在的本地 DEM | 仅重建等高线 |

`guatemala:terrain` 的范围固定在危地马拉火山区域，数据源署名写入 `data.json` 与 `public/assets/terrain/guatemala/attribution.txt`。不要把它挂进 `prebuild`：干净 CI 应直接使用仓库中的派生资源，不在构建时访问外网。

## 在另一台设备继续

```bash
git fetch origin
git switch --track origin/codex/guatemala-travel-log
npm ci
npm run dev
```

主要编辑顺序：正文/章节/相机先改 `content/travel/guatemala-2026/story.json`；若只改文案和相机，可直接同步同字段到 `data.json`，或在已具备私有输入时运行 `npm run guatemala:build`。组件交互改 `TerrainMap.tsx` / `TerrainStory.tsx`，公共框架改动要同时回归 PTES 与 Anitabi。

提交前至少执行：

```bash
npx tsc --noEmit
npx eslint components/travel/TerrainMap.tsx components/travel/TerrainStory.tsx components/travel/TerrainTravelLog.tsx
npm run build
```

本篇当前开发分支不是 Pages 发布分支；只有合并或推送到 `nextjs-rebuild` 才会触发 `.github/workflows/deploy.yml`。
