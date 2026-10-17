# FEATURE — 巡礼地图（Just Because! @ 藤泽）

**状态：页面已建成并构建通过（`○ /travel/just-because` + `○ /travel/zh/just-because`）。等用户填文案 + 两个待决事项。**
**最后更新：2026-10-17（第五轮：移动端点击跳转根因修复 + 相机模型改为可缩放/拖动 + 跟随默认开启 + 亮线跟随标点）。**

> **✅ 2026-10-16 最终定案**
> 用户已手工完成 **36 张**对比图并入库。旧的四批产物（`original/`、`shot/`、`thumb/`、`anime/`，共 ~1.4 GB）**已删除**——原图用户在他处另有备份，位置信息已在 `photos.json`。
> **最终形态：站点只保留 `public/assets/pilgrimage/just-because/compare/{id}.webp`（36 张 webp / 16.4 MB，零 EXIF）。**
> 地图**只显示这 36 个点**。
>
> 断点续作时先读本文件。所有产物**都还没 commit**（按项目守则等用户验收）。

> **✅ 2026-10-16 深夜：前端完成**
> 路线管线（`scripts/pilgrimage-route.mjs`）+ 页面数据组装（`scripts/pilgrimage-map.mjs`）+ 三个前端组件（`PilgrimageLog` / `PilgrimageMap` / `PilgrimageStory`）已全部落地，`tsc` / `eslint` / `npm run build` 三关全绿，桌面端与移动端截图均已目视验收。
>
> **✅ 2026-10-17 第二轮（用户六条反馈，全部落地）**
> ① 定位点沿轨迹平滑滑动，亮线与点严格同步（**新增 `routeIdx`，按时间锚定**）；② 弹窗改毛玻璃；③ 点地图标点 → 右栏滚动 + 弹窗打开；④ 左上时间牌 + 右上「自/昼/夜 + 随」合并控件；⑤ 修好返回键（原来 `display:none` 桌面端根本不显示）；⑥ `/travel` 与 `/travel/zh` 新增巡礼 tile + 中文路由。
> 全部经桌面 / 深色 / 移动端截图目视验收。**仍未 commit。**
>
> **✅ 2026-10-17 第三轮（两条微调）**
> ⑦ 弹窗缩到原面积的 **1/10**（300×248 → **80×100**，文字全删只剩缩略图 + 关闭钮）；⑧ **亮线改双向**，往回滚会退（原高水位已废）。
> 顶部/结尾的 null 状态不动线，行为不变。像素统计验证：第 20 站 → 第 8 站，亮蓝像素 6821 → 5209。
>
> **✅ 2026-10-17 第四/五轮（跟随镜头 + 点击跳转根因 + 相机模型重设计）**
> ④ 跟随镜头推近（第四轮）；⑤ 移动端点击跳转差一站的**两个真因**找到并修掉（`readPanel` 把带算进了地图里 / `finish()` 在滚动途中就被触发）；⑥ **相机模型推翻「固定比例」**——全貌下 `img-2846`/`img-2848` 只差 **1.2 px**，几何上不可点，经用户拍板改为「可缩放 + 可拖动 + 跟随默认开启 + 全貌回退键」；⑦ 亮线改为跟随光标同一分数位置，不再瞬变。
> 详见 §6「第五轮」。**仍未 commit。**
>
> **待办只剩：① 用户填 `overview.text` / `outro.text` / 各点 `note`；② 两个待决事项（底图合规、ptes-2025 隐私泄漏）。** 详见 §7。

---

## 1. 这个功能是什么

记录用户在藤泽做的《Just Because!》动漫圣地巡礼：到当地拍的实景照 ↔ 动画截图，**由用户手工合成对比图**，落在互动地图上。

- 地图标点 —— **只显示用户做了对比图的 36 个取景地**。
- 点开某个点 → 展开该处的对比图。
- 底图沿用 **MapLibre GL + OSM**（与 ptes-2025 游记一致，用户拍板；注意本仓有 `geo-map-compliance-guard` skill 偏好腾讯/高德，但此处**特例保留 OSM**）。

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

**⚠️ 命名规则（实际采用的）**：用户合成图用**原始手机文件名** `IMG_2746.jpg`（直接复制 `shot/` 的文件名，方便）。反查时映射规则：

```
IMG_2746.jpg  →  小写 + 下划线换连字符  →  img-2746  →  photos.json 查坐标
```

脚本 `stemToId()` 实现了这个映射。**36/36 全部成功反查**（2026-10-16 验证）。

### 2.2 最终上线形态：只有 `compare/`

| 角色 | 位置 | git | 说明 |
|---|---|---|---|
| **母版：对比图 jpg** | `assets-src/photos/just-because/compare/{IMG_xxxx}.jpg` | **gitignored** | 36 张手工合成原稿（29.9 MB），保留备用 |
| **上线：对比图 webp** | `public/assets/pilgrimage/just-because/compare/{id}.webp` | 入库 | 2400 px / q82，**36 张 / 16.4 MB，零 EXIF** |
| **快照：巡礼点数据** | `content/travel/just-because/source/anitabi-212278.json` | 入库 | 154 个点，供反查坐标/名称/集数 |
| **真源：位置表** | `assets-src/travel-data/pilgrimage/photos.json` | **gitignored** | 119 张照片的 id ↔ 坐标 ↔ 时间 |

