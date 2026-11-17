# Atelier du vitrail 工程手册

Atelier du vitrail 是游记的三维入口。樱花树、八个交错的哥特窗座和石盘组成可以自由探索的浮空日晷。四扇已有游记的花窗与四座预留空窗框交替排列。

| 要改的内容 | 维护入口 |
|---|---|
| 文案、游记清单、图集、音频、地图和首页封面 | [素材与数据](ASSETS.md) |
| 美术规范、材质、光照、镜头和界面交互 | [场景与交互](SCENE_AND_INTERACTION.md) |
| 增加游记、填充空窗、外环扩展和验收 | [扩展与验收](EXTENSION.md) |

## 站点接口

- 中英文主导航各有 Playground 项，两端都指向 `/playground/`。`content/site/navigation.ts` 维护路由，`homeCards` 让 Playground 占用首页原 Project 卡位。Project 继续由主导航访问。
- 首页卡片沿用悬浮图片和文字样式，点击直接进入场景。`/travel/` 和 `/travel/zh/` 在 Stories & frames 之前通过 `components/travel/playground-intro.tsx` 引入简介和入口。
- Project 通过 `content/project/atelier-du-vitrail.md` 收录该项目，中英文列表及项目介绍页沿用共用模板；介绍页的 Open Playground 链接指向 `/playground/`。
- `app/playground/page.tsx` 是单一静态入口，读取场景清单和 Travel 卡片元数据。交互、画布及其样式分别从 `components/playground/PlaygroundExperience.tsx`、`SundialScene.tsx` 和 `app/playground/playground.css` 进入。主场景延迟到浏览器加载。
- 读者由窗进入游记时，游记沿用公共返回条和蓝幕。`lib/travel/log/return-navigation.ts` 保存同标签页入口，Playground 在其历史条目上保存选中的窗。返回时恢复近景。

站点的总体数据规范见 [系统架构](../ARCHITECTURE.md) 和 [工程约定](../CONVENTIONS.md)。早期的[庭院原型](../archive/atelier-du-vitrail/FEATURE_PLAYGROUND_STAINED_GLASS.md)和[日晷施工记录](../archive/atelier-du-vitrail/PLAN_PLAYGROUND_SUNDIAL.md)供回看设计过程。旧庭院的运行代码和资产可在 Git 提交 `3598146` 查阅。
