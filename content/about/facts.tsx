/**
 * About "sealed facts" board — the CONTENT (2026-10-17).
 *
 * Lives here, not in `components/about/facts-board.tsx`, because it is authored
 * prose: the board is only the layout (5 envelopes, one seal each). The facts
 * were transplanted VERBATIM from `content/about/{en,zh}.md`
 * ("More random things" / "不正经爱好") — no new facts were invented.
 *
 * Why `.tsx` and not JSON: every line is rich text with inline links
 * (`<L href>`, plus a `<span class="heimu">` spoiler in zh). A JSON schema for
 * that (`{t:"text"|"link", v, href}` segments) would have to reproduce JSX's
 * whitespace collapsing exactly, and a single lost space is a visible change.
 * Revisit if/when a shared rich-text format is introduced site-wide.
 *
 * `L` is `InlineLink` (a presentation primitive) under the old short alias so
 * the moved items stay byte-identical to what the component used to render.
 */
import type { ReactNode } from "react";
import type { Lang } from "@/lib/i18n";
import { InlineLink as L } from "@/components/content/inline-link";

export interface FactGroup {
  id: string;
  /** Category name printed on the sealed envelope. */
  tag: string;
  /** Facts revealed together when the seal is broken. */
  items: ReactNode[];
}

export const FACT_GROUPS: Record<Lang, FactGroup[]> = {
  en: [
    {
      id: "esports",
      tag: "Esports & Games",
      items: [
        <>
          An esports audience — a fan of <L href="https://g2esports.com/">G2 ESPORTS</L>{" "}
          and of <L href="https://twitter.com/G2Caps">Rasmus &quot;Caps&quot; Winther</L>.
        </>,
        <>Also a player: CS2 / HoK / DSP / KSP / Civilization 6 / CoD.</>,
        <>Recently: The Artisan of Glimmith / Iron Nest. </>
      ],
    },
    {
      id: "screens",
      tag: "Media & Art",
      items: [
        <>
          Favourite anime:{" "}
          <L href="https://summerghost.jp/">『サマーゴースト』 (Summer Ghost)</L>{" "}
          and{" "}
          <L href="https://justbecause.jp/">『ジャストビコーズ』 (Just Because!)</L>. See my <L href="https://bangumi.tv/user/925364">Bangumi</L> for more. 
        </>,
        <>
          Favourite artists:{" "}
          <L href="https://fr.wikipedia.org/wiki/Auguste_Renoir">
            Pierre-Auguste Renoir
          </L>{" "}
          and <L href="https://www.pixiv.net/users/772547">loundraw</L>.
        </>,
        <>
          Science fiction novel enthusiast; favourite authors include{" "}
          <L href="https://zh.wikipedia.org/wiki/刘慈欣">Cixin Liu</L>,{" "}
          <L href="https://zh.wikipedia.org/wiki/刘宇昆">Ken Liu</L> and{" "}
          <L href="https://en.wikipedia.org/wiki/Isaac_Asimov">Isaac Asimov</L>.
        </>,
        <>
          Favourite music mainly ranges in{" "}
          <L href="http://163cn.tv/yazW5l0" title="Recommendation: Glenn Gould">
            classical
          </L>
          ,{" "}
          <L href="http://163cn.tv/yazVo3n" title="Recommendation: ユイカ & あたらよ">
            j-pop
          </L>{" "}
          and{" "}
          <L href="http://163cn.tv/yaz01aM" title="Recommendation: V.K 克">
            light music
          </L>
          .
        </>,
        <>
          My avatar is from{" "}
          <L href="https://www.pixiv.net/artworks/675540">Pixiv</L>.
        </>,
        <>
          A fan of {" "}
          <L href="https://www.facebook.com/capoocat">Bugcat Capoo</L>.
        </>,
      ],
    },
    {
      id: "daily",
      tag: "daily life",
      items: [
        <>
          Cooking; you are welcome to visit the cooking posts under{" "}
          <L href="/blog/#cuisine">Blog</L> to see my research results (cuisine is more of science insteadof arts.); favourite
          cuisines are Cantonese and French, least favourite is American.
        </>,
        <>
          <L href="https://www.lego.com/en-us">LEGO</L> MOC enthusiast,
          especially mechanical sets. An example see <L href="blog/2023/other-activity/#lego-moc">blog post</L>.
        </>,
      ],
    },
    // {
    //   id: "roads",
    //   tag: "on the road",
    //   items: [
    //     <>
    //       A museum enthusiast; the primary destination of most travel is the
    //       local museum or art gallery.
    //     </>,
    //     <>An incoming traveller, currently seriously troubled by visa issues = =</>,
    //   ],
    // },
    {
      id: "myself",
      tag: "myself",
      items: [<>Social phobia (?lol).</>],
    },
  ],
  zh: [
    {
      id: "esports",
      tag: "电竞与游戏",
      items: [
        <>
          LoL &amp; CS2 赛事观众，<L href="https://g2esports.com/">G2 ESPORTS</L>{" "}
          队粉，<L href="https://twitter.com/G2Caps">Rasmus &quot;Caps&quot; Winther</L>{" "}
          个人粉。
        </>,
        <>游戏也打：CS2 / 农 / 戴森球计划 / KSP / 文明6 / 使命召唤。 </>,
        <>近期：The Artisan of Glimmith / 铁巢重炮。</>
      ],
    },
    {
      id: "screens",
      tag: "屏幕与纸页",
      items: [
        <>
          喜欢的番是{" "}
          <L href="https://summerghost.jp/">『サマーゴースト』 (Summer Ghost)</L>{" "}
          和{" "}
          <L href="https://justbecause.jp/">『ジャストビコーズ』 (Just Because!)</L>
          。<span className="heimu">（日语是个好语言，片假名地狱除外。）</span>欢迎来访我的 <L href="https://bangumi.tv/user/925364">Bangumi</L>。
        </>,
        <>
          喜欢的艺术家是{" "}
          <L href="https://fr.wikipedia.org/wiki/Auguste_Renoir">
            Pierre-Auguste Renoir
          </L>{" "}
          和 <L href="https://www.pixiv.net/users/772547">loundraw</L>。
        </>,
        <>
          科幻小说爱好者，喜欢的作家笼统来说有{" "}
          <L href="https://zh.wikipedia.org/wiki/刘慈欣">刘慈欣</L>、
          <L href="https://zh.wikipedia.org/wiki/刘宇昆">刘宇昆</L> 和{" "}
          <L href="https://en.wikipedia.org/wiki/Isaac_Asimov">Isaac Asimov</L>
          ，还可以加上{" "}
          <L href="https://en.wikipedia.org/wiki/Philip_K._Dick">Philip K. Dick</L>。
        </>,
        <>
          喜爱的音乐主要分布于{" "}
          <L href="http://163cn.tv/yazW5l0" title="推荐：Glenn Gould">古典</L>
          、<L href="http://163cn.tv/yazVo3n" title="推荐：ユイカ & あたらよ">二次元</L>
          和<L href="http://163cn.tv/yaz01aM" title="推荐：V.K 克">轻音乐</L>。
        </>,
        <>
          <L href="https://github.com/V1ncent19">头像</L> 出处见{" "}
          <L href="https://www.pixiv.net/artworks/675540">Pixiv</L>。
        </>,
        <>
          <L href="https://www.facebook.com/capoocat">猫猫虫 capoo</L> 爱好者。
        </>,
      ],
    },
    {
      id: "daily",
      tag: "烟火气",
      items: [
        <>
          烹饪；菜但爱玩，邀请大家前往 <L href="/blog/#cuisine">博客</L>{" "}
          的做饭标签观看本人的研发成果；喜欢的菜系是粤菜和法餐，不喜欢的菜系是美国菜。
        </>,
        <>
          <L href="https://www.lego.com/en-us">LEGO</L> MOC 爱好者，尤其偏好机械组。样例见 <L href="blog/2023/other-activity/#lego-moc">博客帖子</L> 
        </>,
      ],
    },
    // {
    //   id: "roads",
    //   tag: "在路上",
    //   items: [
    //     <>博物馆爱好者，去大多数地方旅游的首要目的地是当地博物馆/美术馆。</>,
    //     <>incoming 的旅游爱好者，目前严重受困于签证问题 = =</>,
    //   ],
    // },
    {
      id: "myself",
      tag: "关于我本人",
      items: [<>社恐(?)。</>],
    },
  ],
};
