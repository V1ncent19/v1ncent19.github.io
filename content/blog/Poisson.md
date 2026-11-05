---
layout: post
title: Derivation of Poisson Distribution
author: Vincent Peng
date: 2022/9/19
category: Knowledge
---

Here I record two ways to derive Poisson distribution. A Poisson process is the number of events $$\{N(t),t\geq 0\}$$ in some given time $$[0,t]$$, with the following property:
- A point process with $$0$$ origin
$$
\begin{align}
    N(0)=0,\quad N(t)\geq 0,\, \forall t
\end{align}
$$  
- Independent increment
$$
\begin{align}
    &N(t_1)\perp\!\!\!\perp N(t_2)-N(t_1)\perp\!\!\!\perp,\ldots,\perp\!\!\!\perp N(t_m)-N(t_{m-1}),\\
    &\quad \forall\, 0<t_1<t_2<\ldots<t_m ,\quad \forall m
\end{align}
$$ 
- Stationary increment
$$
\begin{align}
    \mathbb{P}\left( N(s+t)-N(s)=n \right) =\mathbb{P}\left( N(t)=n \right) ,\quad \forall\, s,t\geq 0,\,n\geq 0
\end{align}
$$ 
- Linear increment: for $$\delta t$$ small enough
$$
\begin{align}
    \begin{cases}
        \mathbb{P}\left( N(t+\delta t)-N(t)=1 \right)=\lambda \delta t+o(\delta t)\\
        \mathbb{P}\left( N(t+\delta t)-N(t)\geq 2 \right)  =o(\delta t)
    \end{cases}
\end{align}
$$ 

Distribution of $$N(t)$$:
$$
\begin{align}
    \mathbb{P}\left( N(s+t)-N(s)=k \right)=\mathbb{P}\left( N(t)=k \right)=\dfrac{(\lambda t)^k}{k!} e^{-\lambda t}\sim P(\lambda t) 
\end{align}
$$ 

## Proof 1

We divide $$[0,t]$$ into $$M$$ pieces with $$M\to \infty$$:
$$
\begin{align}
    \mathbb{P}\left( N(t)=k \right)=&\lim_{M\to \infty}\binom{M}{k}\left( \lambda \dfrac{t}{M} \right)^k\left(1-\lambda \dfrac{t}{M}\right)^{M-k} \\
    =&\dfrac{(\lambda t)^k}{k!}\lim_{M\to \infty}\left[\left( 1-\dfrac{\lambda t}{M} \right)^{M/\lambda t}\right]^{\lambda t}\dfrac{M!}{(M-k)!(M-\lambda t)^k}\\
    =&\dfrac{(\lambda t)^k}{k!}e^{-\lambda t}
\end{align}
$$ 

Note: this proof is not quite rigorous, but it's straight enough. I would say it's rather a "physicist's method" (lol).

## Proof 2

For convenience, denote that $$\mathbb{P}\left( N(t)=n \right):=P_n(t)$$. For a small $$h\to 0$$, we consider the process from $$t\to t+h$$. First focus on a special case $n=0$:
$$
\begin{aligned}
    P_0(t+h)=&\mathbb{P}\left( N(t+h)=0 \right)\\
    =&\mathbb{P}\left( N(t)=0 \right) (1-\lambda h)
\end{aligned}
$$ 
i.e. note that $P_0(0)=1$
$$
\begin{align}
    P_0'(t)=\lim_{h\to 0}\dfrac{P_0(t+h)-P_0(t)}{h}=-\lambda \Rightarrow P_0(t)=e^{-\lambda t}
\end{align}
$$ 

Then focus on $n\geq 1$. We could use mathematical induction to obtain all $n\geq 1$ cases:
$$
\begin{align}
    \{N(t+h)=n\}=&\{N(t)=n,\,N(t+h)-N(t)=0\}\\
    &\bigcup \{N(t)=n-1,\,N(t+h)-N(t)=1\}\\
    &\bigcup_{l=2}^n \{N(t)=n-l,\,N(t+h)-N(t)=l\} 
\end{align}
$$ 

those $$l\geq 2$$ term would be with $$\mathbb{P}(\, \cdot \, )\sim o(h)$$. Then
$$
\begin{align}
    \mathbb{P}\left( N(t+h)=n \right)=& \mathbb{P}\left( N(t)=n \right)(1-\lambda h)+\mathbb{P}\left( N(t)=n-1 \right)\lambda h
\end{align}
$$ 

i.e. 
$$
\begin{align}
    P_n'(t)=\lim_{h\to 0}\dfrac{\mathbb{P}\left( N(t+h)=n \right)-\mathbb{P}\left( N(t)=n \right)  }{h}=-\lambda P_n(t)+\lambda P_{n-1}(t)
\end{align}
$$ 

with initial condition
$$
\begin{align}
    P_n(0)=\mathbb{P}\left( N(0)=n \right) =\delta _{n,0}
\end{align}
$$ 

Solution to the above differential equation is
$$
\begin{align}
    &\dfrac{\mathrm{d}^{} e^{\lambda t}P_n(t)}{\mathrm{d}t^{}}=\lambda e^{\lambda t}P_{n-1}(t),\quad P_0(t)=e^{-\lambda t}\\
    \Rightarrow &\mathbb{P}\left( N(t)=k \right)= P_k(t)=\dfrac{(\lambda t)^{k}}{k!}e^{-\lambda t}
\end{align}
$$ 