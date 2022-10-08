---
layout: post
title: Liénard–Wiechert Potential
author: Vincent Peng
date: 2021/1/18
category: Knowledge
---

In dealing with electro-magnetic field of moving charged particle $$q$$ at $$\vec{r}_0(t)$$ with velocity $$\vec{v}_0(t)$$:
$$
\begin{align}
    \rho (\vec{r},t)=q\delta (\vec{r}-\vec{r}_0(t)),\quad \vec{j}(\vec{r},t)=\rho (\vec{r},t)\vec{v}_0(t)=q\vec{v}_0(t)\delta (\vec{r}-\vec{r}_0(t))
\end{align}
$$ 

4-potential given with Lorentz gauge:
$$
\begin{align}
    \phi (\vec{r},t)  =&\int \,\mathrm{d}^3x' \dfrac{\phi (\vec{r}',t-\dfrac{R}{c})}{4\pi \varepsilon _0R}=\int \,\mathrm{d}^3x' \dfrac{q\delta \left(\vec{r}'-\vec{r}_0(t-\frac{|\vec{r}-\vec{r}'|}{c})\right)}{4\pi \varepsilon _0|\vec{r}-\vec{r}'|}\\
    \vec{A}(\vec{r},t)=&\int \,\mathrm{d}^3x' \dfrac{\mu _0\vec{j}(\vec{r}',t-\dfrac{R}{c})}{4\pi R}=\int \,\mathrm{d}^3x' \dfrac{\mu _0q\vec{v}_0(t-\frac{|\vec{r}-\vec{r}'|}{c})\delta \left( \vec{r}'-\vec{r}_0(t-\frac{|\vec{r}-\vec{r}'|}{c}) \right)}{4\pi |\vec{r}-\vec{r}'|}
\end{align}
$$ 

Note that only when $$\vec{r}'$$ s.t. $$\vec{r'}-\vec{r}_0(t-\frac{|\vec{r}-\vec{r}'|}{c})=0$$, the formula in integral is non-zero. We denote the solution of it as $$(\vec{r}^*,t^*)$$, i.e.:
$$
\begin{align}
    \begin{cases}
        \vec{r}^*-\vec{r}_0(t-\frac{|\vec{r}-\vec{r}^*|}{c})=0\\
        t^*=t-\frac{|\vec{r}-\vec{r}^*|}{c}
    \end{cases}\Rightarrow \begin{cases}        
        \vec{r}^*=\vec{r}_0(t^*)\\
        \vec{v}^*:=\vec{v}_0(t^*)\\
        |\vec{r}-\vec{r}^*|=c(t-t^*)
    \end{cases}     
\end{align}
$$ 

in this way:
$$
\begin{align}
    \phi (\vec{r},t)=\dfrac{q}{4\pi\varepsilon _0|\vec{r}-\vec{r}^*|}\int \,\mathrm{d}^3x' \delta \left( \vec{r}'-\vec{r}_0(t-\dfrac{|\vec{r}-\vec{r}'|}{c}) \right)\\
    \vec{A} (\vec{r},t)=\dfrac{\mu _0q\vec{v}^*}{4\pi|\vec{r}-\vec{r}^*|}\int \,\mathrm{d}^3x' \delta \left( \vec{r}'-\vec{r}_0(t-\dfrac{|\vec{r}-\vec{r}'|}{c}) \right)
\end{align}
$$ 

with coordinate transformation $$\vec{r}'\mapsto \vec{r}^{*\prime}=\vec{r}'-\vec{r}_0(t-\frac{|\vec{r}-\vec{r}'|}{c})$$:
$$
\begin{align}
    \left\Vert \dfrac{\partial^{} \vec{r}^{*\prime}}{\partial \vec{r}^\prime} \right\Vert\Big|_{\vec{r}'=\vec{r}^*}=&\left\Vert \dfrac{\partial^{} }{\partial x_j^{}} x_i'-x_{0i}(t-\dfrac{|\vec{r}-\vec{r}'|}{c}) \right\Vert\Big|_{\vec{r}'=\vec{r}^*}=1-\dfrac{(\vec{r}-\vec{r}^*)\cdot \vec{v}^*}{|\vec{r}-\vec{r}^*|c}\\
    \int \,\mathrm{d}^3x' \delta \left( \vec{r}'-\vec{r}_0(t-\dfrac{|\vec{r}-\vec{r}'|}{c}) \right)=&\int \,\mathrm{d}^3x^{*\prime}\delta (\vec{r}^{*\prime})\left\Vert \dfrac{\partial^{} \vec{r}'}{\partial \vec{r}^{*\prime}} \right\Vert\\
    =&1\Bigg/ \left\Vert \dfrac{\partial^{} \vec{r}^{*\prime}}{\partial \vec{r}^\prime} \right\Vert\Big|_{\vec{r}'=\vec{r}^*}
\end{align}
$$ 

then we get Liénard–Wiechert Potential:
$$
\begin{align}
    \phi (\vec{r},t)=&\dfrac{q}{4\pi\varepsilon _0|\vec{r}-\vec{r}^*|}\dfrac{1}{1-\frac{(\vec{r}-\vec{r}^*)\cdot \vec{v}^*}{|\vec{r}-\vec{r}^*|c}}\\
    \vec{A} (\vec{r},t)=&\dfrac{\mu _0q\vec{v}^*}{4\pi|\vec{r}-\vec{r}^*|}\dfrac{1}{1-\frac{(\vec{r}-\vec{r}^*)\cdot \vec{v}^*}{|\vec{r}-\vec{r}^*|c}}\\
    (\vec{r}^*,\vec{v}^*,t^*):&\begin{cases}
        \vec{r}^*-\vec{r}_0(t-\frac{|\vec{r}-\vec{r}^*|}{c})=0\\
        t^*=t-\frac{|\vec{r}-\vec{r}^*|}{c}\\
        \vec{v}^*:=\vec{v}_0(t^*)
    \end{cases}
\end{align}
$$ 