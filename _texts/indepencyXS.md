---
layout: post
title: Indepency between $\bar{X}$ and $S^2$
author: Vincent Peng
date: 2020/11/24
category: Knowledge
---

Data is given as $\mathcal{D}=\{X_i\}_{i=1}^n$, with $X_i$ i.i.d. $\sim N(\mu ,\sigma ^2)$. Two crucial statistics are mean value $\bar{X}$ and variance $S^2_X$:
$$
\begin{align}
    \bar{X}=&\dfrac{1}{n}\sum_{i=1}^nX_i\\
    S_X^2=&\dfrac{1}{n-1}\sum_{i=1}^n(X_i-\bar{X})^2
\end{align}
$$ 

Here's the proof for their indepency, which is important for further construction of tests. 

***Proof:***

1. Stadardization would not change (in)dependency relation. Denote $Z=(Z_1,\ldots,Z_n)'$ for standardized variable
$$
\begin{align}
    Z_i=&\dfrac{X_i-\mu }{\sigma }\sim N(0,1),\quad \forall i=1,2,\ldots,n\\
    \bar{Z}=&\dfrac{1}{n}\sum_{i=1}^nZ_i\\
    S^2=&\dfrac{1}{n-1}\sum_{i=1}^n(Z_i-\bar{Z})^2
\end{align}
$$ 

i.e. $Z\sim N_n(0,I)$
2. Construct a orthonormal linear transformation $A$, in which the first row is $(\frac{1}{\sqrt{n}},\ldots,\frac{1}{\sqrt{n}})$, i.e. $A'A=AA'=I$, then we could further define $Y:=AZ$. $Y\sim N_n(A0,A'IA)=N_n(0,I)$
3. Express $\bar{Z}$ and $S^2$ in terms of $Y$:
$$
\begin{align}
    \sqrt{n}\bar{Z}=&\dfrac{1}{\sqrt{n}}\sum_{i=1}^nZ_i=Y_1\\
    (n-1)S^2=&\sum_{i=1}^n(Z_i-\bar{Z})^2=Z'Z-n\bar{Z}^2\\
    =&(A'Y)'(A'Y)-Y_1^2=Y'Y-Y_1^2\\
    =&\sum_{i=2}^nY_i^2 \perp\!\!\!\perp Y_1=\sqrt{n}\bar{Z}
\end{align}
$$ 
4. i.e. we have independency between $\bar{X}$ and $S_X^2$:
$$\bar{X}\perp\!\!\!\perp S_X^2$$



Comment: Normal distribution is the most important distribution (because CLT indicates that it's the large sample asymptotic distribution). Under such condition we find that mean value and variance are independent. 

Further we could obtain their distribution for $X_i $ i.i.d. $\sim N(\mu ,\sigma ^2)$:
$$
\begin{aligned}
    &\dfrac{\sqrt{n}(\bar{X}-\mu )}{\sigma }\sim N(0,1)\\
    &\dfrac{(n-1)S^2}{\sigma ^2}\sim \chi^2_{n-1}
\end{aligned}
$$ 

and independency allows we to, e.g. use $\hat{\sigma }^2=S^2$ to construct pivot variable like
$$
\begin{aligned}
    T=\dfrac{\sqrt{n}(\bar{X}-\mu )}{S}\sim t_{n-1}
\end{aligned}
$$  