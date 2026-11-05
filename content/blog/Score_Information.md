---
layout: post
title: Proof Two Properties of Log-Likelihood
author: Vincent Peng
date: 2020/11/30
category: Knowledge
---

## Likelihood Function, Score and Fisher Information

Given data $\mathcal{D}=\{x\}_{i=1}^N $ and statistics model $ X\sim \mathscr{F} = \{ f(x;\theta ):\theta \in\Theta \}$. Maximum Likelihood Estimation (MLE) is an important approach to estimation of $\theta $, in which likelihood function and log-likelihood are defined as:
$$ 
\begin{align}
    L(\theta;\mathcal{D} )=\prod_{i=1}^N f(x_i;\theta ),\qquad \ell(\theta ;\mathcal{D})=\log L(\theta;\mathcal{D} )=\sum_{i=1}^N \log f(x_i;\theta ) 
\end{align}
$$ 

Score Function is derivative of log-likelihood:
$$
\begin{align}
    S(\theta ):=\dfrac{\partial^{} \ell(\theta )}{\partial \theta ^{}}
\end{align}
$$ 

Fisher Information is the expectation of squared score:
$$
\begin{align}
    I(\theta ):=\mathbb{E}\left( \dfrac{\partial^{} \ell}{\partial \theta ^{}}\dfrac{\partial^{} \ell}{\partial \theta ^{T}}\right)
\end{align}
$$ 

----------

### Property 1: $\mathbb{E}_x[S(\theta;x )|\theta ]=0$

***proof:***
$$
\begin{align}
    \mathbb{E}_x(S|\theta)=&\int f(\vec{x};\theta ) \dfrac{\partial^{} \ln f(\vec{x};\theta )}{\partial \theta ^{}} \,\mathrm{d}\vec{x}\\
            =&\int f(\vec{x};\theta )\dfrac{1}{f(\vec{x};\theta )}\dfrac{\partial^{}f(\vec{x};\theta ) }{\partial \theta ^{}} \,\mathrm{d}\vec{x}\\
            =&\dfrac{\partial^{} }{\partial \theta ^{}}\int f(\vec{x};\theta ) \,\mathrm{d}\vec{x}=\dfrac{\partial^{} }{\partial \theta ^{}}1=0
\end{align}
$$ 

Comment: It means that for data $\mathcal{D}$ generated from the model $f(x;\theta )$, the data points would distribute in a pattern 'around' $S(\theta ;x)=0$. Thus by looking for $\hat{\theta }=\mathop{\arg} \limits_{\theta }\left(S(\theta ;x)=0 \right) $ could help find the parameter that generated the data.

--------------


### Property 2: $ I(\theta )=\mathbb{E}_x\left( \dfrac{\partial^{} \ell}{\partial \theta ^{}}\dfrac{\partial^{} \ell}{\partial \theta ^{T}}\right)=-\mathbb{E}_x\left[ \dfrac{\partial^{2} \ell}{\partial \theta \partial \theta ^T}\right]  $

***proof:***
$$
    \begin{align}
            0&=\dfrac{\partial^{} }{\partial \theta ^{T}}\mathbb{E}_x(S|\theta  )\\
            &=\int\dfrac{\partial^{} }{\partial \theta ^{T}} \left\{\dfrac{\partial^{} \ln f(\vec{x};\theta ) }{\partial \theta ^{}}  f(\vec{x};\theta )\right\}\,\mathrm{d}\vec{x}\\
            &=\int \left\{ \dfrac{\partial^{2} \ln  f(\vec{x};\theta )}{\partial \theta \partial \theta ^{T}} f(\vec{x};\theta )+\dfrac{\partial^{} \ln f(\vec{x};\theta )}{\partial \theta ^{}}   \dfrac{\partial^{}  f(\vec{x};\theta )}{\partial \theta ^{T}} \right\} \,\mathrm{d}\vec{x} \\
            &=\int  \dfrac{\partial^{2} \ln  f(\vec{x};\theta )}{\partial \theta \partial \theta ^{T}} f(\vec{x};\theta ) \,\mathrm{d}\vec{x}  +\int \dfrac{\partial^{} \ln  f(\vec{x};\theta )}{\partial \theta ^{}} \dfrac{\partial^{} \ln f(\vec{x};\theta )}{\partial \theta^{T}} f(\vec{x};\theta )\,\mathrm{d}   \vec{x}\\
            &=\mathbb{E}\left( \dfrac{\partial^{2} \ln f(\vec{x};\theta )}{\partial \theta \partial \theta ^{T}}\right)+\mathbb{E}\left( \dfrac{\partial^{} \ln f(\vec{x};\theta )}{\partial \theta ^{}} \dfrac{\partial^{} \ln f(\vec{x};\theta )}{\partial \theta ^{T}} \right)\\
            \Rightarrow &I(\theta )= \mathbb{E}\left( \dfrac{\partial^{2} \ln f(\vec{x};\theta )}{\partial \theta \partial \theta ^{T}}\right)=-\mathbb{E}\left( \dfrac{\partial^{} \ln f(\vec{x};\theta )}{\partial \theta ^{}} \dfrac{\partial^{} \ln f(\vec{x};\theta )}{\partial \theta ^{T}} \right)
    \end{align}
$$

Comment: Information is the (negative) second derivative. It could be a measure of **accuracy** of estimator, in terms of maxizing $\ell(\theta )$, i.e. the **information** contained in the estimator.
        