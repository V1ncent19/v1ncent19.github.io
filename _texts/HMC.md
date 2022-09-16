<!-- ---
layout: post
title: Hamiltonian Markov Chain Monte Carlo
author: Vincent Peng
date: 2021/12/21
category: Knowledge
---


$$
\begin{align}
    [f]=&-\dfrac{1}{\beta }\left\{ \lim_{n\to 0}\lim_{N\to\infty}\dfrac{[Z^n]-1}{nN} \right\}\\
    =&-\dfrac{1}{\beta }\left\{ \lim_{n\to 0}\lim_{N\to\infty}\dfrac{\exp\left\{ N\Xi \right\}-1}{nN} \right\}\\
    \mathop{=}\limits_{N\Xi\to 0}^{} &-\dfrac{1}{\beta }\lim_{n\to 0}\dfrac{\Xi}{n}\\
    =&\dfrac{1}{\beta }\left\{ \dfrac{\beta ^2J^2}{4n}\sum _{\alpha \neq \beta }q^2_{\alpha \beta }+\dfrac{\beta J_0}{2n}\sum_\alpha m_\alpha ^2-\dfrac{1}{4}\beta ^2J^2-\dfrac{1}{n}\log\sum_{\{S^\alpha \}_{\alpha =1}^n} e^L  \right\}\\
    L=& \beta ^2J^2\sum_{\alpha <\beta }q_{\alpha \beta }S^\alpha S^\beta +\beta \sum_\alpha  (J_0m_\alpha +h)S^\alpha \tag{2.15-17}\\
    w.r.t.&\,q_{\alpha \beta },m_\alpha =\mathop{\arg\max}\limits_{q_{\alpha \beta },m_\alpha }\Xi(q_{\alpha \beta },m_\alpha ) /n
\end{align}
$$ 


$$
\begin{aligned}
    =&\dfrac{1}{\beta }\left\{ \dfrac{\beta ^2J^2}{4n}\sum _{\alpha \neq \beta }q^2_{\alpha \beta }+\dfrac{\beta J_0}{2n}\sum_\alpha m_\alpha ^2-\dfrac{1}{4}\beta ^2J^2-\dfrac{1}{n}\log\sum_{\{S^\alpha \}_{\alpha =1}^n} e^L  \right\}
\end{aligned}
$$  -->