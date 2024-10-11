---
layout: post
title: 日本語
author: Vincent Peng
date: 2024/10/10
category: Documentation
---

<p lang="zh">本文内容是一些日语学习过程中的杂谈</p>

- [中/日文编码问题和使用](#中日文编码问题和使用)



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

<!-- 
## 关于日语与广东话的相似之处

既然日语中确实很多汉字词是唐宋时期从中国引入的，那么日语和广东话之间的相似之处也是可以理解的。下面是一些偶然发现的具有相似发音的词语：

<table>
<tr>
<th>< -->