**~~已删除（2026-10-16 傍晚）~~：**

- ~~`assets-src/photos/just-because/original/`（119 张实景原图，701 MB）~~ —— 用户在他处有备份
- ~~`public/assets/pilgrimage/just-because/shot/`（119 张 jpg，700 MB）~~ —— 合成原料，用毕即删
- ~~`public/assets/pilgrimage/just-because/thumb/`（119 张）~~ —— 不再需要
- ~~`public/assets/pilgrimage/just-because/anime/`（154 张）~~ —— 不做兜底显示
- ~~`assets-src/travel-data/anitabi-cache/`（19 MB 下载缓存）~~ —— 清理
- ~~`pilgrimage-review.csv`（距离建议工作表）~~ —— 用户自行挑图，不需要

**为什么 re-encode 而不是 copy**：`public/` 会被静态导出原样复制，进去即公开且永久。sharp 重编码**天然剥离 EXIF**……（但也见下：**用户直接从 jpg 合成时元数据已丢**，故 re-encode 主要作用是压缩体积 + 双保险）。

**隐私实测**：36 张 jpg 母版用 exifr 查 → 0 带 EXIF/GPS（magiconch 已经丢掉）；36 张 webp 用 sharp 查 → 0 带 EXIF/ICC/XMP。字节级扫到 2 处 `GPS` 字面命中，经查是 VP8 熵编码里的巧合字节（无 EXIF chunk），非真元数据。

**⚠️ 隐私检查点**：`public/assets/photos/` **不是垃圾目录** —— `cal.png` 与 `cuisine/`、`jokes/`、`nihongo/` 是 blog 与 about 页在用的已跟踪资源。只有 `**/original/` 子路径被 gitignore。动这个目录前必须区分。

## 3. 四个脚本（管线全貌）

全部在 `package.json` 有 npm script；全部幂等、可增量、支持 `--limit` 冒烟。

### 3.1 `scripts/anitabi-points.mjs` — `npm run anitabi:snapshot`

一次性快照 anitabi 的巡礼点数据 → `content/travel/just-because/source/anitabi-212278.json`。

```bash
npm run anitabi:snapshot -- --bangumi 212278
```

**为什么快照而非运行时抓取**：站点数据源是静态分片 JSON，快照后提交，站点只读本地文件 → 对 anitabi 改数据结构免疫，也不占别人带宽。

**🚫 `api.anitabi.cn` 是死路** —— 官方文档（github.com/anitabi/anitabi.cn-document）指向它，但该主机有 Cloudflare WAF 规则拒绝一切非浏览器客户端。2026-10-15 实测：curl / Node fetch 从住宅网络（出境 IP `216.80.62.26`，Chicago RCN）全部 HTTP 403，UA 伪装 / Referer / Origin / HTTP/1.1 都无效，真实 headless Chrome 导航同样被拒。**别再试。**

**✅ 可用通道**：`https://www.anitabi.cn/d/g.json` + `g0..g6.json`（`?d=<token>` 是缓存击穿参数，当前 `qo8w`）。

- `g.json[0]` = 全部作品数组。每个作品：`[0]` bangumiId、`[2]` 标题(ja)、`[3]` 标题(zh)、`[4]` 城市、`[5]` 色、`[6]` 封面、`[7]` 评分、`[8]` 类型、`[9]/[10]` 中心 lat/lng、`[11]` zoom、**`[12]` 打包坐标**（`[pointId, lat, lng, ord]` 平铺，每 4 个一组）、`[16]` 图标、`[17]` 短代码。
- `g0..g6.json` = 每个作品的**点详情**，7 个分片，切分不稳定 → **必须逐个搜**。记录：`[0]` bangumiId、`[2]` points[]，每点 `[0]` pointId、`[1]` name(ja)、`[2]` name(zh)、`[4]` Google My Maps doc id、`[6]` 截图路径、`[8]` 集数(null=主视觉)、`[9]` 集内秒、`[10]` 集标签（"1話,2話"）。
- **坐标只在 `g.json`，名字/截图只在 `g*.json`**，靠 pointId 关联。

**⚠️ 图片 CDN 的坑（重要）**：数据集里的路径是 `/images/points/…`，真实 CDN 是 **`img-tc.anitabi.cn`，且要丢掉 `/images` 前缀**：

```
数据集 /images/points/<id>/<pointId>.jpg
  → https://img-tc.anitabi.cn/points/<id>/<pointId>.jpg
```

**裸路径 `https://www.anitabi.cn/images/…` 是假的** —— 该主机会用 SPA shell（HTTP 200 + text/html）应答任何未知路径，naive 拼接会得到「看起来 200 实际是死链」的 URL（曾产生 154 条死链）。`abs()` 里的映射就是要防这个。

### 3.2 `scripts/anitabi-images.mjs` — `npm run anitabi:images` ⚠️ 已退出管线

~~从 `img-tc.anitabi.cn` 拉 154 张动画截图 → `public/assets/pilgrimage/just-because/anime/{pointId}.webp`。~~

**2026-10-16 起不再使用**：用户明确不需要兜底显示，合成时直接在 anitabi 网站用原图即可，本地不再保留 anime 截图。脚本文件先留着（无害，且完整记录了 anitabi 图片 CDN 的取数规则，见下），但**不再作为管线的必需一环**。

