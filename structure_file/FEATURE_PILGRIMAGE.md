# FEATURE — 巡礼地图（Just Because! @ 藤泽）

**状态：已完成并上线**（`○ /travel/just-because` + `○ /travel/zh/just-because`），等用户补完文案。
**最后核对：2026-10-24**（对照 `components/travel/Pilgrimage*.tsx` 与 `content/travel/just-because/page.json` 逐项核实）。

> **怎么读这份文档**
> - 只想了解现状 / 判断还差什么 → §0 + §7。
> - 要改代码 → §5 实现 + §6 不变量，**§6 全部是踩过的坑，逐条都付过代价**。
> - 要重跑数据 → §3 管线 + §4 格式。
> - 想不通「为什么当初这么定」→ 附录 A（轮次记录）。附录里的结论可能已被推翻，**以 §0 与正文为准**。

---

## 公共框架接入（2026-10-24）

公共部分以 `FEATURE_TRAVEL_LOG.md` 为准。路由通过 `lib/travel/log/definitions/just-because.ts` 加载并校验数据，再交给 `TravelLogPage`；`loadPilgrimage()` 已收拢至 `lib/travel/log/validate.ts`，不再在两个语言路由中复制。`PilgrimageLog` 继续负责 active/open/dismissed 与地图→正文请求，布局、幕布与返回由 `TravelLogShell` 负责。原 `PilgrimageRail` 已替换为公共 `ChapterNavigation`，直接消费同一 activeStopId。相机与照片正文逻辑保留独立。

## 0. 现状速览

| 项 | 值 |
|---|---|
| 页面 | `app/travel/just-because/page.tsx`、`app/travel/zh/just-because/page.tsx`，构建期 **import** `content/travel/just-because/page.json` |
| 站点 | 36 个对比点（用户手工合成，只上线对比图，无兜底动画帧） |
| 路线 | 273 点闭环环线，2.47 h / 17.68 km，`06:43:59` 鎌倉高校前駅 → `09:11:55` 回到同站 |
| 图 | `public/assets/photos/pilgrimage/just-because/compare/{id}.webp` 36 张 / 16.4 MB / q82 / 2400 px / 零 EXIF；封面 `cover.png` |
| 母版 | `assets-src/pilgrimage-masters/just-because/{IMG_xxxx}.jpg` 36 张 / 29.9 MB，**入库** |
| 位置真源 | `assets-src/travel-data/pilgrimage/photos.json`（119 张的 id ↔ 坐标 ↔ 时间，gitignored） |
| 可 fetch 数据 | `public/data/travel/just-because/{route.json, anitabi-212278.json}`，**入库**（不可再生，由 `sync-trip-data.mjs` 的 `KEEP` 名单保护） |
| 文案 | `overview.text` 已写（但 `_placeholder` 仍为 `true`）；`outro.text` 空；36 站 `note` 全空 |
| 交互 | 可缩放可拖动、跟随镜头默认开、五枚控件（`自/昼/夜` + `随` + `全`）、滚动联动、点标点跳章节、**移动端可拖拽进度条（2026-10-24）** |
| 待决 | ① 底图合规（OSM/Carto vs 腾讯/高德）；② ptes-2025 轨迹隐私（**不属本功能**，见 §7） |

---

## 1. 功能是什么

记录用户在藤泽做的《Just Because!》动漫圣地巡礼：到当地拍的实景照 ↔ 动画截图，**由用户手工合成对比图**，落在互动地图上。

- 地图标点 —— **只显示用户做了对比图的 36 个取景地**。
- 点开某个点 → 右栏滚到对应章节，同时弹出该处的对比图缩略。
- 底图是 **MapLibre GL + Carto Positron / Dark Matter**（与 ptes-2025 一致，用户拍板；本仓 `geo-map-compliance-guard` skill 偏好腾讯/高德，此处是**特例保留**，见 §7 待决）。

## 2. 核心设计决策

### 2.1 位置真源是 `photos.json`，不是图片

用户用 anitabi 线上 magiconch 工具合成对比图，**合成图会丢掉 EXIF 位置信息**（实测：36 张合成图 0 张带 GPS）。

解法：**位置独立保存在 `photos.json`**；合成图只需**按文件名关联回一个 photo id**。

```
实景原图 (带 EXIF GPS)  ──extract──▶  photos.json  ◀──真源：id ↔ 坐标 ↔ 时间
        │                                   ▲ 按文件名反查
        │ (用户手工在 magiconch 合成)         │
        ▼                                   │
   IMG_2746.jpg  ──derive──▶  compare/img-2746.webp   ← 站点唯一显示的图
```

**命名规则（实际采用的）**：用户合成图沿用**原始手机文件名** `IMG_2746.jpg`。反查时 `stemToId()` 做映射：

```
IMG_2746.jpg  →  小写 + 下划线换连字符  →  img-2746  →  photos.json 查坐标
```

**36/36 全部反查成功**（2026-10-16 验证）。

### 2.2 最终上线形态：只有 `compare/`

| 角色 | 位置 | git | 说明 |
|---|---|---|---|
| **母版：对比图 jpg** | `assets-src/pilgrimage-masters/just-because/{IMG_xxxx}.jpg` | **入库** | 36 张手工合成原稿（29.9 MB）。2026-10-17 从 `assets-src/photos/` 迁出并入库：实测 0/36 带 EXIF，无隐私，此前被「原图」的忽略规则误伤 |
| **上线：对比图 webp** | `public/assets/photos/pilgrimage/just-because/compare/{id}.webp` | 入库 | 2400 px / q82，36 张 / 16.4 MB，零 EXIF |
| **快照：巡礼点数据** | `public/data/travel/just-because/anitabi-212278.json` | 入库 | 154 个点，供反查坐标/名称/集数 |
| **真源：位置表** | `assets-src/travel-data/pilgrimage/photos.json` | gitignored | 119 张照片的 id ↔ 坐标 ↔ 时间 |

