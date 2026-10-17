# Adding Gallery Photos — Workflow

相册（`/travel` 的「Stories & frames」照片墙）加照片的操作流程。
每一节的最终依据都是 `scripts/gallery.mjs`（`npm run gallery:gen`）—— **文档与脚本冲突时，脚本赢**。

> **⚠️ 先读这条：`GalleryPhoto/` 目前不存在。**
> 2026-10-16 清理原始照片时删掉了这个本地母版目录，而脚本第 200 行仍然是
> `if (!fs.existsSync(SRC_DIR)) process.exit(1)`，所以 **`npm run gallery:gen` 现在会以
> 「source dir not found」直接退出**。而且原来那批原图只剩 `public/assets/photos/gallery/original/`
> 这一份（142 MB，git-ignored，**全站唯一副本，动它前先确认别处有备份**）。
>
> **恢复办法**：把 `public/assets/photos/gallery/original/` 整个复制成仓库根的 `GalleryPhoto/`，
> 再跑 `gallery:gen`。脚本会把 `original/` 重写成同样的字节（它本来就按 `source` 命名逐字节镜像），
> 所以这一步是幂等的。想换母版位置就改 `gallery.mjs` 的 `SRC_DIR`。

## 三步循环

```text
1. 原图放进 GalleryPhoto/                (git-ignored，永不推送)
2. npm run gallery:gen                   (写 webp 两档 + 合并 items.json)
3. 手填 content/travel/gallery/items.json 的人文字段，然后 build / preview
```

## 1. 原图 → `GalleryPhoto/`

- **只收 JPEG / PNG**（脚本过滤 `\.jpe?g$|\.png$`）。iPhone 的 HEIC 必须先转 JPEG。
- **文件名自由但要稳定**：`id` 由文件名派生（`IMG_2408.jpeg` → `img-2408`；NFKC + 小写，
  `()` → 空格，连续非字母数字 → `-`）。改名 = 当成一张新照片，原行会变成孤儿。
- **重名**：同一批里的同 slug 自动加 `-2`、`-3`…（`IMG_123 (1).JPG` 与 `IMG_123 (2).JPG` 是两张）。
  只有「同一个文件名再复制一份」才是真重复，那只会重新合并。

## 2. `npm run gallery:gen` 做什么

对每个源文件：

- autoOrient 后写两档入库 webp（都 q78）：
  - `public/assets/photos/gallery/thumb/<id>.webp`（长边 ~480 px）
  - `public/assets/photos/gallery/large/<id>.webp`（长边 ~1680 px）
- 把原图**逐字节**复制进 `public/assets/photos/gallery/original/<source>`，
  让灯箱的下载按钮走同源（2026-09-07 决定：仓内原图胜过外链网盘）。
- 合并 `content/travel/gallery/items.json`，**按 `source`（原始文件名）匹配行**：
  已存在的行只刷新生成字段；新文件追加一行，然后按日期倒序重排。
- 自动填：`date`（EXIF `DateTimeOriginal` → `YYYY-MM-DD`）、`lat` / `lon`（EXIF GPS 十进制度，
  没有就是 `null`）、orient 后的 `width`/`height`、`thumb`/`large` 两个 URL。
- `color` 是 `featured` 的**输出**（精选 → `#c8441f`，否则 `""`），不是手填字段。
- 找不到源文件的清单行会**告警但不删除**（孤儿）。要删一张照片就删那一行。

**绝不覆盖**的人文字段：`place` / `placeLocal` / `title`（都是 `{ en, zh }`）、单语 `alt`、
`country_code`、`originalUrl`、`featured`、`badge`。行里手加的任何额外键也原样保留。

## 3. 手填人文字段

新行的人文文字全空。**直接编辑 `content/travel/gallery/items.json`** ——
人文字段是构建期现读的，**改文字不需要重跑 `gallery:gen`**。

| 字段 | 含义 |
|---|---|
| `place` | 地区 · 城市，如 `{ "en": "Kaohsiung, Taiwan", "zh": "高雄" }`；国外写「国家-城市」 |
| `placeLocal` | 具体景点名，如 `{ "en": "Shoushan Lookout", "zh": "壽山觀景臺" }` |
| `title` | 打开卡片时的标题（空则退回 `place`） |
| `alt` | **单语**正文/描述，不拆中英 |
| `country_code` | 图片角标里的 ISO alpha-2（如 `TW`） |
| `featured` | 精选集：默认排序置顶 + 橙红强调色 |
| `badge` | 旅行印章预设 key（矢量图缺位时渲染占位符） |
| `originalUrl` | 可选，指向原图的链接（会加下载按钮） |
| `color` | **不要手填** —— 由 `featured` 派生 |

**双向回退**：`place` / `placeLocal` / `title` 只填一边也能两处都读通 ——
读的时候走 `lib/localized.ts` 的 `pick()`（当前语言 → 另一种 → 空串）。
但 `npm run check:i18n` 会对**两端全空**的 `{ en, zh }` 直接让 build 失败，所以别留空壳对象，
没有就整个字段省略。

## 常见坑

- **没有 GPS 的老照片** → `lat`/`lon` 是 `null`，灯箱世界地图**不画点**（刻意如此，绝不假造 0,0）。
  想要点就手写 `lat`/`lon`：源文件没有 GPS 时合并会保留手填值；源文件**有** GPS 时每次都被 EXIF 覆盖。
- **删照片**：把原图移出 `GalleryPhoto/` **并且**从 items.json 删掉那一行（脚本从不删行），
  可选地再删 `thumb/`、`large/` 里残留的 `<id>.webp`。
- **文件名就是身份**。要修 id/错字，优先在第一次 `gallery:gen` 之前改名。

## 让 AI 起草 `place` / `placeLocal`

每行都有 EXIF GPS，所以可以让助手起草而不是从零打：

1. 跑 `npm run gallery:gen`；
2. 对 `place` 为空的行走反向地理编码 —— 用 Photon
   （`https://photon.komoot.io/reverse?lat=..&lon=..`，OSM 数据；某些网络下 Nominatim 会超时）；
3. `place`（城市/国家级别）总是填；`placeLocal` **只在 GPS 正好落在一个标志性地标上**才填，
   城市街道这种模糊的就留空等人；
4. 报映射时带上置信度，让用户逐张对着照片核 —— `placeLocal` 取决于照片**拍到了什么**，
   光靠坐标证明不了。

之后由用户逐条改，全部是普通 `git diff`。
