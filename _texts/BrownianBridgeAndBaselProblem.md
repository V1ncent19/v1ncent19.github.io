---
layout: post
title: Brownian Bridge and Basel Problem
author: Vincent Peng
date: 2022/12/23
category: Knowledge
---

This blog originates from a question in the final exam of *Applied Stochastic Process* this semester. The question focused on the Karhunen-Loève expansion of Brownian Bridge. Soon I was surprised to find that it provides a derivation for the [Basel problem](https://en.wikipedia.org/wiki/Basel_problem):
$$
\begin{align}
    \sum_{n=1}^\infty\dfrac{1}{n^2}=\dfrac{\pi^2}{6}
\end{align}
$$ 

## Brownian Bridge and KL Expansion
A standard bridge is defined as
$$
\begin{align}
    B_t=W_t-tW_1,\quad t\in [0,1]
\end{align}
$$ 
where $$W_t$$ is a standard Wiener Process. Autocorrelation function of $$B_t$$ is
$$
\begin{align}
    R(s,t)=\min\{s,t\}-st
\end{align}
$$ 

The KL expansion is given by the Mercer's decomposition of $$R(s,t)$$
$$
\begin{align}
    R(s,t)=\sum_{i}\lambda _i\phi _i(s)\phi _i(t)
\end{align}
$$ 
in which eigen functions $$\phi _i$$s are given by
$$
\begin{align}
    \int _0^1 R(s,t)\phi _i(s) \,\mathrm{d}s = \lambda _i\phi _i(t)
\end{align}
$$ 

## My Solution in the Exam
Here I post my solution in the exam: substitute in the expression of $$R(s,t)$$
$$
\begin{align}
    \lambda _i\phi _i(t)=&\int _0^1 (\min\{s,t\}-st)\phi _i(s) \,\mathrm{d}s\\
    =&\int _0^t s\phi _i(s) \,\mathrm{d}s + t\int _t^1 \phi _i(s) \,\mathrm{d}s   - t\int _0^1 s\phi _i(s) \,\mathrm{d}s
\end{align}
$$ 
take differentiation $$\dfrac{\mathrm{d}^{} }{\mathrm{d}t^{}}$$ to get
$$
\begin{align}
    \lambda _i\dfrac{\mathrm{d}^{} }{\mathrm{d}t^{}}\phi_i(t)=& t\phi _i(t) + \left( \int _t^1\phi _i(s) \,\mathrm{d}s + t\phi _i(t) \right) - \int _0^1 s\phi _i(s) \,\mathrm{d}s\\
    =&\int _t^1\phi _i(s) \,\mathrm{d}s - \int _0^1 s\phi _i(s) \,\mathrm{d}s
\end{align}
$$ 
one more differentiation $$\dfrac{\mathrm{d}^{} }{\mathrm{d}t^{}}$$
$$
\begin{align}
    \lambda _i\dfrac{\mathrm{d}^{2} }{\mathrm{d}t^{2}}\phi _i(t) = -\phi _i(t)
\end{align}
$$ 
with boundary condition $$\phi _i(0)=\phi _i(1)=0$$, which has solution
$$
\begin{align}
    \phi _n(t)=\sqrt{2}\sin(n\pi t),\quad \lambda _n=\left(\dfrac{1}{n\pi}\right)^2
\end{align}
$$ 
i.e. the Mercer expansion is
$$
\begin{align}
    R(s,t) = \min\{s,t\}-st = \sum_{n=1}^\infty \dfrac{2}{n^2\pi^2}\sin(n\pi s)\sin(n\pi t)
\end{align}
$$ 

## Basel Problem
What makes it interesting is that we can consider the function value $$R(1/2,1/2)$$
$$
\begin{align}
    R(\dfrac{1}{2},\dfrac{1}{2})=\dfrac{1}{4}=&\sum_{n=1}^\infty \dfrac{2}{n^2\pi^2}\sin(\dfrac{n\pi}{2})\sin(\dfrac{n\pi}{2})\\
    =&\sum_{n\in\text{odd}}^\infty \dfrac{2}{n^2\pi^2}\\
    =&\dfrac{2}{\pi^2}\left(\dfrac{1}{1^2}+\dfrac{1}{3^2}+\dfrac{1}{5^2}+\ldots \right)
\end{align}
$$ 

On the other hand notice that
$$
\begin{align}
    \dfrac{1}{4}\sum_{n=1}^\infty \dfrac{1}{n^2} = \sum_{n=1}^\infty \dfrac{1}{(2n)^2}=\left(\dfrac{1}{2^2}+\dfrac{1}{4^2}+\dfrac{1}{6^2}+\ldots \right)
\end{align}
$$ 
we have
$$
\begin{align}
    \sum_{n=1}^\infty \dfrac{1}{n^2}-\dfrac{1}{4}\sum_{n=1}^\infty \dfrac{1}{n^2} = & \left(\dfrac{1}{1^2}+\dfrac{1}{2^2}+\dfrac{1}{3^2}+\ldots \right) - \left(\dfrac{1}{2^2}+\dfrac{1}{4^2}+\dfrac{1}{6^2}+\ldots \right)\\
    =&\left(\dfrac{1}{1^2}+\dfrac{1}{3^2}+\dfrac{1}{5^2}+\ldots \right)=\dfrac{\pi^2}{8}\\
    \Rightarrow \sum_{n=1}^\infty \dfrac{1}{n^2}=& \dfrac{4}{3}\dfrac{\pi^2}{8} = \dfrac{\pi^2}{6}
\end{align}
$$ 

## Appendix: Euler's Method
Euler studied the function $$\mathrm{sinc} \pi t=\dfrac{\sin \pi t}{\pi t}$$, which has roots at $$\pm 1,\pm 2,\pm 3,\ldots$$, 
which means the polynomial form of $$\mathrm{sinc}\pi t$$ should looks like
$$
\begin{align}
    \dfrac{\sin \pi t}{\pi t} =& (1+t)(1-t)(1+\dfrac{t}{2})(1-\dfrac{t}{2})\ldots\\
    =&(1-t^2)(1-\dfrac{t^2}{4})\ldots \\
    =&1- t^2\sum_{n=1}^\infty \dfrac{1}{n^2} + o(t^2)
\end{align}
$$ 
according to taylor series, it should also have expansion of the form
$$
\begin{align}
    \dfrac{\sin \pi t}{\pi t} =&\dfrac{\pi t - \dfrac{1}{6}(\pi t)^3 + o(t^3)}{\pi t} = 1 - \dfrac{\pi^2}{6}t^2+o(t^2)
\end{align}
$$ 
by comparing the $$t^2$$ term we obtain that
$$
\begin{align}
    \sum_{n=1}^\infty \dfrac{1}{n^2} = \dfrac{\pi^2}{6}
\end{align}
$$ 