**已删除（2026-10-16，回收 ~1.4 GB）**：`assets-src/photos/just-because/original/`（119 张 / 701 MB，用户他处有备份）、`public/assets/pilgrimage/just-because/{shot,thumb,anime}/`、`assets-src/travel-data/anitabi-cache/`（19 MB）、`pilgrimage-review.csv`。

**为什么 re-encode 而不是 copy**：`public/` 会被静态导出原样复制，进去即公开且永久。sharp 重编码**天然剥离 EXIF**（用户直接合成时元数据已丢，所以主要作用是压体积 + 双保险）。

**隐私实测**：36 张 jpg 母版用 exifr 查 → 0 带 EXIF/GPS；36 张 webp 用 sharp 查 → 0 带 EXIF/ICC/XMP。字节级扫到 2 处 `GPS` 字面命中，是 VP8 熵编码里的巧合字节（无 EXIF chunk），**不是真元数据**。

**⚠️ `public/assets/photos/` 不是垃圾目录** —— `jokes/`、`nihongo/`、`cuisine/`、`gallery/` 都在用。只有 `**/original/` 子路径被 gitignore。动这个目录前必须区分。

---

## 3. 数据管线（六步）

| # | 脚本 / 动作 | 输入 | 输出 |
|---|---|---|---|
| 1 | `npm run pilgrimage:photos`<br>`scripts/pilgrimage-photos.mjs` | 实景原图目录（`--dir`） | `photos.json`（**任何合成之前**跑） |
| 2 | `npm run anitabi:snapshot`<br>`scripts/anitabi-points.mjs` | anitabi 静态分片 | `anitabi-212278.json`（一次性快照，之后不常跑） |
| 3 | `scripts/pilgrimage-route.mjs` | `assets-src/travel-data/gps/2026.01.01-2026.12.31.csv` | `public/data/travel/just-because/route.json` |
| 4 | **人工**：在 anitabi 网站 magiconch 合成对比图，文件名保持 `IMG_xxxx.jpg` | 实景照 + 动画帧 | `assets-src/pilgrimage-masters/just-because/` |
| 5 | `npm run pilgrimage:derive`<br>`scripts/pilgrimage-derive.mjs` | 母版 jpg | `compare/{id}.webp` + `cover.png` |
| 6 | `scripts/pilgrimage-map.mjs` | `compare/*.webp` + `photos.json` + `route.json` + `anitabi-212278.json` | `content/travel/just-because/page.json` |

全部脚本幂等、可增量、支持 `--limit` 冒烟。

### 3.1 `pilgrimage-photos.mjs`（步骤 1）

**核心用途：产出 `photos.json`（位置唯一真源）。** 在**任何合成之前**跑。

```bash
npm run pilgrimage:photos -- --dir assets-src/photos/just-because/original
```

每张 `{ id, file, shotAt, shotAtLocal, tzOffset, lat, lon, camera }`，按时间排序。`shotAt` 是**带时区的完整 ISO-8601**（如 `2026-09-21T06:50:39+09:00`），下游排序不用猜时区。

> 不再需要 `--points`（那会额外生成 `pilgrimage-review.csv` 距离建议）。用户自行挑图。

### 3.2 `anitabi-points.mjs`（步骤 2） — `npm run anitabi:snapshot`

```bash
npm run anitabi:snapshot -- --bangumi 212278
```

**为什么快照而非运行时抓取**：数据源是静态分片 JSON，快照后提交 → 对 anitabi 改结构免疫，也不占别人带宽。

**🚫 `api.anitabi.cn` 是死路** —— 官方文档指向它，但 Cloudflare WAF 拒绝一切非浏览器客户端。2026-10-15 实测：curl / Node fetch / 真实 headless Chrome 全部 403，UA 伪装、Referer、Origin、HTTP/1.1 都无效。**别再试。**

**✅ 可用通道**：`https://www.anitabi.cn/d/g.json` + `g0..g6.json`（`?d=<token>` 是缓存击穿参数，当前 `qo8w`）。

- `g.json[0]` = 全部作品数组。每作品：`[0]` bangumiId、`[2]` 标题(ja)、`[3]` 标题(zh)、`[4]` 城市、`[5]` 色、`[6]` 封面、`[7]` 评分、`[8]` 类型、`[9]/[10]` 中心 lat/lng、`[11]` zoom、**`[12]` 打包坐标**（`[pointId, lat, lng, ord]` 平铺，每 4 个一组）、`[16]` 图标、`[17]` 短代码。
- `g0..g6.json` = 点详情，**7 个分片切分不稳定 → 必须逐个搜**。每点：`[0]` pointId、`[1]` name(ja)、`[2]` name(zh)、`[4]` Google My Maps doc id、`[6]` 截图路径、`[8]` 集数（null = 主视觉）、`[9]` 集内秒、`[10]` 集标签。
- **坐标只在 `g.json`，名字/截图只在 `g*.json`**，靠 pointId 关联。

**⚠️ 图片 CDN 的坑**：数据集里是 `/images/points/…`，真实 CDN 是 **`img-tc.anitabi.cn` 且要丢掉 `/images` 前缀**：

```
数据集 /images/points/<id>/<pointId>.jpg
  → https://img-tc.anitabi.cn/points/<id>/<pointId>.jpg
```

**裸路径 `https://www.anitabi.cn/images/…` 是假的** —— 该主机会用 SPA shell（HTTP 200 + text/html）应答任何未知路径，naive 拼接会得到「看起来 200 实际是死链」的 URL（曾产生 154 条）。`abs()` 里的映射就是防这个。