- 若将来又要用：**尺寸档位**，不带 `?plan=` 即原图（~512 px 高）；`plan` **只接受 `h160`/`h360`**，`h720`/`h1080`/`w640`/`raw` 全 404（原图不够高，拒绝放大）。
- 内含图片 magic 校验（JPEG `FFD8` / PNG `8950`），防 CDN 回 block 页。
- 参数：`--points`、`--out`、`--cache`、`--quality`(82)、`--concurrency`(4)、`--plan`、`--limit`、`--force`。

### 3.3 `scripts/pilgrimage-photos.mjs` — `npm run pilgrimage:photos`

**核心用途：产出 `photos.json`（位置唯一真源）。** 在**任何合成之前**跑，把每张实景照的坐标 + 拍摄时间抽出来。

```bash
npm run pilgrimage:photos -- --dir assets-src/photos/just-because/original
```

产出 `photos.json` — 每张 `{ id, file, shotAt, shotAtLocal, tzOffset, lat, lon, camera }`，按时间排序。`shotAt` 是**带时区的完整 ISO-8601**（如 `2026-09-21T06:50:39+09:00`），下游排序/时间轴不用猜时区。

> ⚠️ **新方案下不再需要 `--points`**（那会额外生成 `pilgrimage-review.csv` 距离建议工作表）。用户自行挑图，不靠算法建议。只跑 `--dir` 即可，只出 `photos.json`。

### 3.4 `scripts/pilgrimage-derive.mjs` — `npm run pilgrimage:derive`

对比图母版 → 上线 WebP。从 `photos.json` 读 id↔文件映射（**不自己重推 id**）。

```bash
npm run pilgrimage:derive              # 增量
npm run pilgrimage:derive -- --force   # 全量重建
npm run pilgrimage:derive -- --limit 5 # 冒烟
```

- **新方案下只需 compare 一档**：`compare/`(2400 px / q82)。`render()` = `sharp(src).autoOrient().resize(box(long)).webp({quality})`。
- 增量：按 master mtime（`stale()`）。
- 孤儿：`compare/` 里名字不在 `photos.json` id 集的 → 告警 + 跳过。
- **内置隐私断言**：抽样检查产出的档，只要 `meta.exif || meta.icc || meta.xmp` → **`process.exit(1)`**。
- `compare/` 投放目录每次运行都会自动创建（提示你放哪）。
- **⚠️ 待改（新方案下）**：脚本当前仍会同时派生 `shot/` + `thumb/`（已被用户要求删除）。续作时应改成**只派生 compare**，删掉 shot/thumb 的循环与 `SHOT_LONG`/`THUMB_LONG` 常量。

## 4. 数据文件格式

### 4.1 `content/travel/just-because/source/anitabi-212278.json`（巡礼点快照，入库）

154 个点。**新方案下它的用途**：给「对比图的 photoId」反查出「该点坐标 + 名称 + 集数」，供地图标点。顶层含署名与来源信息；关键字段：

```jsonc
{
  "_source": "…CC BY-NC-SA 4.0: credit anitabi and link `sourceURL`…",
  "_generator": "scripts/anitabi-points.mjs",
  "_caveat": "…undocumented internals and may change shape without notice…",
  "fetchedAt": "2026-10-15T06:27:23.605Z",
  "datasetVersion": 1792015233739,
  "bangumiId": 212278, "title": "Just Because!", "city": "镰仓市",
  "center": [35.336884, 139.508788], "zoom": 11.9,
  "sourceURL": "https://anitabi.cn/map?bangumiId=212278",
  "detailShard": "g2.json",
  "pointsLength": 154, "pointCount": 154, "withImage": 154,
  "points": [
    {
      "id": "3aa8ngc7",
      "name": "湘南深沢駅ホーム",   // ja
      "nameCn": "",
      "ep": null,                 // null = 主视觉 / key visual
      "s": 3560,                  // 集内秒
      "epLabel": "メインビジュアル,1話 ",
      "lat": 35.33298, "lon": 139.518989,
      "image": "https://img-tc.anitabi.cn/points/212278/3aa8ngc7.jpg",
      "mapsMid": "1aL7PTUG34bise1f87AZDensHuEfTLHDP"
    }
  ]
}
```

### 4.2 `assets-src/travel-data/pilgrimage/photos.json`（位置真源，gitignored）

```jsonc
{
  "_note": "Position/time truth… keep under assets-src/ … ship only the derived pilgrimage.json.",
  "generatedAt": "2026-10-15T06:28:40.186Z",
  "dir": "assets-src/photos/just-because/original",
  "count": 119, "withGps": 119,
  "photos": [
    {
      "id": "img-2744",
      "file": "assets-src/photos/just-because/original/IMG_2744.jpg",
      "shotAt": "2026-09-21T06:50:39+09:00",
      "shotAtLocal": "2026-09-21T06:50:39",
      "tzOffset": "+09:00",
      "lat": 35.30669444444444, "lon": 139.50073333333333,
      "camera": "Apple iPhone 17 Pro"
    }
  ]
}
```

### 4.3 ~~`pilgrimage-review.csv`（工作表，gitignored）~~ — 已废弃

~~17 列…人工匹配工作表。~~ **2026-10-16 下午起废弃**：用户自行挑图，不需要距离算法的候选建议。`photos.json` 只用作「photoId → 坐标」的反查表。

