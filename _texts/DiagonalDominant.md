---
layout: post
title: Positive-Definition of Diagonal Dominant Matrix
author: Vincent Peng
date: 2021/10/20
category: Knowledge
---

Positive semi-definition of **Diagonal Dominant Matrix** (with non-negative diagonal) is an important property in numeric linear algebra. Here I record two prooves, one following the idea of *Gershgorin Circle Theorem*, the other is a proof for the weakened version of *strictly* diagonal dominance. 

A diagonal dominant matrix $$A=\{a_{ij}\}_{i,j=1}^n$$ satisties
$$
\begin{align}
    \vert a_{ii}\vert \geq \sum_{j\neq i}\vert a_{ij}\vert ,\quad \forall i
\end{align}
$$ 

### Gershgorin Circle Theorem

The eigen vector $$x$$ with eigen value $$\lambda $$, say $$x_i$$ is the element with largest absolute value.
$$
\begin{align}
    \sum_{j=1}^na_{ij}x_{j}=\lambda x_i\Rightarrow \vert (\lambda -a_{ii})\vert =&\left\vert \sum_{j\neq i}\dfrac{a_{ij}x_j}{x_i}\right\vert \leq \sum_{j\neq i} \left\vert a_{ij}\right\vert \left\vert \dfrac{x_{j}}{x_i}\right\vert \\
    \leq& \sum_{j\neq i}\vert a_{ij}\vert 
\end{align}
$$ 

i.e. $$\lambda $$ lies in one of the Gershgorin disks:
$$
\begin{align}
    \lambda \in \Cup_{i=1}^n \mathrm{Disc}\left( a_{ii}; R_i=\sum_{j\neq i}\vert a_{ij}\vert  \right) 
\end{align}
$$ 

Immediately we would find that for diagonal dominant matrix with non-negative diagonal elements, all eigen vectors would be non-negative, thus $$A$$ is positive semi-definite.
$$
\begin{align}
    a_{ii}-\lambda \leq \vert \lambda -a_{ii}\vert \leq \sum_{j\neq i}\vert a_{ij}\vert \Rightarrow \ \lambda \geq \vert a_{ii}\vert -\sum_{j\neq i}\vert a_{ij}\vert \geq 0
\end{align}
$$ 

### Another Interesting Proof for Strictly Diagonal Dominant

*Strictly Diagonal Dominant Matrix:*

$$
\begin{align}
    \vert a_{ii}\vert >\sum_{j\neq i}\vert a_{ij}\vert ,\quad \forall i
\end{align}
$$ 

A strictly diagonal dominant matrix is non-singular: Assume there $$\exists x, s.t. Ax=0$$, with $$x_i$$ the element with largest absolute value, then follows similar idea as in Gershgorin thm.:
$$
\begin{align}
    \sum_{j=1}^na_{ij}x_j=0\Rightarrow \vert a_{ii}\vert =\left\vert \sum_{j\neq i} \dfrac{a_{ij}x_j}{x_i} \right\vert \leq \sum_{j\neq i}\vert a_{ij}\vert 
\end{align}
$$ 

which contradicts with strict diagonal dominance, thus $$A$$ is non-singular. i.e. $$\vert A\vert \neq 0$$

Further consider matrix $$A+\tau I$$, which is also strictly diagonal dominant, thus $$\vert A+\tau I\vert \neq 0$$. Consider the function
$$
\begin{align}
    \phi (\tau):=\vert A+\tau I\vert \neq 0,\quad \forall \tau\geq 0
\end{align}
$$ 

Naturally $$\phi (\tau)$$ should be continuous, and $$\lim_{\tau\to\infty}\phi(\tau)>0$$, which would indicate that 
$$
\begin{align}
    \phi (0)=\vert A\vert >0
\end{align}
$$ 

Notice that all the *sequential principal minor* $$D_i$$s of $$A$$ are still strictly diagonal dominant, thus $$\vert D_i\vert >0$$, $$\forall i=1,2,\ldots,n$$. Thus $$A$$ is positive definite.