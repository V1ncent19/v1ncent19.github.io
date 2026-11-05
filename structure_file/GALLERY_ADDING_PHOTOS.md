# Adding Gallery Photos — Workflow

相册（`/travel` 的「Stories & frames」照片墙）加照片的操作流程。
每一节的最终依据都是 `scripts/gallery.mjs`（`npm run gallery:gen`）—— **文档与脚本冲突时，脚本赢**。

> **源目录：`public/assets/photos/gallery/original/`**（2026-10-25 改，用户调整了项目文件组织方式）。
> 原图现在**就放在画廊资产树里**，与 `thumb/`、`large/` 并列，不再有仓库根的 `GalleryPhoto/`。
> 目录被 `.gitignore:103` 的 `/public/assets/photos/**/original/` 命中，**0 个文件被跟踪**，
> 动手前先 `git check-ignore -v <文件>` 复核。
>
> 两条不能忘的推论：
> - **git-ignored 不等于不上线，但这里确实不上线**：`public/` 下的文件通常随站发布，
>   而这一档因为被 `.gitignore` 挡住、不进入部署产物，所以只有 `thumb/` + `large/` 两档会真正上线。
>   脚本对源目录**只读**，因此把源目录放在树内是安全的。
> - **永远不要把它纳入 git**：145 MB 的 push 会 HTTP 408，且 CI 干净检出没有这些文件 →
>   `check:refs` 失败 → Pages 构建挂（run #12 就是这么挂的）。
>
> 需要指向别的目录时用环境变量，不必改脚本：`GALLERY_SRC=/some/dir npm run gallery:gen`。

## 三步循环

```text
1. 原图放进 public/assets/photos/gallery/original/   (git-ignored，永不推送)
2. npm run gallery:gen                               (写 webp 两档 + 合并 items.json)
3. 手填 content/travel/gallery/items.json 的人文字段，然后 build / preview
```

## 1. 原图 → `public/assets/photos/gallery/original/`

- **只收 JPEG / PNG**（脚本过滤 `\.jpe?g$|\.png$`）。iPhone 的 HEIC 必须先转 JPEG。
- **文件名自由但要稳定**：`id` 由文件名派生（`IMG_2408.jpeg` → `img-2408`；NFKC + 小写，
  `()` → 空格，连续非字母数字 → `-`）。改名 = 当成一张新照片，原行会变成孤儿。
- **重名**：同一批里的同 slug 自动加 `-2`、`-3`…（`IMG_123 (1).JPG` 与 `IMG_123 (2).JPG` 是两张）。
  只有「同一个文件名再复制一份」才是真重复，那只会重新合并。

## 2. `npm run gallery:gen` 做什么

对每个源文件：

- autoOrient 后写两档入库 webp（都 q78）：
  - `public/assets/photos/gallery/thumb/<id>.webp`（**宽 640 px**，高上限 1280）
  - `public/assets/photos/gallery/large/<id>.webp`（长边 ~1680 px）

  **两档的约束轴不同，这是有意的（2026-10-25 修）**：
  - 瀑布流的每个格子**定宽**（默认 3 列时 298 CSS px，最窄 `MIN_TILE` 148），
    要清晰的是**水平方向**，所以 thumb 约束**宽度**。
  - 灯箱是固定高度舞台 + `contain`，看到的是长边，所以 large 约束**长边**。

  旧规则两档都用「长边 480」，对横图没问题（长边就是宽），但竖图的长边是高度 ——
  `img-9834` 的 thumb 只有 **247 px 宽**，却被格子拉到 298（2x 屏上是 596），
  这就是「竖图缩略图发糊」的真因。改后 49 张 thumb 宽度**全部为 640**。

  两个 sharp 细节，改之前先看：
  - 必须用 `fit: "outside"` 配 `width`，**不能用 `inside`**。实测 800×4000 的源图，
    `inside` 给出 256×1280（宽度又塌了，等于没修），`outside` 给出 640×3200。
  - 高度上限是**第二步**单独做的 `resize({ height: 1280 })`。一步同时给宽和高，
    会让极端长图反过来把宽度压小。
- **不发布原图**（2026-10-18 决定）。原图不再复制进 `public/`，清单里也不再生成
  `originalUrl`，灯箱因此**没有「下载原图」按钮**。原因：那 142 MB 一档被 `**/original/` 挡住不入库，
  干净 CI 检出没有这些文件 → `check:refs` 失败 → Pages 构建挂（run #12）；改成入库后
  142 MB 的 push 又反复 HTTP 408 超时。原图只留在磁盘上当母版。
  想让某张有下载按钮，就手写一条 **外部**（http/https）`originalUrl`，脚本会保留它。
