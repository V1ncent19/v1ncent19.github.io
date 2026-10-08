import type { Metadata } from "next";
import { SectionMark } from "@/components/layout/section-mark";
import { HubHoverLink } from "@/components/travel/hub-hover-link";
import { GalleryView, type GalleryStoryTile } from "@/components/gallery/gallery-view";
import { getGalleryItems, getTravel } from "@/lib/content";
import { blogPostPath, getBlogPosts } from "@/lib/blog";
import { tripCards } from "@/lib/travel/trips";
import { copy } from "@/lib/i18n";

export const metadata: Metadata = {
  title: "旅行志",
  description:
    "可拖拽的足迹地球就在标题旁——其下是混排瀑布流：钉住的互动游记（Beta）置顶，巴黎餐馆简评按日期落进 2024-03-20 处，其后是精选照片墙。",
};

/* The Paris cuisine blog post surfaced as a story tile (image-less, so no
   cover needed — the tile is typographic). */
const PARIS_SLUG = "fr2024-cuisine";

/**
 * /travel/zh — 中文版 hub（2026-09-25 v3，与 EN 页同构）：地球放在页头标题
 * 右侧（不单开 § 足迹小节——打开即见地球与瀑布流两个主元素），清单以折叠
 * 图例行收在页头下方（TravelBoard hideGlobe 模式）；瀑布流最前是纯排版
 * 无图游记文字卡，其后照片墙与 /gallery/zh 完全同体验。Trip 正文目前是
 * 双语混合原始数据，中文卡链到 /travel/zh/<id>（同一 TravelLog）。
 */
export default function TravelZhPage() {
  const galleryItems = getGalleryItems();
  const travel = getTravel();

  const storyTiles: GalleryStoryTile[] = tripCards.map((trip) => ({
    id: `story-trip-${trip.id}`,
    href: `/travel/zh/${trip.id}`,
    /* 时间序编号的锚点日期（见下方排序）。 */
    date: trip.start,
    title: trip.title.zh,
    /* v2（2026-09-26）：只保留基本 metainfo——摘要小字删除（用户要求）；
       hover 圆形 reveal 封面对齐首页 gateway 卡。 */
    meta: "互动地图游记",
    tags: trip.stops?.zh,
    facts: [
      `${trip.days} 天`,
      `${trip.distanceKm.toLocaleString("en-US", { maximumFractionDigits: 1 })} km`,
      `${trip.gpsPoints.toLocaleString("en-US")} 轨迹点`,
    ],
    cta: "阅读旅行志",
    badge: trip.beta ? "Beta" : undefined,
    cover: trip.cover,
    /* 互动游记钉在瀑布流最前（2026-09-25 用户定案）；下面的食记改为按日期
       落进时间线。 */
    pinned: true,
  }));

  const paris = getBlogPosts().find((p) => p.slug === PARIS_SLUG);
  if (paris) {
    storyTiles.push({
      id: "story-paris-cuisine",
      href: blogPostPath(paris),
      title: paris.title,
      meta: "博客",
      tags: ["巴黎", "美食"],
      /* 显示用餐日期（用户指定的锚点），非发文日期——卡片在下方时间线里
         就落在 2024-03-20 处。卢浮宫日落缩略图作 hover 封面（2026-09-26）。 */
      facts: ["2024.03.20"],
      cta: "阅读全文",
      cover: "/assets/gallery/thumb/img-0462.webp",
      /* 不置顶：按日期并入照片时间线。 */
      date: "2024-03-20",
    });
  }

  /* 编号按时间序跨全部游记 tile 统一分配（2026-09-26 用户要求）：按锚点
     日期排序后发 01、02……——巴黎食记（2024-03）为 01，伊比利亚志
     （2025-12）为 02，置顶卡在视觉上仍排在最前。 */
  const numbered = storyTiles
    .slice()
    .sort((a, b) => (a.date ?? "").localeCompare(b.date ?? ""));
  numbered.forEach((t, i) => {
    t.index = String(i + 1).padStart(2, "0");
  });
  /* 最新一篇游记在编号旁挂标签 cell（2026-09-26 用户要求）。 */
  const latestTile = numbered[numbered.length - 1];
  if (latestTile) latestTile.latest = copy.zh.travel.latestBadge;

  return (
    <section className="shell pb-24">
      <div className="mx-auto max-w-5xl">
        {/* ---- 页头：标题与导语在左，可拖拽地球在右（打开即见两个主元素）。
            移动端：地球落到标题下方居中。 ---- */}
        <header className="pb-10 pt-2 sm:pt-4">
          {/* v12.1（2026-09-28）：网格 + 地球 + 清单整体移入 HubHoverLink
              （client），地球与清单行共享同一 hover 状态——恢复双向联动。
              仅标题与导语保留在服务端渲染。items-start（2026-09-26）：地球
              顶部与 h1 对齐锚定——展开下方清单时地球垂直位置不动（用户要求
              绝对位置）；pb-10 与全站 PageHeader 节奏一致。 */}
          <HubHoverLink lang="zh" travel={travel}>
            <h1 className="flex items-center gap-3 text-balance text-4xl tracking-tight sm:text-5xl">
              <SectionMark id="travel" size="1.5rem" />
              <span>旅行志</span>
            </h1>
            {/* 宽度锚点：以导语字号（1.05rem）下的 62ch 定宽，标题下的小字
                与两列足迹清单共用同一宽度，整体右侧放地球（2026-09-26）。 */}
            <div className="mt-4 max-w-[62ch] text-[1.05rem]">
              <p className="leading-relaxed text-muted">
                去过的地方的地图，还有路上的故事：可以跟着滚动生长的 GPS
                互动游记（Beta）、偶尔写写的食记，以及精选照片墙。
              </p>
            </div>
          </HubHoverLink>
        </header>

        {/* ---- 游记与照片：无图游记文字卡置顶，其后照片墙与 /gallery/zh
            同体验。 ---- */}
        <section className="mt-12" aria-label="游记与照片">
          <div className="mb-6 border-b border-line pb-3">
            <h2 className="flex scroll-mt-28 items-center gap-3.5 text-2xl font-semibold tracking-tight">
              <SectionMark id="stories-and-frames" />
              游记与照片
            </h2>
            <p className="mt-3 max-w-[62ch] leading-relaxed text-muted">
              被钉住的旅行志排在最前；食记按日期落进照片流。每一张照片都能点开背后的故事、坐标与原图下载。
            </p>
          </div>
          <GalleryView
            lang="zh"
            items={galleryItems}
            storyTiles={storyTiles}
            embedded
          />
        </section>

        {/* 「更多旅行内容」入口已删（2026-09-28 用户）：完整影集体验已在
            上方「游记与照片」流内，独立 /gallery 页面一并移除。 */}
      </div>
    </section>
  );
}