### 3.3 `pilgrimage-route.mjs`（步骤 3）

从**全年手机 GPS 导出**里裁出巡礼当天那 2.5 h。三个硬约束写死在脚本里：

- **紧包围盒** `{latMin:35.29, latMax:35.35, lonMin:139.47, lonMax:139.54}`。
- **时间窗** `2026-09-21T06:40`–`09:15` JST。落地：`06:43:59` 起（鎌倉高校前駅，`35.30722,139.49995`）→ `09:11:55` 止（`35.30753,139.49925`，**闭环**）。
- **只留 `t,lat,lon`** —— `accuracy` / `speed` / `heading` / `altitude` / `stepType` 全丢；时间戳降级成相对 `offsets`。**这是隐私契约，改脚本时不要放宽。**

CSV 里 `dataTime` 是 **UTC epoch 秒**，JST = 手动 `-09:00` 偏移。

### 3.4 `pilgrimage-derive.mjs`（步骤 5） — `npm run pilgrimage:derive`

```bash
npm run pilgrimage:derive              # 增量
npm run pilgrimage:derive -- --force   # 全量重建
npm run pilgrimage:derive -- --limit 5 # 冒烟
```

- 只派生 `compare/`（2400 px / q82）。`render()` = `sharp(src).autoOrient().resize(box(long)).webp({quality})`。
- 增量按 master mtime（`stale()`）；`compare/` 里名字不在 `photos.json` id 集的算孤儿 → 告警 + 跳过。
- **内置隐私断言**：抽样检查产出档，只要 `meta.exif || meta.icc || meta.xmp` → **`process.exit(1)`**。

### 3.5 `pilgrimage-map.mjs`（步骤 6）

组页面数据。为每站预算 `routeIdx`（**按时间锚定**，见 §5.3）与真实图片尺寸 `imgW`/`imgH`（sharp 读，见 §6）。

- **`page.json` 是半手工文件**：生成器产出，但 `overview` / `outro` / 各站 `note` 手写且**跨次 preserving**。改文案只需 `npm run build`，**不要重跑生成脚本**。
- 每个站会报告两个几乎等距的 anitabi 候选点（`_runnerUpM`），当前取最近的那个；9 处歧义待人工复查（§7）。
- `main()` 是 **async**（因为要 await sharp 读尺寸）。

### 3.6 `anitabi-images.mjs`（不属管线） — ⚠️ 已退出管线

~~拉 154 张动画截图做兜底显示~~。用户明确不需要兜底，合成时直接在 anitabi 网站取原图。**脚本留着无害**（完整记录了图片 CDN 规则），但**不再是管线的必需一环**。

- 若将来要用：不带 `?plan=` 即原图（~512 px 高）；`plan` **只接受 `h160`/`h360`**，`h720`/`h1080`/`w640`/`raw` 全 404。
- 内含图片 magic 校验（JPEG `FFD8` / PNG `8950`），防 CDN 回 block 页。
- 参数：`--points`、`--out`、`--cache`、`--quality`(82)、`--concurrency`(4)、`--plan`、`--limit`、`--force`。

---

## 4. 数据格式

### 4.1 `content/travel/just-because/page.json`（页面唯一数据源，构建期 import）

顶层：`_note` · `_generator` · `generatedAt` · `title` · `subtitle` · `overview` · `outro` · `attribution` · `route` · `stops`（36）。

每站字段：

```jsonc
{
  "id": "img-2748",          // photoId，同时是 compare/ 的文件名
  "src": "/assets/photos/pilgrimage/just-because/compare/img-2748.webp",
  "imgW": 1748, "imgH": 2160, // 真实尺寸（sharp 读），CSS 靠它算 aspect-ratio
  "lat": 35.33, "lon": 139.51,
  "time": "06:52",           // 照片拍摄时刻（JST）
  "shotAt": "2026-09-21T06:52:11+09:00",
  "routeIdx": 42,            // 轨迹下标（按时间锚定，见 §5.3）
  "routeDtSec": 3,           // 与轨迹点的秒差
  "anitabi": { "id": "…", "name": "…", "ep": 1, "distM": 19, "url": "…" },
  "_runnerUpM": 20,          // 次近候选的距离，用于人工判断歧义
  "note": { "_placeholder": true, "text": "" }
}
```

`overview` / `outro` 同形状：`{ _placeholder, title, text }`。`interludes[]` 可选（章节之间的插页）。

**读法**：`lib/travel/log/validate.ts` 的 `loadPilgrimage()` 做显式形状校验 —— JSON import 推断出的是 `number[][]` 而非 `[number,number][]`，**不能硬 cast**；另外校验 `routeIdx` 存在。

### 4.2 `public/data/travel/just-because/anitabi-212278.json`（快照，入库）

154 个点。顶层含署名与来源信息：

```jsonc
{
  "_source": "…CC BY-NC-SA 4.0: credit anitabi and link `sourceURL`…",
  "_generator": "scripts/anitabi-points.mjs",
  "fetchedAt": "2026-10-15T06:27:23.605Z",
  "datasetVersion": 1792015233739,
  "bangumiId": 212278, "title": "Just Because!", "city": "镰仓市",
  "center": [35.336884, 139.508788], "zoom": 11.9,
  "sourceURL": "https://anitabi.cn/map?bangumiId=212278",
  "detailShard": "g2.json",
  "pointsLength": 154, "pointCount": 154, "withImage": 154,
  "points": [
    {
      "id": "3aa8ngc7", "name": "湘南深沢駅ホーム", "nameCn": "",
      "ep": null, "s": 3560, "epLabel": "メインビジュアル,1話 ",
      "lat": 35.33298, "lon": 139.518989,
      "image": "https://img-tc.anitabi.cn/points/212278/3aa8ngc7.jpg",
      "mapsMid": "1aL7PTUG34bise1f87AZDensHuEfTLHDP"
    }
  ]
}
```