## 5. 许可（必须遵守）

anitabi 的**点数据与截图是 CC BY-NC-SA 4.0**。

- 渲染巡礼点（名称/集数来自 anitabi）时**必须署名 anitabi 并链回 `sourceURL`**（`https://anitabi.cn/map?bangumiId=212278`）。
- 快照保留了 `_source` / `sourceURL` 等署名字段，就是给渲染器用的 —— **不得移除**。
- 用户自己的对比图（含本人实拍照）无此限制；但若对比图里含 anitabi 的动画帧，署名要求**依然适用于该动画帧部分**——地图页保留 anitabi 署名即可覆盖。

## 6. 产物与实测（2026-10-16 傍晚，最终）

| 目录 | 数量 | 体积 | 状态 |
|---|---|---|---|
| `public/assets/pilgrimage/just-because/compare/` | **36** | **16.4 MB** | 入库，站点唯一图档 |
| `assets-src/photos/just-because/compare/`（jpg 母版） | 36 | 29.9 MB | gitignored，保留备用 |

- **反查验证**：36/36 张对比图全部能按 `IMG_xxxx` → `img-xxxx` 映射回 `photos.json` 的坐标 ✅
- **隐私验证**：36 张 jpg 母版 exifr 查 → 0 带 EXIF/GPS；36 张 webp sharp 查 → 0 带 EXIF/ICC/XMP ✅
- **幂等**：二次 `pilgrimage:derive` = 0 built / 36 up to date ✅
- **压缩比**：jpg 29.9 MB → webp 16.4 MB（−45%）
- **已回收空间**：~1.4 GB（original 701M + shot 700M + thumb 4.1M + anime 3.7M + cache 19M）

## 7. 断点续作：剩下要做的

### ✅ 已完成（2026-10-16 深夜）—— 路线管线 + 前端

**新增三个脚本（前两个是本轮新写的）：**

| 脚本 | 输入 | 输出 | 作用 |
|---|---|---|---|
| `scripts/pilgrimage-route.mjs` | `assets-src/travel-data/gps/2026.01.01-2026.12.31.csv` | `content/travel/just-because/source/route.json` | 从**全年手机 GPS 导出**里裁出巡礼当天那 2.5 h 的路线，只留 `t/lat/lon` |
| `scripts/pilgrimage-map.mjs` | `compare/*.webp` + `photos.json` + `*-route.json` + `anitabi-212278.json` | `content/travel/just-because/page.json` | 组装页面唯一数据源，36 个点全部 join 上坐标/时间/anitabi 点 |
| `scripts/pilgrimage-derive.mjs`（早前已有） | `compare/` jpg 母版 | `compare/` webp | 压缩 + 剥 EXIF |

**路线裁剪的三个硬约束（写死在 `pilgrimage-route.mjs`）：**

- **紧包围盒** `{latMin:35.29, latMax:35.35, lonMin:139.47, lonMax:139.54}` —— 藤泽/镰仓一带。
- **时间窗** `2026-09-21T06:40`–`09:15` JST。实测落地：`06:43:59` 起（鎌倉高校前駅，`35.30722,139.49995`）→ `09:11:55` 止（`35.30753,139.49925`，**回到同一站，是个闭环**）。全程 2.47 h / 17.68 km / 273 点。
- **只留 `t,lat,lon`** —— `accuracy` / `speed` / `heading` / `altitude` / `stepType` 全部丢弃；时间戳降级成相对 `offsets`。这是隐私契约，**改脚本时不要放宽**。
- CSV 里 `dataTime` 是 **UTC epoch 秒**，JST = 手动 `-09:00` 偏移。

**前端组件（`components/travel/`）：**

- `PilgrimageLog.tsx` —— 外壳。把 `active` / `open` / `dismissed` 三个状态**合并成一个 `view` 对象**，三者不可能互相矛盾。`MutationObserver` 监听 `<html class>` 做主题跟随（不能同步 `setState`，见下）。接受 `backHref`/`backLabel`，EN 与 zh 版各指各的 hub。
- `PilgrimageMap.tsx` —— MapLibre 地图。**缩放/拖动已开放**（2026-10-17 第五轮推翻了「无缩放」的原始设定，原因见第五轮），`cooperativeGestures: true` 让滚轮需要 ⌘/Ctrl、手机需要双指，页面滚动优先。路线**渐进绘制**：暗色 `pj-route-full` 打底 + 亮色 `pj-route-head` 随滚动推进。**跟随镜头默认开启**（`FOLLOW_KEY` localStorage，只有显式存 `"0"` 才关），按视口宽度自适应推近 `FOLLOW_ZOOM_DELTA_NARROW = 5`（< 560 px）/ `FOLLOW_ZOOM_DELTA_WIDE = 4`。另有「全」键一键回全貌。
- `PilgrimageStory.tsx` —— 右栏。概述 + 可选 `interludes` + 36 站 + 完结撒花。`containerRef` + `[data-pj-stop]` + IntersectionObserver（`rootMargin: "-35% 0px -35% 0px"`）。**阅读带按故事列可见区（`readPanel()`）度量，不是视口**。

**2026-10-17 第二轮改动（用户六条反馈）：**

