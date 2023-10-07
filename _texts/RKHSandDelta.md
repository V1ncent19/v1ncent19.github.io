---
layout: post
title: RKHS in a Dual Space delta function Perspective
author: Vincent Peng
date: 2023/9/19
category: Knowledge
---

Recently I was introduced a new point of view of RKHS by my advisor. I think it's quite interesting and worth sharing. It provides a new understanding of how RKHS is constructed and, it's surprisingly related to the Dirac delta function in physics (and it does provide me some more 'maths' understanding of the delta function).

The original note could be found in *Scattered Data Approximation* by Holger Wendland. Thus here I directly write my understanding of the note in Chinese, with some of my own understanding added. 

For some preliminary knowledge about RKHS see [my note in RKHS theory]({{site.baseurl}}/texts/RKHS/).

## Understanding of Dirac $\delta $

从前我们（在物理的视角中）对 Dirac $\delta $ function 的理解是作为一个单点位置的激发函数，say (如果不带角标地版本默认为是 0 处的 $\delta $ 函数)
$$
\begin{align}
    \delta_{x_0}(\, \cdot \, )\equiv \delta(\, \cdot \, -x_0),\quad s.t. \delta_{x_0}(x)=\begin{cases} \infty, & x=x_0 \\ 0, & x\neq x_0 \end{cases},\quad \int_{-\infty}^{\infty} \delta_{x_0}(x)dx=1
\end{align}
$$ 

Well 如果要更严格化地讲 Dirac $\delta $ 所谓一个“函数”定义，我们一般会用一个函数列逼近，比如一些典型的例子有
$$
\begin{align}
    \delta _n(x) = n\mathbb{1}_{[-\frac{1}{n},\frac{1}{n}]}(x) \\
    \delta _n(x) = \dfrac{ n }{ \pi } \dfrac{ \sin nx }{ nx } 
\end{align}
$$ 

### Dirac $\delta $ as a dual vector

一种更直接的方式是将 Dirac $\delta_{x_0} $ 看作是一个函数空间对偶空间中的一个元素，它对函数空间中的元素 $f$ 的作用效果是
$$
\begin{align}
    \langle \delta_{x_0},f \rangle = f(x_0)
\end{align}
$$ 

这里的函数空间（和它的对偶空间）只要仿照广义相对论里面的张量逆变矢量空间（以及对偶的协变矢量空间）的概念理解就可以了。

-   Review:

    逆变矢量空间我们记为$V$，里面的元素$v\in V$就是我们平时熟悉使用的各种物理量，比如位移矢量$\vec{r}$，速度矢量$\vec{v}$，电场强度矢量$\vec{E}$，等等都是逆变的，在广相里我们会用抽象指标记号，say $v^\mu$ 表示它。在$V$的基础上我们可以将其对偶空间$V^*$定义为所有$V$上（线性）函数的集合，即
    $$
    \begin{align}
        V^*:= \{ \omega : V\mapsto \mathbb{R} \}
    \end{align}
    $$ 
    也就是$V^*$中的元素将$v\in V$映射成实数，这也就是广相里协变矢量的定义，say $\omega_\nu$。如果进一步有了度规$g_{\mu \nu }$作为同构映射之后，我们可以将$V$中的元素$v^\mu$映射到$V^*$中的元素$\omega_\nu$，并将之记为它的对偶元素
    $$
    \begin{align}
        v_\nu \equiv  g_{\mu \nu }v^\mu
    \end{align}
    $$ 

    当然在没有度规的情况下这种同构映射是 arbitrary 的，度规的存在才引进了这样一种“独特”的对应关系（同构映射），也让我们在广相里可以方便地使用某个量的“一对”矢量和对偶矢量。

这个时候将上面的矢量空间换成函数空间 $V=\{f\}$ 就能发现 $\delta _{x_0}$ 更好的一种理解方式是：它是 $V^*$ 中的元素，将任意 $f\in V$ 映射到 $f(x_0)$。

## RKHS in a dual space delta function PoV

可以简单回顾一下所谓的 Reproducing Kernel $K(\, \cdot \, ,\, \cdot \, )$: 一个对称非负的二元函数，再生表现为
$$
\begin{align}
    \langle K(\, \cdot \, ,x_0),f \rangle _{\mathcal{H}_K} = f(x_0) 
\end{align}
$$ 

对比一下 $\delta _{x_0}$ （此时作为对偶矢量）的效果立刻就能看出相似之处：
$$
\begin{align}
    \delta _{x_0}[f]  = f(x_0)
\end{align}
$$ 

这里的一个直接解释是 Riesz 表示定理（这里我直接给出内容了，不会证）

-   对于矢量空间 $V$，对于任意的 $ \omega \in V^*$，都存在唯一的 $ \phi _\omega \in V$ w.r.t. $\Vert \phi_\omega \Vert_{V} = \Vert \omega \Vert_{V^*}$，使得 $\forall v\in V$
    $$
    \begin{align}
        \omega (v) = \langle \phi_\omega ,v \rangle
    \end{align}
    $$

所以这里的意思完全就是，在上述的 Hilbert Space $\mathcal{H}_K$ 和对应的 Kernel $K(\, \cdot \, ,\, \cdot \, )$ 下，我们有
$$
\begin{align}
    \delta _{x_0} = \langle K(\, \cdot \, ,x_0),\, \cdot \, \rangle _{\mathcal{H}_K}
\end{align}
$$ 

（这里一个方便的观点是，given $x_0$, $K(\, \cdot \, ,x_0) \in \mathcal{H}_K$）anyway i.e. 这里 Reproducing Kernel 的作用也是通过 Riesz 表示定理来构造了一个$F: \mathcal{H}_K^*\mapsto \mathcal{H}_K$ 即 $F(\delta _{x_0}) = K(\, \cdot \, ,x_0)$。借用这个映射我们可以将内积也映射过去
$$
\begin{align}
    \langle \delta _{x_0},\delta _{x_1} \rangle _{\mathcal{H}_K^*} = \langle K(\, \cdot \, ,x_0),K(\, \cdot \, ,x_1) \rangle _{\mathcal{H}_K}
\end{align}
$$ 

## How is it useful 

这种观点能够方便地帮助我们理解 RKHS 的一些性质，比如说

-   正定性。$\forall n, \{\alpha_i,x_i \}_{i=1}^n$
    $$
    \begin{align}
        \sum_{i,j=1}^n\alpha _i\alpha _jK(x_i,x_j)=& \sum_{i,j=1}^n \alpha _i\alpha _j \langle K(\, \cdot \, ,x_i),K(\, \cdot \, ,x_j) \rangle _{\mathcal{H}_K} \\
        =& \sum_{i,j=1}^n \alpha _i\alpha _j \langle \delta _{x_i},\delta _{x_j} \rangle _{\mathcal{H}_K^*} \\
        =& \langle \sum_{i=1}^n \alpha _i \delta _{x_i},\sum_{j=1}^n \alpha _j \delta _{x_j} \rangle _{\mathcal{H}_K^*} \\
        =& \Vert \sum_{i=1}^n \alpha _i \delta _{x_i} \Vert _{\mathcal{H}_K^*}^2 \geq 0
    \end{align}
    $$ 
-   核再生
    $$
    \begin{align}
        \langle K(x, \, \cdot \, ) , K(\, \cdot \, ,y) \rangle _{\mathcal{H}_K} =& \delta _y(K(x,\, \cdot \, )) = K(x,y)\\
    \end{align}
    $$ 