- 合并 `content/travel/gallery/items.json`，**按 `source`（原始文件名）匹配行**：
  已存在的行只刷新生成字段；新文件追加一行，然后按日期倒序重排。
- 自动填：`date`（EXIF `DateTimeOriginal` → `YYYY-MM-DD`）、`lat` / `lon`（EXIF GPS 十进制度，
  没有就是 `null`）、orient 后的 `width`/`height`、`thumb`/`large` 两个 URL。
- `color` 是 `featured` 的**输出**（精选 → `#c8441f`，否则 `""`），不是手填字段。
- 找不到源文件的清单行会**告警但不删除**（孤儿）。要删一张照片就删那一行。

**绝不覆盖**的人文字段：`place` / `placeLocal` / `title`（都是 `{ en, zh }`）、单语 `alt`、
`country_code`、`featured`、`badge`，以及手写的**外部** `originalUrl`。行里手加的任何额外键也原样保留。
（例外：指向仓内 `/assets/...` 的旧 `originalUrl` 会被删掉 —— 那一档已经不上线了。）

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
| `featured` | 精选集：**排到最前面**（不是筛选，其余照片接在后面）+ 橙红强调色 |
| `badge` | 旅行印章预设 key（矢量图缺位时渲染占位符） |
| `originalUrl` | 可选，**只认 http/https 外链**（如网盘/CDN）—— 有它才显示下载按钮；留空是常态 |
| `color` | **不要手填** —— 由 `featured` 派生 |

**双向回退**：`place` / `placeLocal` / `title` 只填一边也能两处都读通 ——
读的时候走 `lib/localized.ts` 的 `pick()`（当前语言 → 另一种 → 空串）。
但 `npm run check:i18n` 会对**两端全空**的 `{ en, zh }` 直接让 build 失败，所以别留空壳对象，
没有就整个字段省略。

旅行日志入口不属于照片 `items.json`：真源在 `content/travel/<id>/card.json`。日志 `pinned` 默认 true，始终作为 featured 入口排在照片之前；`showPinnedBadge` 只控制图标（目前仅 PTES 为 true，Anitabi 为 false）。照片精选开关不改变日志这一排位。新增日志见 `FEATURE_TRAVEL_LOG.md`，卡片返回/悬浮规则见 `FEATURE_HOME_NAVIGATION.md`。

### 精选集是「置顶」不是「筛选」（2026-10-25 定案）

画廊打开时「精选集」按钮的 `aria-pressed` 初值是 `true`，含义是**把 `featured` 的行排到
最前面、其余照片接在后面**，缩略图墙上一张都不会少 —— 49 张全在。

实现是 `gallery-view.tsx` 里 `ordered` 的一次**稳定分区**
（`filter(featured)` ++ `filter(!featured)`，`Array#filter` 稳定，所以两段内部顺序都不变），
不是 `items.filter(i => i.featured)`。**改回筛选会让新加的、`featured: false` 的照片
从墙面上直接消失** —— 2026-10-25 加 `img-6308` 时就是这个现象被误判成「图没进去」。

> 这次改动同时**推翻了 2026-09-05「精选行不再置顶」的决定**：那条是在「只能筛选」的前提下
> 做的取舍，而用户现在要的是「全都在，喜欢的排前面」。

`featured` 的另外两个作用不变：橙红色强调（`--curated`），以及 `gallery:gen` 派生 `color`。
**不重跑脚本也立刻生效**（UI 实时读 `featured`；只有 `color` 字段要等下次生成）。

> **验收方法的坑**：探针不能按「DOM 里第 1..n 个 `[data-gid]`」判断谁在最前面。
> 网格是 `cols[i % columns].push(entry)` 的 **round-robin 分列**，
> 必须每列轮流取一个才能还原 `flow` 顺序；按 4 列算，DOM 前 6 个其实是第 0–1 轮。
> 另外行程卡（`story-*`）也带 `data-gid`，且第一张就排在最前，
> 判「是不是照片」要对照 `items.json` 的 id 集合，不能只看 id 前缀。

## 常见坑

- **没有 GPS 的老照片** → `lat`/`lon` 是 `null`，灯箱世界地图**不画点**（刻意如此，绝不假造 0,0）。
  想要点就手写 `lat`/`lon`：源文件没有 GPS 时合并会保留手填值；源文件**有** GPS 时每次都被 EXIF 覆盖。
- **删照片**：把原图移出 `public/assets/photos/gallery/original/` **并且**从 items.json 删掉那一行（脚本从不删行），
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
