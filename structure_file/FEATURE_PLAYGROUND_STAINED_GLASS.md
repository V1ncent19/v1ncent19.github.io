# 花窗陈列试验（`playground` 分支）

## 入口与范围

- 直接访问 `/playground/`；主导航、旅行志和站内卡片都不链接此页。页面设 `noindex`，但它不是访问控制。
- 仅在 `playground` 分支试验；现有部署工作流只发布 `main`。合并到 `main` 后才会随站点公开静态导出。
- PTES、Guatemala 2026 向内折，与两道空拱围住上层小花园，空拱后是带矮墙的小平台。石阶嵌在跌水和高台挡墙之间，法国窗墙与第二道跌水对齐。Anitabi 的内侧空拱通往一处铺石浅凹室。默认镜头朝北偏东 30°，可同时看到四扇窗。拖动庭院或用方向键可平移相机。点击窗体或底部文字链接进入对应游记，拖动释放时不会触发跳转。

## 文件与生成

- `app/playground/page.tsx`：独立路由和 metadata；`playground.css`：仅此路由的全屏布局及站点 chrome 隐藏。
- `components/playground/PlaygroundExperience.tsx`：页面文案、导航和 WebGL 的客户端懒加载。
- `components/playground/StainedGlassScene.tsx`：React Three Fiber 场景、残墙、窗饰、灯光与阴影。
- `components/playground/GardenCourtyard.tsx`：上下层石坪、石盆、植被、陶盆和藤叶。铺砖和重复植物复用网格与材质。
- `components/playground/CloisterMasonry.tsx`：台地、挡墙、石阶、回折的矮墙、空拱与独立拱券。`CloisterStream.tsx`：河床、岸石、连续的流动水面及两级跌水。
- `components/playground/cloister-stone.ts`：加载石材底色及共用的凹凸和粗糙度纹理。用 `node scripts/build-playground-stone.mjs` 从 `assets-src/playground/cloister-limestone.png` 重建两张 WebP。
- `components/playground/GardenPanCamera.tsx`：固定朝向的相机平移，区分拖动和窗体点击。
- `components/playground/gallery-layout.ts`：台地轮廓、石阶、溪流剖面、窗位、凹室和相机移动范围。庭院坐标以 `+X` 为东、`-Z` 为北，镜头和太阳方位分别按这套坐标计算。太阳固定在北偏西 45°，高度 32°。窗的位置、高度和朝向由场景几何与投光共用。
- `components/playground/glass-optics.ts`：依据花窗图案布置色片表面的倾角，并计算随观察角度变化的反光、石砖上的彩色投光。
- 四张选定原稿保存在 `assets-src/playground/`，分别是 `france-louvre-a.png`、`ptes-porto.png`、`guatemala-fuego-b.png` 和 `anitabi-station.png`。法国以 `IMG_0462` 为参考，Anitabi 以 `IMG_2852` 为参考。早期法国试稿和分片数据也保存在这里。
- `assets-src/playground/window-gallery.mjs` 记录陈列顺序、游记地址和各原稿边界。`louvre-panel.mjs` 定义四扇共用的尖拱尺寸、纵向增高比例及窗洞参数。窗面和投光使用同一套窗面坐标。
- 运行 `node scripts/build-playground-glass.mjs` 更新 `public/assets/playground/` 下的 `gallery-window.webp`、`gallery-window-optics.png` 和 `gallery-window-light.webp`。脚本用局部深色接缝估算分片，并将四扇窗的窗面、材质和透光数据按陈列顺序拼成三张同布局的横向纹理。每片的平均颜色用于显示投影中的色块。

早期试稿的图像生成提示词（内置工具，输入图为 `public/assets/photos/gallery/large/img-0462.webp`）：

> Use case: style-transfer. Asset type: portrait artwork texture for one three-dimensional pointed-arch stained-glass window on a travel website. Input image is the owner's photograph and must remain compositionally recognizable. Preserve the Louvre Palace building on the LEFT, the large Louvre glass pyramid on the RIGHT with its triangular metal lattice, the smaller pyramid in the lower-left, and the vivid Paris sunset: lavender-blue at the top, rose and coral clouds, glowing amber-orange behind the large pyramid, violet paving below. Recompose this wide source into a tall 1:2 panel while retaining the essential relationship of palace and pyramids. Translate the photograph into a richly crafted, luminous stained-glass artwork: many individually hand-cut translucent pieces, slender dark lead cames tracing the architecture and cloud flows, delicate irregular glass grain and internal color variation, strong warm backlight shining through the large pyramid. Keep the pyramid lattice legible; keep the palace's roofline and arches legible. Create ONLY the flat front-facing glass artwork, filling the canvas edge to edge. No stone frame, no wall, no room, no mockup, no text, no logo, no invented landmark, no Eiffel tower. This texture will be mapped into a real-time WebGL scene.

## 视觉实现与限制

- 参考《The Artisan of Glimmith》的石造废墟、尖拱花窗、窗饰、暖光和局部彩色地面反射；没有使用游戏素材。
- 各窗共用尖拱几何和玻璃着色器，分片图控制各片表面的倾角和高光宽度。铅条的微弱立体高光直接沿分片图记录的原稿接缝生成，接缝的遮光由透光图处理。四扇窗和太阳阴影共用固定光向。石面按光线与各窗所在平面的交点选取最近的窗洞，并在该窗的局部坐标下取九个采样点，计算窗洞遮挡和彩色直射光。采样范围随投射距离增大，让拼片边缘略有交融。石砖纹理与凹凸参与光照，光斑外缘和远端渐淡。
- 四扇窗使用同一时钟，各片玻璃根据分片参数错开亮暗变化。窗面与砖面在相同窗面坐标采样透光强度，因此对应色块同步变化。水面也使用此时钟，开启减少动态效果时，亮暗和水流静止，手动平移仍可用。
- 三张本地花窗纹理共约 5.2 MB，两张石材纹理共约 422 kB。墙体、铺砖、植被、拱券和溪流的几何在运行时生成。WebGL 不可用时，HTML 标题与文字链接仍可访问游记。
- `three`、`@react-three/fiber` 为仅此场景使用的依赖；场景动态载入，不进入普通页面的初始包。