### 4.3 `assets-src/travel-data/pilgrimage/photos.json`（位置真源，gitignored）

```jsonc
{
  "_note": "Position/time truth… keep under assets-src/ …",
  "generatedAt": "2026-10-15T06:28:40.186Z",
  "dir": "assets-src/photos/just-because/original",
  "count": 119, "withGps": 119,
  "photos": [
    { "id": "img-2744", "file": "assets-src/photos/just-because/original/IMG_2744.jpg",
      "shotAt": "2026-09-21T06:50:39+09:00", "shotAtLocal": "2026-09-21T06:50:39",
      "tzOffset": "+09:00", "lat": 35.30669, "lon": 139.50073,
      "camera": "Apple iPhone 17 Pro" }
  ]
}
```

### 4.4 `public/data/travel/just-because/route.json`（入库）

`{ startedAtLocal, endedAtLocal, coordinates: [lat,lon][], offsets: number[], distanceKm }`。`offsets` 是相对起点的秒数，**`routeIdx` 的下标域**。

---

## 5. 前端实现（`components/travel/`）

| 文件 | 职责 |
|---|---|
| `PilgrimageLog.tsx` | 外壳。把 `active` / `open` / `dismissed` 三个状态**合并成一个 `view` 对象**（三者不可能互相矛盾）。`MutationObserver` 监听 `<html class>` 做主题跟随。接受 `backHref` / `backLabel`，EN 与 zh 各指各的 hub |
| `PilgrimageMap.tsx` | MapLibre 地图 + 相机 + 亮线/光标 + 时间牌 + 控件 + 弹窗 |
| `PilgrimageStory.tsx` | 右栏。概述 + 可选 `interludes` + 36 站 + 完结撒花。`containerRef` + `[data-pj-stop]` + IntersectionObserver（`rootMargin: "-35% 0px -35% 0px"`） |

页面挂 `pj-immersive` + `tl-immersive` 两个 body 类（`--tl-*` 令牌的作用域）。**类必须在水合前就位**（页面里有 parse-time 内联脚本），所以 `<html>` / `<body>` 都开了 `suppressHydrationWarning`。

### 5.1 相机：显式三态

```ts
type CameraMode = "follow" | "overview" | "manual";
```

- **默认 `follow`**（`FOLLOW_KEY = "pilgrimage-camera-mode"` 存 localStorage，只有显式存 `"0"` 才算关）。
- 跟随 = `fitBounds` 到当前站再 **`FOLLOW_ZOOM_DELTA_NARROW = 2.5`**（< 560 px）/ **`FOLLOW_ZOOM_DELTA_WIDE = 2`**，`FOLLOW_MAX_ZOOM = 19` 兜超大视口，`followZoom()` 是函数不是常量（拟合 zoom 随视口变）。
- **手势一律永久落 `manual`**。只监听 `dragstart` / `wheel` / `touchstart` —— **不能监听 `zoomstart`**，`easeTo` 自己也触发它，跟随即刻自我暂停。
- 『全』键 = `reframeOverview()` → `overview`。五个药丸在 390 px 下：牌子 11–161、药丸 209–379。
- `cooperativeGestures: true` 是必须的：桌面地图列 100 vh，若滚轮直接缩放，读者想滚页面时指针碰巧在图上就变成缩放。开启后滚轮需 ⌘/Ctrl、触屏需双指。
- `minZoom = MIN_ZOOM(10)`，`maxZoom = FOLLOW_MAX_ZOOM + 1`，`touchZoomRotate.disableRotation()`（双指扭转在这张图上就是误操作）。
- **ResizeObserver 只 resize 画布**（`cameraOwnedRef`），不再 re-fit 相机 —— 手机地址栏收放会持续触发，读者一旦缩放就会被反复拽回全貌。

> **为什么不能停留在「固定比例全貌」**：390 px 宽的地图上，`img-2846` 与 `img-2848` 相距 **1.2 px**（桌面也是 1.2 px），画在同一个像素上。`queryRenderedFeatures` 两个都能命中，取最近者在 1 px 精度下是随机的。**这不是 handler 能修的 bug，是这个尺度下信息本身不存在** —— 所以相机必须能放大，见附录 A 第五轮。

### 5.2 亮线：双向、跟随光标

- 图层：`pj-route-full`（暗底，整条环线）+ `pj-route-head`（亮头，已读部分）+ `pj-cursor`（halo + 实心定位点）。
- **亮头是双向的**：head 直接跟当前站，往回滚就退回去。蓝线含义是「**我已滚过的照片**」，不是「我曾到过哪里」。
- `paintCursor()` **同时**写 `pj-cursor` 与 `pj-route-head`，都用 `cursorFracRef.current`（分数下标）。早先两者分开更新 → 线瞬变、点要 ease 420 ms，肉眼可见脱节。
- `slideCursorTo()` 在 `CURSOR_MS = 420` 内做 ease-out-cubic 位移，**在弧长域插值**（`projectRoute` 的 `s`），不是下标域。中途换目标从**当前分数位置**续跑，快速滚动不回弹。中途帧也同步 `headIdxRef`，切主题重建图层时不会错位。

### 5.3 `routeIdx` 必须按时间锚定

`stopFrac()` 三级回退：

1. **停车**（GPS 表观 < 6 km/h，实测只有这两极化分布）→ 用 fix 的投影；
2. **行驶** → 用时钟（照片 `shotAt` 相对起点秒数 → 最近 `route.offsets` 下标）；
3. 都 clamp 到时钟 **±3 个顶点**（`SNAP_WINDOW`，防绕环线第二次经过同坐标），并逐站单调（`lastFracRef`）。