1. **定位点改为沿轨迹滑动 + 线与点严格同步** —— 这是本轮最实质的一条。原本亮线按「第几站 / 总站数」比例截断，而定位点是站点坐标，两者在不同路段会对不上。现在改为：
   - `pilgrimage-map.mjs` 为每站预算 `routeIdx`（**按时间锚定**：照片 `shotAt` → 相对起点秒数 → 最近的 `route.offsets` 下标）。
   - **必须按时间、不能按最近坐标**：环线两次经过藤沢駅，按空间最近得到的下标序列是 **89→84→85→79→113→…→199→155→207**（中途倒退），会让亮线可见地回缩。按时间锚定实测 **0 处倒退**、中位残差 11s，且能把藤沢駅那 7 张拆成 7 个不同下标（空间法会把它们全压到第一次经过）。
   - 生成器里另加了「下标倒退就 clamp 并 warn」的兜底。
   - 地图新增 `pj-cursor` 单点图层（halo + 实心点），用 `requestAnimationFrame` 在 `CURSOR_MS = 420` 内做 ease-out-cubic 位移；中途换目标从**当前分数位置**续跑，快速滚动不会回弹。
   - **亮线是双向的**（2026-10-17 用户改定，**推翻上一轮的高水位**）：head 直接跟当前站 `routeIdx`，往回滚就退回去 —— 蓝线的含义是「我已滚过的照片」，不是「我曾到过哪里」。`activeStop === null` 时不动线（概述与 finale 共用这个 null 信号，分不出来），所以顶部保住「起点→首站」那段、结尾留住完整环线。切底图重建图层用 `headIdxRef` 的**当前值**，不能再 `Math.max`。
2. **弹窗 = 80×100 纯缩略图**（同上，用户要求面积降到 1/10）：`background: color-mix(... 62%, transparent)` + `backdrop-filter: blur(16px) saturate(1.5)`，深色另给一档。**文字全删**，只留图 + 16px 关闭钮 —— 站名在时间牌、大图在右栏、`note` 也在右栏渲染。`POPUP_W`/`POPUP_H` 常量必须与 CSS 的 `.pj-popup{width}` 同步，移动端不要再写满宽覆盖。
3. **点地图标点 → 右栏滚动 + 弹窗打开**（两者都做，用户选了这个）。关键点：`onNavigateToStop` 与 `onOpenStop` 分开两条通道，否则「滚到该站 → observer 报告 active → handleActive 重算 open」会和刚打开的弹窗打架。滚动定位还要减掉移动端 sticky 地图的高度（`mapH`），否则目标站落在图后面。
4. **时间牌 + 明暗 + 跟随镜头合并** —— 左上 `.pj-time-plate`（`NN / 36 · 点名` + `HH:MM`；无 active 时显示日期与 `06:44 — 09:12`），右上两组药丸：`自/昼/夜`（复用 `lib/theme` 的 `applyTheme`/`readTheme`，**与站点头像共用 storage key**）+ `随`（跟随镜头）。样式对齐 ptes 的 `.bm-*`/`.timeline-indicator`。
5. **返回键修复** —— 原来 `.pj-back` 写着 `display: none`，**桌面端根本不显示**。改为 ptes `.tl-back-strip` 同款：桌面 48px 竖向长条（hover 变 58px、箭头左移淡出、竖排文字淡入），移动端右下浮动圆钮（`bottom:1.1rem; left:1rem` —— 放左上会压住时间牌/药丸，放右上会压住弹窗）。
6. **hub tile** —— `lib/travel/trips.ts` 注册 `just-because`，`TripCard` 新增可选 `cardMeta` / `cardCta` / `cardFacts` / `coverPos`，避免默认的「N 天 · N 轨迹点」文案描述一个上午的合成图巡礼。卡片显示「1 morning · 17.6 km · 36 composites」+「Anime pilgrimage map」+「Ride the route」。封面用 `card/img-2748.webp`（sharp 从对比图上半幅（动画帧）裁 560×560，**21 KB**；直接挂 335 KB 的原对比图做 hover 缩略图太重）。中文路由 `app/travel/zh/just-because/` 已补。

**2026-10-17 第四轮：跟随镜头放大**

用户："跟随模式下可以稍微把镜头 zoomin 一些，方便看到路线细节。我觉得放大到目前的 5 倍应该可以。"

- **先定口径再动手。** "5 倍"至少三种算法，彼此差 200 倍：zoom 级数 +5（= 线性 32×）、线性像素 ×5（= zoom +2.32）、面积 ×5（= zoom +1.16）。按级数实现，`FOLLOW_ZOOM_DELTA = 5`。
- **真正的判据是底图细节，不是倍数。** 实测（1440×900，地图栏 662 px）：

  | zoom | 视野宽 | 观感 |
  |---|---|---|
  | 13.17 | 4.59 km | 全貌，环线塞满一栏 |
  | 15.5 | 0.91 km | **空纸面**：街道标签消失，只剩色块 |
  | 17.2 | 0.28 km | 建筑轮廓出现，几乎无路名 |
  | **18.17** | **0.14 km** | 建筑 + 路名齐全，与旁边对比图的地面细度吻合 |

  Carto 在 zoom ≤16 仍在用泛化层，按线性 5 倍取 15.5 只会得到空白。所以"放大到能看清细节"这个目标恰好落在 +5 级上。
