# structure_file — 工程文档索引

这个目录是站点的「工程记忆」。代码回答**它现在是怎么运行的**，这里回答**为什么这么做、改的时候别踩什么**。

> **真相源优先级：代码 > 文档。**
> 文档里写的路径、常量、命令，随时可能被下一轮改动甩在后面 —— 在照着做之前，
> 先 `grep` 一眼确认（尤其是常量值和文件位置）。最后一次全量核对是 **2026-10-17**。

## 读哪一份

| 我想… | 读这份 |
|---|---|
| 接手 / 看进度 / 判断还差什么 | `handover.md` |
| 知道某个功能长什么样、文件在哪、数据怎么流 | `ARCHITECTURE.md` |
| 知道「该怎么做」、哪些设计已锁死、哪些被推翻过 | `CONVENTIONS.md` |
| 加相册照片 | `GALLERY_ADDING_PHOTOS.md` |
| 改巡礼页（`/travel/just-because`） | `FEATURE_PILGRIMAGE.md` |
| 想知道 2026-09 的原始设计意图 | `archive/`（**多已过时，只考古**） |

路径速查（都在本目录）：

```
handover.md                  进度与入口
ARCHITECTURE.md              系统现状
CONVENTIONS.md               守则与基线
GALLERY_ADDING_PHOTOS.md     相册 how-to
FEATURE_PILGRIMAGE.md        巡礼页
archive/                     旧规划原稿 + Stitch 导出（8 MB）
```

## 三份主文档的分工（别写串）

| | 回答 | 不该出现 |
|---|---|---|
| `handover.md` | 现在做到哪了、下一步做什么 | 长期架构描述（会过期） |
| `ARCHITECTURE.md` | 系统**现在**由什么组成 | 时间线、待办清单 |
| `CONVENTIONS.md` | 规则、基线、决策与作废记录 | 目录树（会有一百行） |

一个功能只需要一份深文档。目前只有巡礼页够格独立成篇（`FEATURE_PILGRIMAGE.md`）；
ptes-2025 的细节散在 `ARCHITECTURE.md` §数据管线 与 `content/travel/README.md`。

## 改完之后，哪份文档要跟着改

| 你改了什么 | 必须同步 |
|---|---|
| 新增/删除路由（`app/**/page.tsx`） | `ARCHITECTURE.md` 路由树；`content/site/navigation.ts`；`CONVENTIONS.md` 导航项 |
| 新增/删除脚本、改 `prebuild` 链 | `ARCHITECTURE.md` 脚本清单；`package.json` |
| 新增 trip（`content/travel/<id>/`） | `ARCHITECTURE.md` 数据管线；`content/travel/README.md`；blog 索引会自动多一条 |
| 改双语字段写法 | `ARCHITECTURE.md` §双语模型 + `CONVENTIONS.md` §四 + `lib/localized.ts` |
| 改 `public/` 目录归属 | `ARCHITECTURE.md` §`public/assets/` 布局（判据两条） |
| 改巡礼页的交互/常量 | `FEATURE_PILGRIMAGE.md`（§5 实现 / §6 不变量）；**常量值以代码为准** |
| 设计基线（配色、容器、缩放） | `CONVENTIONS.md` §二（锁死项，改之前先问用户） |
| 本轮做了什么 | `.workbuddy/memory/<日期>.md`；跨轮教训 → `.workbuddy/memory/MEMORY.md` |

## 这份索引是怎么核对出来的

2026-10-17 的整理不是重写文档，而是**把每一条断言拿代码对一遍**，删掉重复段落，
把「时间线」和「现状」分开。核对用的命令（下次整理照抄）：

```bash
find app -name page.tsx                 # 路由树
ls scripts/ && node -e "console.log(require('./package.json').scripts)"
ls components/*/ lib/ lib/travel        # 目录职责
find public/assets -maxdepth 2 -type d  # 资产归属
find content -maxdepth 2                # 内容布局
git status --short                      # 未提交规模
```

当次修掉的主要错漏：

- `/gallery` 路由早已删除，但三处文档仍写「保留双语、已退出导航」；
- `CONVENTIONS.md` §5.1 把 `.workbuddy/check-cjk-spacing.mjs` 当成现役 linter，其实脚本已随 `.workbuddy/` 清理消失；
- `bilingualBases` 已改成由 `navItems` 推导，文档还写「手工维护」；
- `ARCHITECTURE.md` 的 `scripts/` 只列了 6 个（实际 14 个），`components/travel/` 漏了三个 `Pilgrimage*`；
- `FEATURE_PILGRIMAGE.md` 的 `FOLLOW_ZOOM_DELTA` 写 5 / 4，代码是 **2 / 2.5**；
- `GALLERY_ADDING_PHOTOS.md` 的路径（`public/assets/gallery/`）与字段名（`place_en`）全是旧版，第一步的 `GalleryPhoto/` 已不存在；
- `handover.md` 的基线 commit（`9281bd9`）过期，实际 HEAD 是 `cb5cfd1`。

## 约定

- **中文写、代码块用英文**；文件名全大写表示「定稿」，`FEATURE_` 前缀表示「单功能深文档」。
- 不写「TODO: 待补充」的空壳小节 —— 没内容就不建标题。
- 提到某个常量/路径时，**带上文件位置**，方便下一个 agent 一 `grep` 就到。
- 归档代替删除：作废的结论写进对应文档的「已作废」表，而不是抹掉 —— 否则下一轮会有人重新犯同一个错。
