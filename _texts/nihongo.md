---
layout: post
title: 日本語
author: Vincent Peng
date: 2024/10/10
category: Documentation
---

<p lang="zh">本文内容是一些日语学习过程中的杂谈</p>

- [中/日文编码问题和使用](#中日文编码问题和使用)
- [使用 Praat 进行浊音发音练习指北](#使用-praat-进行浊音发音练习指北)
  - [什么是 Praat](#什么是-praat)
  - [IPA：塞音，清送气音/清不送气音/浊音](#ipa塞音清送气音清不送气音浊音)
  - [练习发浊音](#练习发浊音)
  - [日语中的清浊音](#日语中的清浊音)
- [日语中的颜色](#日语中的颜色)
- [关于日语与广东话的相似词汇](#关于日语与广东话的相似词汇)



## 中/日文编码问题和使用

事实上日语中虽然有大量的汉字词，但事实上写法并不完全相同，导致其实直接在某个文本环境中键入时其实很多汉字打出的是中文的字形。有些字尚且还是“本质上不同的字”（占据不同的编码），有些则是根本是同一个编码，只是在中文环境/日文环境下显示的字形不同。下面是一些具体的例子：

<table>
<tr>
<th><p> 中文</p></th>
<td><p lang="zh">系 海 写 認</p> </td>
</tr>
<tr>
<th><p> 日文</p></th>
<td><p lang="ja">系 海 写 認</p></td>
</tr>
</table>

事实上已经有明显的字形差异了，但是事实上如果不指定字体，用统一的字体格式显示的话就会变成一样的字形：

<img src="{{site.baseurl}}/assets/photos/nihongo/fontexample.png" alt="kanji" style="width: 50%;"/> 

为了解决这个问题，需要在网页部署时写好 css 文件，指定不同的字体。以本网站为例，需要修改/增加如下三处文件：

1. 在例如 `assets/fonts` 文件夹下放入日文字体的`.ttf`文件，例如我使用的是从 [google fonts](https://fonts.google.com/) 下载的 [Noto Sans Japanese](https://fonts.google.com/noto/specimen/Noto+Sans+JP/tester)，其中包含了一个 `NotoSerifJP-Light.ttf` 字体文件；
2. 在例如 `assets/style.css` 文件中增加如下代码：
```css
@font-face{
  font-family: 'noto-serif-jp';
  src: url('fonts/NotoSerifJP-Light.ttf');
}
```
这段代码的作用是将字体文件 `NotoSerifJP-Light.ttf` 作为 `noto-serif-jp` 字体引入到网页中；
3. 在例如 `_sass/_ed.scss` 文件中增加如下代码（此文件是我使用的模板的字体格式 css 文件，所以我修改了这个文件，事实上任何一个 css/scss 文件都可以）：
```css
p:lang(ja) {
  font-family: "noto-serif-jp", serif;
}
span:lang(ja) {
  font-family: "noto-serif-jp", serif;
}
```
这段代码使所有文档中的 `<p lang="ja">` 和 `<span lang="ja">` 标签中的日语文本使用 `noto-serif-jp` 日文字体。
    - 为什么这样会有用？因为网页中会有一些默认的字体可供调用，比如在我的网页中主要负责汉字的是 `serif` 字体，所以一般情况下（不指定字体）则会默认调用 `serif` 字体，显示的即为常见的中文汉字字形。
    - 在这里，我添加了一个 `<p>` 和 `<span>` 标签的 css 格式，指定了在 `<p lang="ja">` 和 `<span lang="ja">` 标签中的文本会按顺序考虑使用列出的字体，即先考虑使用 `noto-serif-jp` 字体，如果没有才使用默认的 `serif` 字体，这样就可以通过声明 `lang="ja"` 标签来显示日语文本。




## 使用 Praat 进行浊音发音练习指北

当学完五十音开始阅读日文文本时我才经常性地发现，很多地方我完全无法辨识浊音和清音，下面是一些例子（据信对于中文母语者都是比较普遍的问题）：

<table>
<tr>
<th><span lang="zh">日语词语</span></th>　
<th><span lang="zh">我听起来以为的发音</span></th>
</tr>
<tr>
<td><span lang="ja">ありがとう</span></td>
<td><span lang="ja">"arigadou"</span></td>
</tr>
<tr>
<td><span lang="ja">わたし</span></td>
<td><span lang="ja">"wadashi"</span></td>
</tr>
<tr>
<td><span lang="ja">かちょう</span></td>
<td><span lang="ja">"kajou"</span></td>
</tr>
</table>

基本是处于完全被杀烂的状态，为此查证了相关资料，发现是由于中文汉语拼音并没有所谓浊音[^1]，所以对于浊音的辨识/发音能力较差。为此特撰此篇加以介绍。这里我主要以 ptk/bdg 的对立为例。

### 什么是 Praat

Praat 是一个用于语音分析的软件，可以帮助我们分析一段音频的谱，比如下面是本人玉音放送的“瀑布”这个词的音频谱，其中上半部分是振幅谱，下半部分是频谱：

<p align="center">
  <img src="{{site.baseurl}}/assets/photos/nihongo/praat_pubu.png" alt="praat" style="width: 80%;"/>
</p>

利用频谱图可以帮助我们分析发音模式，例如低频区的大量（周期性的）黑色区域代表声带震动，高频区的黑色区域则一般是有吹气音的地方。

有了这个工具，我们可以定量地搞清楚自己在发什么音，而不是凭空依靠“听起来像”（which is not reliable at all），进而具体地研究为什么中文母语者容易把 t/d 和 p/b 这类浊音搞混。但是在这之前，对于实际上完全不知道什么是浊音的中文母语者来说，需要先了解一下什么是浊音。

### IPA：塞音，清送气音/清不送气音/浊音

（下面部分中，在【】中的音标表示是汉语拼音音标或日语罗马音，而在//中的音标表示是国际音标）

大家熟知的【p,t,k,b,d,g】这类音都是所谓的“塞音”（plosive），即在发音时声带完全关闭，然后突然打开，使得气流突然释放，发出声音。这其中包含两个步骤：一个是除阻（即气流释放的时刻），一个是声带震动的开始。声带震动与除阻时刻开始的时间差$T_\text{voiced}-T_\text{release}$被称为“发音起始时间” (voice onset time, VOT)，这个时间差异造成了塞音内部的再区分，也就是清送气音（aspirated）和清不送气音（tenuis）和浊音（voiced）的区别。

- 清送气音：国际音标为 /pʰ,tʰ,kʰ/，VOT>0（先除阻后声带震动）。
- 清不送气音：国际音标为 /p,t,k/，VOT≈0（除阻和声带震动几乎同时开始）。
- 浊音：国际音标为 /b,d,g/，VOT<0（除阻前声带已经震动）。

下面是玉音放送之 /atʰa/ - /ata/ - /ada/ 的 Praat 频谱图：

<p align="center">
  <img src="{{site.baseurl}}/assets/photos/nihongo/vot.jpg" alt="praat" style="width: 80%;"/>
</p>

- 在 /atʰa/ 中，可以明显看到在除阻和起震之前有很长的一段低频区没有明显的黑色，即声带没有震动，这一段就是 /tʰ/ 中送气部分 /ʰ/；大家可以通过拉长地发“他”这个字感受一下。
- 在 /ata/ 中，实际上除阻和起震几乎就是同时开始的（中间的一点点空隙其实也就只是除阻的那一刹那）；大家可以通过发“搭”这个字感受一下，并和“他”这个字做对比。
- 在 /ada/ 中，由于本人其实仍然不是很会发浊音，所以这里的频谱图并不是很完美，理想情况应该在除阻前也能看到明显的低频区黑色，即声带震动已经开始了。


通过 VOT 作区分，实际上我们能看到清送气音-清不送气音-浊音的连续性，汉语拼音音位和日语音位的区别也在这里体现：

- 在汉语拼音音位中，【p,t,k】$\mapsto$ /pʰ,tʰ,kʰ/是清送气音，【b,d,g】$\mapsto$ /p,t,k/是清不送气音；只存在 /pʰ,tʰ,kʰ/$\leftrightarrow$/p,t,k/ 的对立；位于【b,d,g】$\mapsto$ /p,t,k/ 的 VOT “更远端”的 /b,d,g/ 依然被认为是 /p,t,k/；
- 在日语音位中，【p,t,k】$\mapsto$ /p,t,k/是清音（送不送气不区分音位），【b,d,g】$\mapsto$ /b,d,g/是浊音；只存在 /p,t,k/$\leftrightarrow$/b,d,g/ 的对立；位于【p,t,k】$\mapsto$ /p,t,k/ 的 VOT “更远端”的 /pʰ,tʰ,kʰ/ 依然被认为是 /p,t,k/。

<table>
<tr>
<th>国际音标</th>
<td>/pʰ,tʰ,kʰ/</td>
<td>/p,t,k/</td>
<td>/b,d,g/</td>
</tr>
<tr>
<th>汉语拼音</th>
<td>【p,t,k】</td>
<td>【b,d,g】</td>
<td>【b,d,g】</td>
</tr>
<tr>
<th>日语</th>
<td>【p,t,k】</td>
<td>【p,t,k】</td>
<td>【b,d,g】</td>
</tr>
</table>


值得一提的例子是：与中文母语者难以区分清浊类似，日文母语者也难以区分送/不送气，比如“瀑布”这个词。下面是本人玉音放送的“瀑布”这个词的音频谱：

<p align="center">
  <img src="{{site.baseurl}}/assets/photos/nihongo/pubu.jpg" alt="praat" style="width: 80%;"/>
</p>

实际上如果只播放红框部分的话（类似于想象你是日本人，你不能识别/pʰ/的/ʰ/部分），你就会发现听起来完全就是“布布”而非“瀑布”（这一点从频谱图也能看出来）。

**【注】**当然在实际使用中，日语中的 /p,t,k,b,d,g/ 会有更多的分化场景，导致大多数时候中文母语者还是能够发对音的，这一点将在 [日语中的清浊音](#日语中的清浊音) 进一步讨论。


### 练习发浊音

虽然目前本人也是新手，但是网上提到过的一些 trick 我觉得还是比较受用的。总体的哲学就是借用现有的浊音先尝试感受什么是声带的震动。比如实际上中文是有浊音的，但是发生在 【n,m,ŋ】 这类鼻音中；或者是对比英文的【f,v】，【s,z】，【θ,ð】这类音。通过这些现成的浊音，可以先通过发【mb, nd, ng】来感受声带振动，然后逐渐去掉鼻音的部分即可（类似把大象塞进冰箱的简单步骤）。

例如下面是本人的【nda】的频谱图，可以清楚地看到除阻前低频区的声带振动。

<p align="center">
  <img src="{{site.baseurl}}/assets/photos/nihongo/nd.jpg" alt="praat" style="width: 80%;"/>
</p>




### 日语中的清浊音


名义上来说，日语的清浊音分别是“清弱送气音”和“浊音”[^2]（这导致了只存在中等送气和不送气清音的中文母语者完全被这个“弱送气”搞烂）。但很多时候在实操上会有一些有利于中文母语者的特点[^3] [^4]：

- <span lang="ja">か/た/ぱ</span>行的音在**词首**时经常被“送气化”，i.e. /k,t,p/ $\mapsto$ /kʰ,tʰ,pʰ/。所以对于词首的【k,t,p,g,d,b】就按照中文的对应版本发音即可区分；
- <span lang="ja">が</span>行的音在**词中**时经常被“鼻音化”，i.e. /g/ $\mapsto$ /ŋ/。所以对于词中的【k,g】可以按照中文的【g,ng】发音来区分。



## 日语中的颜色

目前发现日语中颜色词汇分类为三类：

- 一是四个“基础色”，有且仅有【<span lang="ja">赤</span>，<span lang="ja">青</span>，<span lang="ja">白</span>，<span lang="ja">黒</span>】；这四个颜色在作为形容词的时候直接加【<span lang="ja">い</span>】即可，例如【<span lang="ja">赤い</span>+名词】。实际上这四种颜色对应的即为“青红皂白”；
- 二是后补的两个“基础色”，有且仅有【<span lang="ja">茶色</span>，<span lang="ja">黄色</span>】；这两个颜色在作为形容词的时候需要加【<span lang="ja">色い</span>】使用，例如【<span lang="ja">茶色い</span>+名词】；
- 三是其他颜色，作为形容词时本质是进行名词+の的形容词化，例如【<span lang="ja">緑の</span>+名词】，【<span lang="ja">紫色の</span>+名词】。





## 关于日语与广东话的相似词汇

既然日语中确实很多汉字词是唐宋时期从中国引入的，那么日语和广东话之间的相似之处也是可以理解的。下面是一些偶然发现的具有相似发音的词语：

<table>
<tr>
<th>日语</th>
<th>粤语</th>
</tr>
<tr>
<td><span lang="ja">はい</span></td>
<td><span lang="zh">係(hai)</span></td>
</tr>
<tr>
<td><span lang="ja">世界(せかい)</span></td>
<td><span lang="zh">世界(sai gaai)</span></td>
</tr>
<tr>
<td><span lang="ja">家(うち)</span></td>
<td><span lang="zh">屋企</span></td>
</tr>
<tr>
<td><span lang="ja">ウンタン</span></td>
<td><span lang="zh">雲吞(wan tan)</span></td>
</tr>
<tr>
<td><span lang="ja">睡眠(すいみん)</span></td>
<td><span lang="zh">睡眠(sui min)</span></td>
</tr>
<tr>
<td><span lang="ja">国家(こっか)</span></td>
<td><span lang="zh">国家(gwok ga)</span></td>
</tr>
</table>


--------------------------------------------

[^1]: 可以参阅 [维基百科](https://zh.wikipedia.org/wiki/%E6%B8%85%E6%BF%81%E9%9F%B3) 中的条目，其中描述为【现代多数汉方言都缺乏浊的塞音、塞擦音和擦音，即中古全浊音】.
[^2]: 可以参阅 [维基百科](https://zh.wikipedia.org/zh-cn/%E7%99%BC%E8%81%B2%E8%B5%B7%E5%A7%8B%E6%99%82%E9%96%93) 中关于更多语言清浊送气音的讨论。
[^3]: 见 [维基百科](https://zh.wikipedia.org/wiki/%E6%97%A5%E8%AF%AD) 中的 【辅音】 一栏。
[^4]: 一些其他的证据可以参考 [一位日本 up 的经验](https://www.bilibili.com/video/BV1YP411J7Ga/?spm_id_from=333.337.search-card.all.click&vd_source=5babc16cd109862f3c7b87f70d9ba3f9).