- `FOLLOW_MAX_ZOOM = 19` 兜超大视口（否则拟合 zoom 偏高时会算到 20+，底图已无内容）。`followZoom()` 是函数不是常量，因为拟合 zoom 会随视口 resize 变化。
- **关闭跟随即 `fitBounds` 回全貌。** 页面按设计禁用滚轮/双击/双指缩放，停在 32 倍等于把读者困在一个角上且没有退路。`toggleFollow` 在 `next === false` 时调 `reframeOverview()`；`lastFollowedRef` 开关都清空，重开时立刻对齐当前站。
- 实测：桌面 13.17 → **18.17**、移动端 12.225 → **17.225**（两边都正好 +5 级），关闭后精确回到 13.17。
- 移动端副作用：站名变长（「7-Eleven鎌倉常盤店付近」）时 15rem 上限的时间牌把整排药丸（含「随」）顶出 390 px 屏幕。补 `.pj-time-plate { max-width: calc(100vw - 11rem) }`（仅 `max-width:1023px`），让 `.pj-time-day` 自己 ellipsis。修后牌子 11–195 px、药丸 239–379 px。**第五轮加了「全」键后改成 `- 14.5rem`**（实测 390 px 下牌子 11–161、药丸 209–379，无重叠无溢出）。

**2026-10-17 第五轮：移动端点击跳转修不好 → 改相机模型（推翻「固定比例」）**

用户："现在在移动端模式下的点击跳转还是有问题。能不能试试把每个图片位置定义成一个章节，然后目录的点击跳转对应章节功能来实现？……另外，目前节点切换的时候标点是移动过去的，但是蓝色线是瞬变的。合理的效果应该是蓝色线跟随标点。"

**① 亮线跟随标点（已解决）。** `paintCursor()` 现在**同时**写 `pj-cursor` 和 `pj-route-head` 两个 source，都用 `cursorFracRef.current`（分数下标）。原来 `pj-route-head` 在 active 变化的 effect 里被**立刻** setData 到整数下标，而光标要 ease 420 ms，于是线先跳、点后到。现在线只能跟着光标走，两者不可能不一致。`slideCursorTo` 的中途帧也会同步 `headIdxRef`，切主题重建图层时不会错位。

**② 点击跳转的真正原因（已解决，两个独立缺陷叠加）：**

- **缺陷 A：`readPanel()` 把阅读带算在了地图里面。** 移动端 `.pj-map-col` 是 `position: sticky` 且**仍占流空间**，故事列从 y=490 才开始。旧代码 `top = Math.max(0, r.top)`：一滚进故事列，`col.top` 变成 −3510（整列在视口上方），于是 `top` 塌成 0、`height` 变成整个视口，带顶落在 **295 —— 完全在地图内部**，没有任何 section 与它相交，scorer 只好退回「离带中心最近」，报的是上方那一站。修法：取「视口 ∩ 故事列」再扣掉 sticky 地图的底边（`mapBottom` 仅在 `0 < mb < vh − 120` 时视为遮挡，这样桌面全高地图列不会被误判），得到面板 **490…844**、带 **614…720**，与落点一致。
  - 实测（390×844，点 `img-2790`）：修前 `panel=[0,844] band=[295,549]`，修后 `panel=[490,844] band=[614,720]`。
- **缺陷 B：`finish()` 在滚动途中就被调用了。** 旧兜底条件是 `r.top >= 0 && r.top < innerHeight`——平滑滚动**第二帧**目标 section 就已经从视口下方探进来了（还没到位），于是 `finish()` 立刻跑、`recompute()` 在飞行途中重算，最后 observer 停在动画路过的那一站。这就是「永远差一站」的直接来源。改成**连续两帧 `scrollY` 不变**才认为落定（`stable >= 2`）。
- 另外 `scrollend` 监听器加了 `moved` 闸门：点击当前正在读的那一站时页面根本不动，`{ once: true }` 的监听器会一直挂着并劫持**下一次无关滚动**。
- 落定后加**一次**落点校正（`|got − want| > 24 px` 且未被页面底部 clamp 时 `scrollTo` 修正，最多 2 次）。这治的是页尾附近 `scrollIntoView` 因上方 lazy 图未 decode 而产生的偏移。
- 实测：移动端 5 点全中（`img-2766/2774/2790/2791/2794` 及 `img-2762/2798/2800`），桌面 4 点全中，`secTop` 稳定落在 614 ± 1。

**③ 但 `img-2846` 仍然错 —— 这是几何问题，不是代码问题（用户据此改了设计）。**

在 390 px 宽的移动端地图上实测 36 个点的**像素间距**：

| 状态 | 最小间距 | 间距 < 14 px（命中半径）的点对 |
|---|---|---|
| 拟合全貌 / 手机 zoom 12.2 | **0.6 px** | 194 对 |
| 拟合全貌 / 桌面 zoom 13.2 | **1.2 px** | — |
| zoom 17 | 8.8 px | 4 对 |
| zoom 18 | **17.5 px** | 0 对 |

`img-2846` 与 `img-2848` 在全貌下相距 **1.2 px**——它们画在**同一个像素**上。点它时 `queryRenderedFeatures` 两个都能命中，取最近者在 1 px 精度下是随机的。**这不是 handler 能修的 bug，是这个尺度下信息本身不存在。**

