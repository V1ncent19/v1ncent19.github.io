---
layout: post
title: Mahalanobis Distance and Leverage
author: Vincent Peng
date: 2022/10/7
category: Knowledge
---

Here's a proof of a special property of leverage in linear value $$h_{ii}=H_{ii}$$. I found that it contains some interesting facts about leverage, and can give us some intuition about influential diagnosis.

Recall the Mahalanobis distance from a data point $$x$$
$$
\begin{align}
    d_{\mathrm{M} }(x):=\sqrt{(x-\mu )'S^{-1}(x-\mu )}
\end{align}
$$ 

In linear regression model **with intercept**, $$x_{i}=(1,x_{i1},x_{i2},\ldots,x_{ip}) $$, $$i=1,2,\ldots,n$$, and the `variance matrix' in this case is $$\mathop{S}\limits_{(p+1)\times (p+1)} $$. With such notation we can prove that
$$
\begin{align}
    d_\mathrm{M}(x_i)^2=(n-1)(h_{ii}-\dfrac{1}{n}) 
\end{align}
$$ 

***Matrix Notation***

- Vector of size $$n\times 1$$ with only one element 1 at position $$i$$, with others 0
$$
\begin{align}
    l_{n,i}=\begin{bmatrix}
        0\\0\\ \vdots\\ 1\\ \vdots\\ 0
    \end{bmatrix}_{n\times 1}
\end{align}
$$ 
- All one vector of size $$n\times 1$$
$$
\begin{align}
    \mathbf{1}_n=\begin{bmatrix}
        1\\1\\ \vdots\\ 1
    \end{bmatrix}_{n\times 1}
\end{align}
$$ 
- All one matrix $$\mathcal{J}_n$$ of size $$n\times n$$
$$
\begin{align}
    \mathcal{J}_n=\begin{bmatrix}
        1&1&\ldots &1\\1&1&\ldots &1\\ \vdots &\vdots &\ddots&\vdots&\\ 1&1&\ldots &1
    \end{bmatrix}_{n\times n}
\end{align}
$$ 

***proof:***

We need the following lemma
$$
\begin{align}
    (A+B)^{-1}=A^{-1}-\dfrac{A^{-1}BA^{-1}}{1+tr(BA^{-1})},\quad \mathrm{rank}(B)=1 
\end{align}
$$ 

For clarity, symbols like $$X'_{1,:}$$ means $$X'_{1,:}\equiv (X')_{1,:}=(X_{:,1})'$$

Note that $$X_{:,1}=\mathbf{1}_n$$, then we could obtain that e.g. 
- $$(X'X)^{-1}X'X_{:,1}=[1,0,\ldots,0]'_{(p+1)\times 1}$$, and
- $$\mathcal{J}_n=X'_{1,:}X_{:,1}$$, and
- $$Xl_{(p+1),1}=\mathbf{1}_n$$, and
- $$l_{(p+1),1}'x_i=1$$, etc.


With above notation, we could express $d_{\mathrm{M}}$ in terms of $X$:
$$
\begin{align}
    \dfrac{d_\mathrm{M}(x_i)^2 }{n-1}=&(x_i-\bar{x})'\left[(n-1)S\right]^{-1}(x_i-\bar{x})\\
    =&\left(x_i'- \dfrac{1}{n}X'_{1,:}X\right) \left[ (X-\dfrac{1}{n}\mathcal{J}_nX)'(X-\dfrac{1}{n}\mathcal{J}_nX)  \right]^{-1} \left(x_i- \dfrac{1}{n}X'X_{:,1}\right)\\
    =&\left(x_i'- \dfrac{1}{n}X'_{1,:}X\right) \left[ X'X-\dfrac{1}{n}X'\mathcal{J}_nX  \right]^{-1} \left(x_i- \dfrac{1}{n}X'X_{:,1}\right)\\
    =&\left(x_i'- \dfrac{1}{n}X'_{1,:}X\right) \left[ (X'X)^{-1}+\dfrac{\dfrac{1}{n}(X'X)^{-1}X'\mathcal{J}_nX(X'X)^{-1}}{1-\dfrac{1}{n}tr\left(X'\mathcal{J}_nX(X'X)^{-1}\right)}  \right] \left(x_i- \dfrac{1}{n}X'X_{:,1}\right)
\end{align}
$$ 

in which
$$
\begin{align}
    \left(x_i'- \dfrac{1}{n}X'_{1,:}X\right)  (X'X)^{-1} \left(x_i- \dfrac{1}{n}X'X_{:,1}\right)=&h_{ii}-\dfrac{2}{n}X'_{1,:}X(X'X)^{-1}x_i+\dfrac{1}{n^2}X'_{1,:}X(X'X)^{-1}X'X_{:,1}\\
    =&h_{ii}-\dfrac{2}{n}l_{(p+1),1}'x_i+\dfrac{1}{n^2}l'_{(p+1),1}X'X_{:,1}\\
    =&h_{ii}-\dfrac{2}{n}+\dfrac{1}{n^2}\mathbf{1}_n'\mathbf{1}_n\\
    =&h_{ii}-\dfrac{1}{n}
\end{align}
$$ 

and 
$$
\begin{align}
    &\left(x_i'- \dfrac{1}{n}X'_{1,:}X\right) {\dfrac{1}{n}(X'X)^{-1}X'\mathcal{J}_nX(X'X)^{-1}}   \left(x_i- \dfrac{1}{n}X'X_{:,1}\right)\\
    =&\left(x_i'- \dfrac{1}{n}X'_{1,:}X\right) {\dfrac{1}{n}(X'X)^{-1}X'X_{:,1}X_{1,:}'X(X'X)^{-1}}   \left(x_i- \dfrac{1}{n}X'X_{:,1}\right)\\
    =&\dfrac{1}{n}\left(x_i'- \dfrac{1}{n}X'_{1,:}X\right) l_{(p+1),1}l_{(p+1),1}'   \left(x_i- \dfrac{1}{n}X'X_{:,1}\right)\\
    =&\dfrac{1}{n}\left[ 1-\dfrac{2}{n}X'_{1,:}\mathbf{1}_{n}+\dfrac{1}{n^2}X'_{1,:}\mathbf{1}_{n}\mathbf{1}_{n}'X_{:,1} \right]\\
    =&\dfrac{1}{n}[1-2+1]=0
\end{align}
$$ 

Then we obtain that
$$
\begin{align}
    \dfrac{d_\mathrm{M}(x_i)^2 }{n-1}=&h_{ii}-\dfrac{1}{n}\Leftrightarrow d_\mathrm{M}(x_i)^2=(n-1)(h_{ii}-\dfrac{1}{n})
\end{align}
$$ 

#### Comment
- Actually the proof here is a bit tricky, because if you look at the denominator, you will find that
$$
\begin{align}
    1-\dfrac{1}{n}tr\left(X'\mathcal{J}_nX(X'X)^{-1}\right)=&1-\dfrac{1}{n}tr \left( X'\mathbf{1}_n\mathbf{1}_n' X(X'X)^{-1}\right)\\
    =&1-\dfrac{1}{n}tr \left(\mathbf{1}_nX'_{1,:} X(X'X)^{-1} X'\right)\\
    =&1-\dfrac{1}{n}tr \left(\mathbf{1}_nl_{(p+1),1}' X'\right)\\
    =&1-\dfrac{1}{n}tr \left(\mathbf{1}_n\mathbf{1}_n'\right)=0
\end{align}
$$ 

which means that the term concerning $$(\ldots )\dfrac{\dfrac{1}{n}(X'X)^{-1}X'\mathcal{J}_nX(X'X)^{-1}}{1-\dfrac{1}{n}tr\left(X'\mathcal{J}_nX(X'X)^{-1}\right)}(\ldots )$$ is actually something like $$\dfrac{0}{0}$$ (lol).

- Note that $$\mathrm{L.H.S.}$$ of the equation is non-negative, which is an evidence of the property of leverage
$$
\begin{align}
    h_{ii}\geq \dfrac{1}{n}
\end{align}
$$ 
- Mahalanobis distance measures the deviation of $$x$$, with the distribution variance considered. i.e. here we see that large leverage is proportional to large $$d_\mathrm{M}$$, which conform to our intuition that `leverage' detects abnormal $$x_i$$.