**不要**把全部站点投影吸附到线上：藤沢站 7 张、08:32–33 有 7 张，点间距 9–17 m 而采样 61 m，整段吸附会让连拍坍缩成一点 → 光标卡住再瞬移。

**必须按时间、不能按最近坐标**：环线两次经过藤沢駅，按空间最近得到的下标序列是 `89→84→85→79→113→…→199→155→207`（中途倒退），亮线会可见回缩。按时间锚定实测 **0 处倒退**、中位残差 11 s，且把藤沢駅那 7 张拆成 7 个不同下标。生成器另有「倒退就 clamp + warn」兜底。

### 5.4 章节 = 概述 / 36 站 / 完结，sentinel 参与评分

`CHAPTER_START` / `CHAPTER_END` 定义在 `lib/travel/pilgrimage.ts`，story 与 map 共用。map 侧三分支：

| 章节 | 亮线 |
|---|---|
| `CHAPTER_START` | `frac 0`（蓝线收缩成起点一点） |
| 中途某站 | 该站 `routeIdx` |
| `CHAPTER_END` | `frac = coordinates.length - 1`（整圈闭环全蓝） |
| null | 不动 |

顺序语义仍是双向的：滚回封面，线同步收回。时间牌对这两章读真实的 `route.startedAtLocal` / `endedAtLocal`。

### 5.5 时间牌 / 弹窗 / 返回键 / 阅读顺序

- **时间牌** `.pj-time-plate`：`NN / 36 · 点名` + `HH:MM`。移动端宽度预算：390 px 上 `14 + plate + 12 + 172(五枚控件) + 14 = 390`，故 plate 取 `calc(100vw - 214px)`（max 13rem），高度钉 55 px。早先 `calc(100vw - 16.5rem)` 只有 126 px，开场两行文案全被省略号切掉。
- **弹窗** `.pj-popup` = **80×100 纯缩略图**（用户要求「面积降到 1/10」）：只剩图 + 16 px 关闭钮，**没有文字** —— 站名在时间牌、全文与大图在右栏、`note` 也在右栏。`background: color-mix(... 62%, transparent)` + `backdrop-filter: blur(16px) saturate(1.5)`，深色另给一档。`POPUP_W = 80` / `POPUP_H = 104` 必须与 globals.css 的 `.pj-popup{width}` 同步；移动端**不要**再写满宽覆盖。定位要做**上下翻转**（`PW = min(POPUP_W=80, w-16)`、`PH = POPUP_H`），否则上半区点被顶出屏幕。
  - **`z-index: 3`，低地图 HUD 一档（2026-10-24 修）**。此前是 `5`，而 `.pj-map-overlay-top`（时间牌）与 `.pj-map-tools`（`自/昼/夜` + `随/全`）都是 `4` → 标点靠近角落时，80 px 的缩略图**直接盖住时间牌和控件**（用户报「会把地区图左上角的位置卡片，以及右上角的按钮都挡住」）。改为 `3` 后弹窗仍在 MapLibre canvas 之上，HUD 压住它。
  - **为什么是缩略图让位**：时间牌是「我现在看的是哪一站」的唯一指示，两颗胶囊是镜头模式失控时唯一的退路；弹窗只是「这张图从哪儿来」的旁证。让 HUD 盖住图比让图盖住 HUD 代价小。**不要**为了「不遮挡」去改 `place()` 的夹取逻辑 —— 弹窗本来就被夹在贴图内（`x ∈ [8, w-PW-8]`），角落附近必然与 HUD 相交，这是几何注定的，只能靠层序解决。
  - 验收方式：往 `.pj-map-col` 注入一个同 class 的 `<figure class="pj-popup">`，摆到与时间牌 / 工具栏相交处，`elementsFromPoint` 栈顶必须**不是** `pj-popup`。
- **返回键** `.pj-back`：桌面 48 px 全高竖条（hover 58 px + 箭头淡出/竖排文字淡入）；宽度、颜色、透明度与位移统一为 220 ms、同一缓动、无延迟。箭头和文字固定锚定在右缘内 24 px，各自仅有 4 px 的轻微位移，避免侧条变宽额外带动内容；移出时文字与箭头同步切换。PTES `.tl-back-strip` 使用相同桌面节奏与锚点。移动端**右上角** `top:58px; right:14px; 42×42`，位置与尺寸仍与 ptes 一致。放左下会压在本页自己的底部进度条（`.pjr-bar`，fixed/z-30）上，两个蓝色元素叠成一团。
- **每站阅读顺序 = 章节名 → `note` → 图**（`pj-stop-head > pj-stop-note > pj-stop-card`）。

### 5.6 hub tile

`content/travel/just-because/card.json` 用 `cardMeta` / `cardCta` / `cardFacts` 覆盖默认的「N 天 · N 轨迹点」文案（那是描述多日行程的），显示「1 morning · 17.6 km · 36 composites」+「Anime pilgrimage map」+「Ride the route」。封面 `cover.png`（`coverPos` 控制裁切）。

---

## 6. 实现不变量（改之前逐条读）

