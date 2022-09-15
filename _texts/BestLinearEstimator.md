---
layout: post
title: Best Linear Estimator
author: Vincent Peng
date: 2022/04/10
category: Knowledge
---

Theoretically best linear estimator is crucial in definition of Partial Autocorrelation in time series. It provides an estimation with correlated variable considered.
$$
\begin{align}
    L({X}_\tau|X_1,X_2,\ldots,X_n)=&\beta _0+X_{1}\beta _1+X_2\beta _2+\ldots+X_n\beta _n=\beta _0+X'\beta \\
    \{\beta _0,\beta \}=&\mathop{\arg\min}\limits_{\beta _0,\beta } \mathbb{E}_{X_\tau,X}\left[  \left( X_\tau-L({X}_\tau|X_1,X_2,\ldots,X_n) \right)^2\right]  \\
\end{align}
$$ 

Express equation $(2)$ in terms of $\mathbb{E}$ and $\Sigma _{\cdot ,\cdot }$:
$$
\begin{aligned}
    \mathbb{E}_{X_\tau,X}\left[  \left( X_\tau- L(X_\tau|X) \right)^2 \right]=&\mathbb{E}\left( X_\tau^2 \right) -2\mathbb{E}\left( X_\tau(\beta _0+ X'\beta ) \right) +\mathbb{E}\left( (\beta _0+X'\beta )^2 \right) \\
    =&\Sigma _{X_\tau}+\mathbb{E}\left( X_\tau \right)^2\\
    &-2\beta _0\mathbb{E}\left( X_\tau \right) -2\left( \Sigma_{X,X_\tau}+\mathbb{E}\left( X_\tau \right) \mathbb{E}\left( X \right) \right)'\beta  \\
    &+\beta _0^2+2\beta _0\mathbb{E}\left( X \right)'\beta  +\beta '\left( \Sigma _X+\mathbb{E}\left( X \right) \mathbb{E}\left( X \right) ' \right)\\
\end{aligned}
$$ 

where $$\Sigma _{X,X_\tau}=cov(X,X_\tau)$$


Its minimun w.r.t. $\{\beta _0,\beta \}$ obtained by zero-gradient:
$$
\begin{align}
    0=&\begin{cases}
        \dfrac{\partial^{} }{\partial \beta _0^{}}=-2\mathbb{E}\left( X_\tau  \right) +2\beta _0+2\mathbb{E}\left( X \right) '\beta \\
        \dfrac{\partial^{} }{\partial \beta ^{}}=-2(\Sigma _{X,X_\tau}+\mathbb{E}\left( X_\tau  \right) \mathbb{E}\left( X \right) )+2\beta _0\mathbb{E}\left( X \right) +2(\Sigma _{X}+\mathbb{E}\left( X \right) \mathbb{E}\left( X \right) ')
    \end{cases}\\
    \Rightarrow &\begin{cases}
        \beta _0=\mathbb{E}\left( X_\tau  \right) -\mathbb{E}\left( X \right) '\beta \\
        \beta =\Sigma _{X}^{-1}\Sigma _{X,X_\tau}
    \end{cases}
\end{align}
$$ 

i.e. Best linear estimator
$$
\begin{align}
    \hat{X}_\tau=L(X_\tau|X_1,X_2,\ldots,X_n)=\mathbb{E}\left( X_\tau  \right) +(X-\mathbb{E}\left( X \right) )'\Sigma _X\Sigma _{X,X\tau}
\end{align}
$$ 

in weak stationary time series with $\mathbb{E}\left[ X_t \right]=0,\,\gamma _k,\Gamma _k$:
$$
\begin{align}
    L(X_{t+k}|X_{t},X_{t+1},\ldots,X_{t+k-1})=X_{t+k-1:t}'\Gamma _{k-1}^{-1}\gamma _{k-1}
\end{align}
$$ 