向用户说明并让其在四个方案中选择，用户选了 **「移动端地图改用固定比例放大 + 拖动」**，随后确认了三个细节：默认全貌但可缩放拖动、阅读时自动跟随当前站点、两端都改。

**④ 相机模型改造（本轮实现）：**

- 构造参数：`scrollZoom/touchZoomRotate/doubleClickZoom/dragPan` 全开、`touchZoomRotate.disableRotation()`（双指扭转在这张图上就是误操作）、`minZoom = MIN_ZOOM(10)`、`maxZoom = FOLLOW_MAX_ZOOM + 1`、**`cooperativeGestures: true`**。
  - `cooperativeGestures` 是必须的：桌面地图列 100 vh，若滚轮直接缩放，读者只要指针碰巧在图上想滚页面就会变成缩放，页面滚不动。开启后滚轮需 ⌘/Ctrl、触屏需双指，页面滚动优先。
- **跟随默认开启**（`localStorage !== "0"` 才算关）。缩放增量**按视口分档**：`FOLLOW_ZOOM_DELTA_NARROW = 5`（< 560 px）/ `FOLLOW_ZOOM_DELTA_WIDE = 4`。原因：手机 390×490 已经够密，+5 到 17.2 刚好；桌面 662×900 面积是手机的 2.6 倍，同样 +5 会到 18.2，而 Positron 在那一级已停止绘制路名、整帧只剩空纸面。+4（→ 17.2，与手机同 zoom）视觉密度才对。
- **ResizeObserver 只 resize 画布，不再 re-fit 相机**（新增 `cameraOwnedRef`）。原来每次尺寸变化都 `fitBounds`，而手机地址栏收放会持续触发 —— 读者一旦缩放/拖动，就会被反复拽回全貌。
- **手动拖动/缩放会暂停跟随**，直到读到下一站才恢复（`userMovedRef`）。只监听 `dragstart` / `wheel` / `touchstart`，**不能监听 `zoomstart`** —— `easeTo` 自己也触发 `zoomstart`，跟随即刻自我暂停。
- **关闭跟随不再回全貌**（原来必须回，否则禁用缩放时读者被困在 32×）。现在有缩放和「全」键，硬拽回去反而更糟。
- 新增右上「全」键（`reframeOverview`），一键回整条路线。五个药丸在 390 px 下：牌子 11–161、药丸 209–379，不重叠不溢出。
- 实测：手机 12.23 → **17.23**，桌面 13.17 → **17.17**；跟随缩放下最小间距 20.5 px（手机）/ 19.7 px（桌面），**均大于 14 px 命中半径**，`collisionsUnderHitRadius = 0`，点点击 4/4 全中（含原先必错的 `img-2846`）。
- **已知限制（有意保留）**：关掉跟随后在全貌下点重合簇，仍会选到「最近的那个」。这是 1.2 px 间距的物理后果，不是回归；正常阅读时跟随已把相机推到可分辨的尺度。

**踩过的坑（改之前先读，能省几小时）：**

- **`.pj-map` 必须包在独立的 `.pj-map-box` 里**。`maplibre-gl.css` 自带 `.maplibregl-map { position: relative }`，与我们的 `.pj-map { position: absolute }` 同优先级但后加载，会导致 canvas 塌成 574×300 的空白条。不要试图直接给 `.pj-map` 上 `absolute`。
- **切换底图后重加图层必须监听 `style.load`，不能监听 `styledata`**。`styledata` 在换样式过程中会多次触发，其中最早的一次可能在**旧样式**的 `isStyleLoaded()` 仍为 true 时到达 —— 于是 `addLayers` 撞上尚未拆干净的旧 source 抛错，而监听器已经 `off`，**路线就永久消失**（实测：切深色后地图全空）。`style.load` 每个样式只触发一次且在新样式就绪之后。另在 `addLayers` 开头加 `getSource`/`getLayer` 幂等守卫。
- **mount-only effect 里禁止直接闭包引用会变的 props**（`openStopId`、回调）。地图只在挂载时建一次，闭包会把它冻结在挂载时的值（`openStopId` 恒为 null），「点已打开的标点不重复滚动」的守卫就永远不会生效。用 ref 镜像最新值。
- **IntersectionObserver 回调里不要用 `entries`**，要现场 `getBoundingClientRect()` 重算「屏幕中心最近的那个」。因为 observer 只在状态变化时触发，`entries` 是陈旧的。
- **不要缓存 DOM 节点的 ref Map**。`ref={register(id)}` 每次渲染返回新函数，React 会 detach 再 attach，缓存下来的 node 列表会失效。改成从 `containerRef` 现场 `querySelectorAll`。
- **React 19 lint 两条禁令**：`react-hooks/set-state-in-effect`（effect 体里禁止同步 `setState`）→ 用 `useState(() => ...)` 惰性初始化；`react-hooks/refs`（渲染期禁止读 ref）→ 改成 DOM 查询。
- **弹窗定位要做上下翻转**。只按「在点的上方」算，会让上半区的点被顶出屏幕。现逻辑：`PW = min(POPUP_W=80, w-16)`、`PH = POPUP_H=104`，上方放不下则翻到下方。
- **`--tl-*` 设计令牌定义在 `TravelLog.tsx` 的 `<style jsx global>` 里，作用域是 `body.tl-immersive`**。巡礼页必须同时挂 `pj-immersive` 和 `tl-immersive` 才能拿到这套令牌（令牌所在的 CSS chunk 由 `/travel/ptes-2025` 那套组件打进公共 chunk，已核对巡礼页 HTML 引用了同一份 CSS）。