1. **`.pj-map` 必须包在独立的 `.pj-map-box` 里。** `maplibre-gl.css` 自带 `.maplibregl-map { position: relative }`，与 `.pj-map { position: absolute }` 同优先级但**后加载** → canvas 塌成 574×300 的空白条。
2. **切底图后重加图层只能监听 `style.load`，绝不能用 `styledata`。** `styledata` 在换样式过程中多次触发，最早一次可能在**旧样式** `isStyleLoaded()` 仍为 true 时到达 → `addLayers` 撞上未拆净的旧 source 抛错，而监听器已 `off`，**路线永久消失**（实测切深色后地图全空）。另在 `addLayers` 开头加 `getSource` / `getLayer` 幂等守卫。
3. **mount-only effect 里禁止闭包引用会变的 props**（`openStopId`、回调）。地图只建一次，闭包把它冻结在挂载值。用 ref 镜像最新值。
4. **IntersectionObserver 回调里不要用 `entries`**（陈旧），现场 `getBoundingClientRect()` 重算。**阅读带按故事列可见区（`readPanel()`）度量，不是视口** —— 移动端 `.pj-map-col` 是 `position: sticky` 且仍占流空间，故事列从 y=490 才开始，直接用 `top = Math.max(0, r.top)` 会让带顶落进地图内部。要取「视口 ∩ 故事列」再扣掉 sticky 地图底边（`mapBottom` 仅在 `0 < mb < vh − 120` 时视为遮挡）。实测修前 `panel=[0,844] band=[295,549]`，修后 `panel=[490,844] band=[614,720]`。
5. **点标点跳章节：落定判定不能用「元素进视口」**。平滑滚动第二帧目标已经从下方探进来，`finish()` 会立刻跑、`recompute()` 在飞行途中重算 → 永远差一站。改成**连续两帧 `scrollY` 不变**（`stable >= 2`）才算落定；`scrollend` 监听器要有 `moved` 闸门（点当前站时页面不动，`{ once: true }` 会挂到下一次无关滚动）；落定后允许一次落点校正（`|got − want| > 24 px` 且未被页底 clamp 时 `scrollTo`）。
6. **不要缓存 DOM 节点的 ref Map**：`ref={register(id)}` 每次渲染返回新函数 → detach/attach → 缓存失效。从 `containerRef` 现场 `querySelectorAll`。
7. **React 19 lint 两禁**：`react-hooks/set-state-in-effect`（effect 体禁同步 `setState` → `useState(() => ...)` 惰性初始化）/ `react-hooks/refs`（渲染期禁读 ref → 改 DOM 查询）。
8. **⚠️ 合成图不是同一个形状，绝不能写死一个 `aspect-ratio`**：36 张里 34 张是 1920×2160，`img-2748` 是 1748×2160，`img-2853`（正片海报复刻）是 1121×2160。曾硬写 `1748/2160` + `object-fit: cover` → `img-2853` 上下各被切一块（用户报「显示不全」），其余 34 张也一直被轻微裁切。现在尺寸**作为数据**：`imgW`/`imgH` → `<figure style={{aspectRatio}}>` + `<img width height>`，CSS 用 `object-fit: contain`。
9. **`--tl-*` 令牌定义在 `app/globals.css`，作用域 `body.tl-immersive`**。曾在 `TravelLog.tsx` 的 `<style jsx global>` 里、靠 JS 注入 —— 而巡礼页只挂类、不渲染 TravelLog，导致该页每个 `var(--tl-…)` 都解析为空（时间牌 background 算成 transparent）。**不要再在组件里重复声明这套令牌。**
10. **贴底浮层必须避让署名条**：`.pj-attrib` / `.map-attrib` 发布 `--tl-attrib-h`（桌面 26 px，≤640 px 时 42 px，因为 ptes 两段文字在 390 px 下折行）。新浮层写 `bottom: calc(var(--tl-attrib-h, 26px) + Npx)`，别写死 `14px`。
11. **口语化语言由路由前缀决定**（`/travel/…` vs `/travel/zh/…`），不是运行时状态。`backLabel` 这类文案**不设默认值**，必须由各 `page.tsx` 显式传入 —— 「返回按钮有时英文有时中文」就是默认值 `"返回页面"` 在英文页也生效。
12. **署名条里的 `·` 在 `textContent` 里没空格是正常的**：flex `gap: 0.45rem` 是布局不是文本节点。别加 `::after { content: "\00a0" }`，间距会翻倍。
13. **进度条刻度看着「被裁切」是错觉**：移动端 `.pjr-bar` 30 px / `.pjr-track` 4 px，刻度 12×12 居中（实测 820–832 vs 视口 844，`clippedByViewport: 0`）。底部渐变淡出是设计意图。
14. **sentinel 两个易错点**：① finale 曾写 `data-pj-stop=""`，被 `.filter(el => el.dataset.pjStop)` 当**假值**丢掉 → **从未参与评分**；② `progress` 不能用 `stopIndex.get(id) ?? 0` 算 sentinel，会把封面报成 `1/n`（等于回到第一站）。
15. **点标点要走两条通道**：`onNavigateToStop`（右栏滚动）与 `onOpenStop`（弹窗）必须分开，否则「滚到该站 → observer 报告 active → handleActive 重算 open」会和刚打开的弹窗打架。滚动定位要减掉 `mapH`（移动端 sticky 地图高度），否则目标站落在图后面。`handleActive` 里用 `lastFollowedRef` 去重，避免每次 observer 回调都重设镜头。
16. **主题必须走 `useSyncExternalStore`，不能 `useState(() => readTheme())`** —— 静态导出的 HTML 在 Node 里预渲染，惰性初始化会让首帧与服务端不一致，而 React **不修补属性不匹配**（不是闪一下，是永久错误状态）。`自/昼/夜` 复用 `lib/theme` 的 `applyTheme`，与站点头像**共用同一个 storage key**。
17. **地图浮层的层序是 `canvas < 弹窗(3) < HUD(4)`，三者不可互换**。`.pj-map-box` 只写 `position: absolute` 而**不写 z-index**（见第 1 条），所以它不生成层叠上下文 —— 弹窗、时间牌、工具栏在同一个上下文里按数字比较，改一个数字立刻生效。**一旦给 `.pj-map-box` 加上 `z-index`，这三者会被一起锁进新上下文**，届时弹窗与 HUD 的先后只由 DOM 顺序决定、数字失效，调 `z-index` 会变成无效操作。需要新浮层时：内容类（缩略图、提示、气泡）不超过 3，HUD 类（常驻控件）用 4 起。
18. **`.pj-map-col` 里定位的任何浮层，`left`/`top` 都是相对整列的 CSS 像素**，而弹窗的 `x`/`y` 来自 `m.project()` 的 canvas 坐标 —— 两者在桌面是同一个原点（`.pj-map-box` 铺满列、`inset: 0`），**移动端不是**（`.pj-map-col` 是 sticky，且署名条占掉底部 `--tl-attrib-h`）。改布局时先确认 `.pj-map-box` 仍然覆盖了浮层坐标系的全部范围。

