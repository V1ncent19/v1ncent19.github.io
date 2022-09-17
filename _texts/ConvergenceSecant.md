---
layout: post
title: Convergence Order 1.618 of Secant Interpolation Rooting
author: Vincent Peng
date: 2021/11/15
category: Knowledge
---

## Recap

### Convergence Order

For some iteration algorithm $$x^{(t+1)}=g\left( x^{(t)} \right)$$ with final solution denoted $$x^*$$, error $$\varepsilon ^{(t)}:=x^{(t)}-x^*$$, its convergence order $$\alpha $$ and converngence rate $$c$$:
$$
\begin{align}
    \lim_{t\to\infty}\dfrac{|\varepsilon ^{(t+1)}|}{|\varepsilon ^{(t)}|^\alpha }=c
\end{align}
$$ 

### Secant Interpolation for Rooting:

In rooting $$f(x)$$, with initial points $$x^{(-1)}$$, $$x^{(0)}$$ set, root of secant interpolation in each step $$(t)$$ is:
$$
\begin{align}
        x^{(t+1)}=\dfrac{x^{(t-1)}f\left( x^{(t)} \right)-x^{(t)}f\left( x^{(t-1)} \right)}{f\left( x^{(t)} \right)-f\left( x^{(t-1)} \right)}
\end{align}
$$ 

## Deduction:

Taylor series of $$f(x)$$ at $$x^*$$ to the second order is:
$$
\begin{align}
    f(x)=f'(x^{*})(x-x^{*})+\dfrac{1}{2}f''(x^{*})\left(x-x^{*}\right)^2
\end{align}
$$

substitute in secant rooting
$$
\begin{align}
x^{(t+1)}=\dfrac{x^{(t-1)}f(x^{(t)})-x^{(t)}f(x^{(t-1)})}{f(x^{(t)})-f(x^{(t-1)})} 
\end{align}
$$

to obtain
$$
\begin{align}
  x^{(t+1)}-x^*=&\dfrac{x^{(t-1)}f(x^{(t)})-x^{(t)}f(x^{(t-1)})}{f(x^{(t)})-f(x^{(t-1)})} -x^*\\
  =&\dfrac{\left( f'x^*(x^{(t)}-x^*)+\frac{1}{2}f''(x^*)(x^{(t)}-x^*)^2 \right)(x^{(t-1)}-x^*)}{f'(x^*)(x^{(t)}-x^{(t-1)})-\frac{1}{2}f''(x^*)(x^{(t)}-x^{(t-1)})(x^{(t)}+x^{(t-1)}-2x^*)}\\
  &- \dfrac{\left( f'x^*(x^{(t-1)}-x^*)+\frac{1}{2}f''(x^*)(x^{(t-1)}-x^*)^2 \right)(x^{(t)}-x^*)}{f'(x^*)(x^{(t)}-x^{(t-1)})-\frac{1}{2}f''(x^*)(x^{(t)}-x^{(t-1)})(x^{(t)}+x^{(t-1)}-2x^*)} \\
  =&\dfrac{\frac{1}{2}f''(x^*)(x^{(t)}-x^*)(x^{(t-1)}-x^*)}{f'(x^*)-\frac{1}{2}f''(x^*)(x^{(t)}+x^{(t-1)}-2x^*)}\\
\end{align}
$$

Denote $$e^{(t)}\equiv x^{(t)}-x^*$$, take $$t\to\infty$$ to obtain
$$
\begin{align}
\dfrac{e^{(t+1)}}{e^{(t)}e^{(t-1)}}=\dfrac{f''(x^*)}{2f'(x^*)-f''(x^*)(e^{(t)}+e^{(t-1)})}\to \dfrac{f''(x^*)}{2f'(x^*)}
\end{align}
$$

Denote $$e^{(t-1)}\equiv a$$. We could first assume convergence order $$\alpha$$ and convergence rate $$c$$, then
$$
\begin{align}
  \lim_{t\to\infty}\dfrac{e^{(t+1)}}{[e^{(t)}]^\alpha }= \lim_{t\to\infty}\dfrac{e^{(t)}}{[e^{(t-1)}]^\alpha }=c\Rightarrow e^{(t+1)}=c^\alpha a^{\alpha^2},\quad e^{(t)}=ca^\alpha
\end{align} 
$$

substitute into the iteration of error
$$
\begin{align}
   \dfrac{e^{(t+1)}}{e^{(t)}e^{(t-1)}}=\lambda ^{\alpha -1}a^{\alpha ^2-\alpha -1}  =\dfrac{f''(x^*)}{2f'(x^*)}=\mathrm{const}
\end{align}
$$

Considering that $$\lim_{t\to\infty}e^{(t-1)}=0$$, there must be $${\alpha ^2-\alpha -1} =0$$, thus
$$
\begin{align}
\alpha=\frac{\sqrt{5}+1}{2}\approx 1.618
\end{align}
$$