**页面：** `app/travel/just-because/page.tsx` + `app/travel/zh/just-because/page.tsx`，**构建期 import** `content/travel/just-because/page.json`，走 `loadPilgrimage()` 显式校验形状（JSON import 推断出的是 `number[][]` 而非 `[number,number][]`，不能硬 cast；另校验 `routeIdx` 存在）。

### ⏳ 待办

1. **用户填文案（不是代码活）** —— `content/travel/just-because/page.json` 里的 `overview.text`（整体巡礼概述）、`outro.text`（完结撒花）、各站 `note`、可选 `interludes[]`。现在都是 `{ _placeholder: true, text: "" }`。改完**只需重跑 `npm run build`**（构建期 import），不用重跑生成脚本 —— 生成器会读旧输出 preserving 这些字段。
2. **复查 9 处歧义标点** —— `pilgrimage-map.mjs` 报告每个站有**两个几乎等距**的 anitabi 点（例：`img-2748 藤沢駅南口バス停 (19 m) vs runner-up 20 m`）。当前取最近的那个。9 处分别是哪几个站需人工过一遍。
3. **⚠️ 待决 A —— 底图合规** —— `geo-map-compliance-guard` skill 禁止 OSM/Carto 底图，要求腾讯/高德/百度/天地图。巡礼页与既有 ptes-2025 页都在用 Carto Positron/Dark Matter。**这一条必须用户拍板**，我没有擅自改基线。
4. **⚠️ 待决 B —— ptes-2025 既有隐私泄漏（不属本功能范围，但发现了要说）** —— `public/data/travel/ptes-2025/track.json` 含 **457 个芝加哥郊区点**（`2025-12-15T12:40:55-05:00` 起，lat 42.04 / lon −87.72，Evanston/Northwestern 一带，等于家庭住址级别），`diagnostics.json` 还含原始 `dataTime` / `stepType` 字段。仓库里已有 `scripts/sanitize-trip-gps.py`（`--radius-m` 默认 3000）但显然没跑在这份数据上。
5. **中文子集字体** —— 新渲染的 JSON（36 个日文点名如 `湘南深沢駅ホーム`）需确认 `scripts/subset-cjk-fonts.py` 的 `SCAN_DIRS` 覆盖到 `content/travel/`，然后重跑子集（见 `CONVENTIONS.md` §5）。
6. **（可选）时间牌在 finale 时的措辞** —— 现在 finale（无 active）会退回概述文案 `06:44 — 09:12`，与页面刚进入时长得一样。若想区分，可在 `PilgrimageMap` 里加一个「是否已过最后一站」的判断显示「完结 · 回到鎌倉高校前」。

## 8. 未提交的改动（截至 2026-10-17）

```
 M .gitignore                        (+gps_original 兜底规则)
 M app/globals.css                   (+.pj-* 整块；第二轮改 .pj-popup/.pj-map-tools/.pj-back)
 M app/travel/page.tsx               (tile 支持 cardMeta/cardFacts/coverPos)
 M app/travel/zh/page.tsx            (同上)
 M components/travel/PilgrimageLog.tsx    (backHref + navStopId 通道)
 M components/travel/PilgrimageMap.tsx    (cursor / 控件 / style.load 修复)
 M components/travel/PilgrimageStory.tsx  (滚动定位扣除 sticky 地图高度)
 M lib/travel/trips.ts               (+just-because 卡片 + 4 个可选字段)
 M lib/travel/pilgrimage.ts          (+routeIdx / routeDtSec)
 M package.json                      (新增 npm script)
 M structure_file/handover.md
 M structure_file/FEATURE_PILGRIMAGE.md
?? app/travel/just-because/          (page.tsx)
?? app/travel/zh/just-because/       (page.tsx，中文路由)
?? lib/travel/pilgrimage.ts          (领域模型)
?? content/travel/
     just-because/{card.json, page.json, source/{route.json, anitabi-212278.json}}
     ptes-2025/card.json
?? public/assets/pilgrimage/         (compare/ 36 张 webp, 16.4 MB + card/img-2748.webp 21 KB)
?? scripts/anitabi-points.mjs
?? scripts/anitabi-images.mjs        (已退出管线，文件留着)
?? scripts/pilgrimage-photos.mjs
?? scripts/pilgrimage-derive.mjs
?? scripts/pilgrimage-route.mjs
?? scripts/pilgrimage-map.mjs
```

> 另有 CV 相关的未提交改动（`content/cv/entries.ts`、`components/cv/cv-folio.tsx`、`public/assets/cv/v1ncent19-cv-en.pdf`）与 `components/gallery/badge-art.generated.ts` 生成物，属另一轮工作。

分支 `nextjs-rebuild`。**按约定未 commit**，等用户显式验收。**提交前务必 `git status` 核对并按路径显式 `git add`（本仓库禁用 `git add -A`）。**

---

_本功能的原始实验记录见 `.workbuddy/memory/2026-10-15.md` 与 `2026-10-16.md`；长期定案见 `.workbuddy/memory/MEMORY.md` 的「巡礼地图」章节。_