---

## 7. 待办与待决

1. **文案（不是代码活）** —— `page.json` 里 `outro.text` 空、36 站 `note` 全空、`overview.text` 已写但 `_placeholder` 仍为 `true`（可清掉标记）。改完**只需 `npm run build`**。
2. **复查 9 处歧义标点** —— 每站有两个几乎等距的 anitabi 点（例：`img-2748` 藤沢駅南口バス停 19 m vs runner-up 20 m），当前取最近。`_runnerUpM` 已写进 `page.json` 供人工核对。
3. **⚠️ 待决 A —— 底图合规** —— `geo-map-compliance-guard` 要求腾讯/高德/百度/天地图，本页与 ptes-2025 都在用 Carto Positron/Dark Matter。**必须用户拍板**，未擅改基线。
4. **⚠️ 待决 B —— ptes-2025 隐私泄漏（不属本功能，但发现了要说）** —— `content/travel/ptes-2025/track.json` 含 **1217 个北美点位**（从 `2025-12-15T12:40:55-05:00` 起，lat 42.04 / lon −87.72，Evanston/Northwestern，住址级），`diagnostics.json` 还含原始 `dataTime` / `stepType`。`scripts/sanitize-trip-gps.py`（`--radius-m` 默认 3000）显然没跑在这份数据上。**注意它把轨迹首点当 home anchor，对藤泽这种环线会误裁。**
5. **中文子集字体** —— 36 个日文点名（如 `湘南深沢駅ホーム`）需确认 `scripts/subset-cjk-fonts.py` 的 `SCAN_DIRS` 覆盖 `content/travel/`，然后重跑子集。
6. **（可选）finale 措辞** —— 现在完结章读 `endedAtLocal`，若想更口语可加「完结 · 回到鎌倉高校前」。

---

## 附录 A — 轮次记录（时间序，考古用）

| 轮次 | 内容 |
|---|---|
| 2026-10-16 早 | 定案：位置真源 `photos.json`；36 张手工合成；只上线 `compare/`；删 1.4 GB 中间产物 |
| 2026-10-16 深夜 | 路线管线 + `page.json` 组装 + 三组件落地，桌面/移动端截图验收 |
| 2026-10-17 二轮 | 用户六条：① `routeIdx` 按时间锚定；② 弹窗毛玻璃；③ 点标点 → 滚动 + 弹窗；④ 时间牌 + `自/昼/夜` + `随`；⑤ 返回键（原 `display: none`，桌面根本不显示）；⑥ hub tile + zh 路由 |
| 2026-10-17 三轮 | ① 弹窗缩到 1/10（300×248 → 80×100）；② 亮线改双向（原高水位作废）。验证：第 20 站 → 第 8 站，亮蓝像素 6821 → 5209 |
| 2026-10-17 四轮 | 跟随镜头推近。用户说「放大到目前的 5 倍」，实现时先定口径（zoom 级数 / 线性像素 / 面积，彼此差 200 倍），按**级数**实现。真正的判据是底图细节：Carto 在 zoom ≤16 用泛化层，15.5 只剩空纸面，18.17 才有建筑 + 路名。当时取 `FOLLOW_ZOOM_DELTA = 5`；**现值为 2 / 2.5**（后续又调低，以代码为准） |
| 2026-10-17 五轮 | ① 亮线跟随光标（原「线瞬变、点 ease」）；② 移动端点击跳转差一站的**两个真因**（`readPanel()` 把带算进地图 / `finish()` 在滚动途中触发）；③ `img-2846` 与 `img-2848` 相距 1.2 px → 几何不可点，用户拍板**推翻固定比例**，改可缩放 + 可拖动 + 跟随默认开 + 「全」键；④ `CameraMode` 三态（旧的「布尔 + 一次性 `userMovedRef`」必然坏：跟随 effect 会消费并重置那个 ref，点「全」只 `fitBounds` 一次而 `follow` 仍为 true，下一次换站立刻抢回镜头） |
| 2026-10-17 九轮 | 概述 / 完结改成**真正的章节**（sentinel 参与 observer 评分），时间牌改读真实起止时刻 |
| 2026-10-24 十轮 | ① **移动端进度条改成普通可拖拽条**（刻度全去掉），拖动时端点浮出章节小方框 —— 与 ptes 共享 `lib/travel/use-scrub-track.ts` + `lib/travel/scrub-chapters.ts`，详见 `CONVENTIONS.md`「进度条」条；② **弹窗 `z-index` 5 → 3**，让时间牌与两枚控件压住它。两件事同批验收 |

**两个「看着像 bug 其实是数据」的结论**，别再重查：

- 弹窗在全貌下点重合簇仍会选到最近的那个 —— 1.2 px 间距的物理后果，不是回归。
- 「镜头退一半」= 减 **1 个 zoom level**（zoom +1 就是 2× 线性缩放），不是把增量除以 2。

