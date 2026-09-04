---
layout: post
title: Basic Constrained Optimize Theory
author: Vincent Peng
date: 2022/3/28
category: Knowledge
---



## Primal Problem



For optimize problem in convex set $$ \mathcal{X} $$
$$
\begin{align}
\mathop{\arg\min}\limits_{x\in\mathcal{X}}\quad &f(x)\tag{P}\\
s.t.\quad   &g_i(x)\leq 0,\quad i=1,2,\ldots,k\\
& h_j(x)=0,\quad j=1,2,\ldots,l
\end{align}
$$

which is called the **primal problem** for optimization.

The **generalized Lagrange function** for primal problem is defined as
$$
\begin{align}
\mathcal{L}(x,\kappa ,\lambda )\equiv& f(x)+\sum_{i=1}^k\kappa _ig_i(x)+\sum_{j=1}^l\lambda _jh_j(x) \\
w.r.t. \quad&\kappa _i\geq 0,\quad i=1,2,\ldots,k
\end{align}   
$$

Comment: here the constraint $\kappa _i\geq 0$ suggest that, if $g_i(x)<0$, then a $\kappa_i\to\infty$ would result in $\mathcal{L}\to -\infty$, which cannot be minimized. This is how $\kappa _i\geq 0$ helps keep the constraints.

and we could further define a function of $$ x $$:
$$
\begin{align}
\theta _P(x)\equiv& \mathop{\max}\limits_{\kappa ,\lambda :\kappa _i\geq 0}\mathcal{L}(x,\kappa ,\lambda ) =\begin{cases}
f(x)&\text{constraint } g,\,h \text{ satisfied}\\
+\infty &\text{contraint unsatisfied}
\end{cases}
\end{align}
$$

which means we can give the solution value of primal problem (P) simply by minimizing $$ \theta _P(x) $$, minimum denoted $$ p^* $$
$$
    \begin{align}
    p^* \equiv \mathop{\min}\limits_{x}\theta _P(x)=\mathop{\min}\limits_{x}  \mathop{\max}\limits_{\kappa ,\lambda :\kappa _i\geq 0}\mathcal{L}(x,\kappa ,\lambda )
    \end{align}
$$


## Dual problem


Similar to primal problem, we can define a function of $$ \kappa ,\lambda  $$:
$$
\begin{align}
\theta _D(\kappa ,\lambda )\equiv&\mathop{\min}\limits_{x} \mathcal{L}(x,\kappa ,\lambda )
\end{align}
$$

and similarly get the **dual problem** of primal, value denoted $$ d^* $$
$$
\begin{align}
d^*\equiv\max_{\kappa ,\lambda :\kappa \geq 0}\theta _D(\kappa ,\lambda )=\max_{\kappa ,\lambda :\kappa \geq 0}\mathop{\min}\limits_{x} \mathcal{L}(x,\kappa ,\lambda )
\end{align} 
$$

it is obvious that 
$$
\begin{align}
d^*= \max_{\kappa ,\lambda :\kappa \geq 0}\mathop{\min}\limits_{x} \mathcal{L}(x,\kappa ,\lambda ){\color{red}\leq }\mathop{\min}\limits_{x}  \mathop{\max}\limits_{\kappa ,\lambda :\kappa _i\geq 0}\mathcal{L}(x,\kappa ,\lambda )=p^*
\end{align}
$$

## Karush-Kuhn-Tucker Condition (KKT Condition)


KKT condition to allow $$ d^*=p^* $$ at $$ (x^*,\kappa ^*,\lambda ^*) $$: in the case that

- $$ f(x) $$ and $$ g_i(x) $$ are convex
- $$ h_j(x) $$ in the form of affine function $$ A_jx+b $$
- $$ g_i(x) $$ are feasible constraints

then $$ \mathrm{KKT}\,\Leftrightarrow\, p^*=d^*=\mathcal{L}(x^*,\kappa ^*,\lambda ^*)  $$. The KKT conditions are:
$$
\begin{align}
&\nabla_x\mathcal{L}(x^*,\kappa ^*,\lambda ^*)=0&\\
&\kappa ^*_ig_i(x^*)=0&i=1,2,\ldots,k\\
&g_i(x^*)\leq 0&i=1,2,\ldots,k\\
&\kappa _i\geq 0&i=1,2,\ldots,k\\
&\lambda _j(x^*)=0&j=1,2,\ldots,l
\end{align}
$$


    
    