# 素材与数据

| 目录 | 职责 |
|---|---|
| `content/playground/` | 人工维护 `intro.json` 的站点简介、`travelogues.json` 的窗位关联与摘要、`tracery-palettes.json` 的装饰玻璃配色 |
| `content/travel/<tripId>/` | 游记正文和卡片资料，场景从 `card.json` 取标题与默认简介 |
| `assets-src/playground/` | 四张玻璃绘稿、图稿配准记录 `window-gallery.mjs`、开口几何 `louvre-panel.mjs`、分片识别 `pane-network.mjs` |
| `assets-src/playground/archive/` | 巴洛克浮雕样件及署名、早期石纹贴图生成器 |
| `generated/playground/` | 入库的衍生数据，`pane-networks.json` 给出分片邻接关系，`light-map.json` 给出地图轮廓和片区 |
| `public/assets/playground/glass/` | 浏览器读取的四张对齐横排图集，保存主图、光学法线和粗糙度、透光颜色、玻璃片编号 |
| `public/assets/playground/sundial/` | 浏览器按需请求的循环 MP3 |
| `public/assets/home/nav/playground.webp` | 首页 Playground 卡片的共用封面 |

## 关联与构建

`travelogues.json` 的数组顺序决定首页底部短标题和近景切换顺序。每项的 `id` 是本场景中的稳定标识，`tripId` 关联站点游记，`assetId` 关联玻璃绘稿和装饰配色，`slotId` 指窗口的空间位置。`label` 是底部短标题，双语 `summary` 可覆盖游记卡片简介。`app/playground/page.tsx` 将这些字段与游记卡片、图集索引和游记路由组合，当前从窗进入中文游记。

玻璃图集按 `window-gallery.mjs` 的顺序横排，每层为 887 × 1774。四张图集的裁切范围和 UV 必须一致。光学图为每片玻璃记录特征，编号图编码分片索引，邻接数据让闪烁沿相邻玻璃接力。PNG 编号图需要无损存储。

```sh
node scripts/build-playground-glass.mjs
# 只重建分片编号和邻接数据时运行下行
node scripts/build-playground-pane-paths.mjs
# 只在需要更新地区轮廓时运行下行
node scripts/build-playground-light-map.mjs path/to/ne_110m_admin_0_map_units.geojson
node scripts/check-playground-sundial.mjs
```

地点轮廓来自 Natural Earth 1:110m Admin 0 Map Units v5.1.2，片区名称取 `SUBREGION`。构建使用本地 GeoJSON，部署使用已入库结果。现役石面程序材质由 `sundial-materials.ts` 生成，早期 WebP 贴图生成脚本留在素材档案。

音乐使用 sasakure.UK 的 *uzumakinoharu*。发布 MP3 从母版导出至 183.5 秒，保留自然尾音和约 3.2 秒的留白。Web Audio 每轮从曲首播放。母版与乐谱由用户的音乐项目维护，站点保留成品和界面署名。

## 更新卡片封面

用桌面浏览器打开 `/playground/`，静音进入，等光幕退去与镜头稳定。临时隐藏 `.sundial-heading` 和 `.sundial-interface` 后截取全景，构图保留石盘边缘、樱花树和四扇实窗。将图裁为约 3:2 并导出宽约 960 px 的 WebP，覆盖 `public/assets/home/nav/playground.webp`。在中英文首页悬浮卡片核对取景，页面沿用现有的懒加载与外圈揭示。