## 附录 B — 探针 / 构建的坑（会骗人）

- **⚠️ 构建失败时 `out/` 仍是上一次成功的产物**，探针照跑不报错，测出来全是旧数据。跑探针前必须单独确认 `npm run build` 成功。
- **⚠️ styled-jsx 的 `<style jsx global>` 是模板字面量 —— 注释里绝不能出现反引号。** 在 `.map-legend` 注释里写了 ``.map-attrib``，反引号提前闭合字符串，Turbopack 报 `The left-hand side of an assignment expression must be a variable or a property access`，错误指向注释行，几乎无法从错误信息联想到原因。
- **36 张图都是 `loading="lazy"`**：在 `page.evaluate` 里逐张等 `onload` 会挂死（没进视口不发请求，实测只加载 2 张）。先 `locator.scrollIntoViewIfNeeded()` 走一遍。
- **`canvas.getImageData()` 读不到 WebGL 内容**；数像素请截整页图。`querySourceFeatures("pj-stops")` 才拿得到全部 36 点（`getSource()._data` 是空的）。
- **探针自己也会算错** —— 写验证脚本前先确认它用的公式与应用一致。
- **视图长宽比会影响布局**：巡礼页依赖视口高度，探针必须显式设 `viewport`（不设时 body 文本只有 1604 字符，看起来像「页面没渲染」，其实是布局塌了）。
- 截图 `Page.captureScreenshot` **带 `clip` 会丢 WebGL 画布**（截出空白）→ 整视口截。

## 附录 C — 已作废的表述（读到就忽略）

| 旧说法 | 现状 |
|---|---|
| 「`activeStop === null`（概述 / finale）时不动线」 | 作废，见 §5.4 sentinel |
| `.pj-back` 移动端在左下 `bottom:1.1rem; left:1rem` | 右上 `top:58px; right:14px; 42×42`，见 §5.5 |
| `--tl-*` 令牌定义在 `TravelLog.tsx` | 已搬进 `app/globals.css` |
| 封面 `card/img-2748.webp` | `cover.png`（`card/` 目录已删 —— `cover` 本来只是 `card.json` 的字段） |
| 数据在 `content/.../source/` | 在 `public/data/travel/just-because/`（`KEEP` 保护） |
| `FOLLOW_ZOOM_DELTA = 5` | 现值 `2` / `2.5`（`NARROW` / `WIDE`） |
| 「§8 未提交的改动清单」 | 已过时；提交状态只看 `git status` |

## 附录 D — 开屏幕布（entry curtain，2026-10-24 新增）

两页共用公共外壳中的同一套机制：先以全屏蓝色幕布覆盖页面，等数据/地图就绪后，幕布固定右边缘缩回，**从左向右揭开页面**。返回按钮则从右向左铺满视口。

**此前“右侧竖窄蓝带”的实现已作废**：等待时只覆盖 5%–8%，并不符合全屏开幕；兜底还引用了未定义的关键帧。本轮同时修复了 Next Link 站内导航不执行解析期脚本的问题。

| 项 | 两类日志共用 |
|---|---|
| body 启动/释放类 | journal: `tl-veil-boot` / `tl-veil-open`；pilgrimage: `pj-boot` / `pj-veil-open` |
| 初始覆盖 | `inset: 0; transform: scaleX(1); transform-origin: right center` |
| 正常收幕 | `travel-log-entry-open`，0.46s，从 scaleX(1) 到 scaleX(0) |
| 兜底收幕 | `travel-log-entry-fallback`，延迟 3.5s，0.46s；等待和结束均保持对应关键帧 |
| 启动时机 | 完整加载用解析期脚本；Next Link 导航用 `TravelLogShell` 的 `useLayoutEffect`，在绘制前挂类 |
| 收尾 | 只认 `::before` 与两个幕布动画名；减少动态效果时不启动，运行时切换到 reduce 也立即清理 |

**四条硬约束，动了就坏：**

1. **幕布必须是 `body::before` 伪元素，完整加载由解析期脚本加类，站内跳转由 layout effect 加类，绝不能是 React 节点。**
   水合前插进 DOM 的节点会撞 React 19（#418 → 重渲染 → 节点被删）；用 React
   渲染的 `position: fixed` 元素会挂到 boot 盒子上、够不到视口。
2. **启动类只在 `prefers-reduced-motion: reduce` 之外才加**（`page.tsx` 里内联脚本判断），
   并且 CSS 侧对该媒体查询直接 `display: none` —— 幕布是纯装饰，不能挡残障用户的正文。
3. **每个动画状态用独立的 keyframes 名**（`travel-log-entry-fallback` / `travel-log-entry-open`）。
   复用同一个名字只会给一个已跑完的动画**重新计时**，画面完全不动（v13 踩过）。
4. **清理监听只认 `pseudoElement === "::before"` 且名字匹配的那两个动画**，
   否则页面上任何其它动画结束都会把类摘掉。

**兜底与竞态**：1500ms 的兜底定时器把 boot 推到 open，但它**必须先判断
`body` 是否还挂着 boot 类、且没有 open 类**。不判断的话，快速路径（正常退场）
已经在 1080ms 清完类，兜底会在 1500ms 把 `*-veil-open` 重新加回 body 并永久残留
（实测残留到 3000ms 仍在）。加判断后两页分别在 1590ms / 1198ms 完全清空。

**加载态兜底**：幕布在屏时数据可能还没到，`<div className="boot-loading">`
必须自带宽高与 `role="status"`，否则会露出裸的 "Loading trip data…" 文字。

---

_原始实验记录：`.workbuddy/memory/2026-10-15.md`、`2026-10-16.md`、`2026-10-17.md`。_
