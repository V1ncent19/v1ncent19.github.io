---
layout: post
title: Expectation-Maximization Algorithm in Gaussian Mixture Model
author: Vincent Peng
date: 2021/12/10
category: Knowledge
---


Expectation-Maximization is used in MLE to estimate some model parameter $\theta$ for model $\{x_i\}$ i.i.d. $$\sim f(x\vert \theta )$$. 

## E-M Algorithm

Main appication: Probability Generative Model, observed value $$ x_i $$ is generated from distributon $$ f(x\vert z_i,\theta _{i},\theta _z) $$ dependent on **unobserved** random $$ z\sim g(z\vert \theta _z) $$(usually $$ z $$ is discrete, denoted $$ z_\nu= z_\alpha ,\ldots z_\gamma  $$). Where we know the form of $$ f(x,z\vert \theta_{z_\nu},\theta_z) $$, but form of $$ f(x\vert \theta_{z_\nu},\theta) $$ might be hard to solve, thus we use an iterative method to deal with the latent variable $$ z $$ so that we can use the known form $$ f(x,z\vert \theta_{z_\nu},\theta) $$.

### Requisite Knowledge
- Kullback-Leibler Divergence: mearures the difference of distribution $$ p(x) $$ from distribution $$ q(x) $$
   $$     \begin{align}
             \mathrm{KL}(q\Vert p)\equiv -\int q(x)\log\dfrac{p(x)}{q(x)} \,\mathrm{d}x 
        \end{align}
        $$

    Note: non-exchange for $$ p $$, $$ q $$.

    Property: $$ \mathrm{KL}(q\Vert p)\geq 0  $$, $$ \forall p(x) $$, take equal when $$ p(x)=q(x) $$
- Jensen Inequality: For **concave**  function $$ h(x) $$ and random variable $$ X\sim f $$
$$    \begin{align}
    \mathbb{E}_f\left(h(X)\right)\leq h\left(\mathbb{E}_f(X)\right) 
    \end{align}$$
        
    
        
### Derivation
Notation: $$ \theta=(\theta_{z_\nu},\theta_z) $$, sample $$ X=(x_{1},x_{2},\ldots,x_{N})  $$. Expectation of function of ramdom variable $$ h(Y) $$ on distribution $$ q(y) $$ as $$ E_{(q_y)}\left(h(Y)\right) $$.

Target: MLE of $$ l(\theta\vert X)\equiv \sum_{i=1}^N\log f(x_i\vert \theta) $$. i.e. get $$ \theta ^*=\mathop{\arg\max}\limits_{\theta} l(\theta\vert X) $$. 

#### Key formula

But due to the untraceablility of $$ f(x\vert \theta ) $$, we have to expand to the full form $$ f(x,z\vert \theta) $$, and use a mathematic trick of $$ E_q(\cdot) $$, where $$ q(z) $$ is any arbitrary distribution of $$ z $$. 
$$
\begin{align}
    f(x\vert \theta )=&f(x,z\vert \theta )f(z\vert x,\theta )\Rightarrow \\
    \Rightarrow \log f(x\vert \theta )=E_{q(z)}\left(\log f(x\vert \theta )\right)=&E_{q(z)}\left(\log f(x,z\vert \theta )f(z\vert x,\theta )\right)\\
    =&\int q(z)\log f(x,z\vert \theta )f(z\vert x,\theta ) \,\mathrm{d}z\\
    =&\int q(z)\log \dfrac{f(x,z\vert \theta )}{q(z)} \,\mathrm{d}z +\mathrm{KL}\left(q\Vert f(z\vert x,\theta )\right) \\
    \geq&\int q(z) \log \dfrac{f(x,z\vert \theta )}{q(z)}\,\mathrm{d}z ,\quad \forall x=x_1,x_2,\ldots,x_N
\end{align}
$$

where $$ \displaystyle\int q(z)\log \dfrac{f(x,z\vert \theta )}{q(z)} \,\mathrm{d}z  $$ is also called ELBO (Evidence Lower Bound) of $$ \log f(x\vert \theta ) $$. And we could similarly get the ELBO of log-likelihood:
    $$\begin{align}
        l(\theta \vert X)=\sum_{i=1}^N\log f(x_i\vert \theta )\geq \sum_{i=1}^N\int_z q_i(z)\log\dfrac{f(x_i,z\vert \theta )}{q_i(z)} \,\mathrm{d}z\equiv \mathrm{ELBO}(q,\theta ),\quad q=\{q_i\}
    \end{align}$$
    
i.e. $$ \mathrm{ELBO}  $$ provides a lower bound estimate for $$ l(\theta \vert X) $$, thus we can instead maximize $$ \mathrm{ELBO}(q,\theta)  $$, using coordiante ascent is the Maximization-Maximization Algorithm, where one of the `coordinate' is the function space $$ q(z) $$.

$$
\begin{align}
    q\text{ Maximum : }q^{(t+1)}=&\mathop{\arg\max}\limits_{q(z)}\mathrm{ELBO}(q,\theta ^{(t)})=p(z\vert x,\theta ^{(t)})\\
    \theta \text{ Maximum : }\theta ^{(t+1)}=&\mathop{\arg\max}\limits_{\theta }\mathrm{ELBO} (q^{(t+1)},\theta ) 
\end{align}
$$

Further if we take can derive and use the form of $$ p(z\vert x,\theta ) $$ (sometimes this posterior is also untraceable), then $$ \theta  $$ maximization step becomes
$$
\begin{align}
    \theta ^{(t+1)}=&\mathop{\arg\max}\limits_{\theta } \mathrm{ELBO} \left(p(z\vert x,\theta^{(t)} ),\theta \right)=\sum_{i=1}^N\int_z p(z\vert x_i,\theta^{(t)})\log\dfrac{f(x_i,z\vert \theta )}{p(z\vert x_i,\theta^{(t)})} \,\mathrm{d}z\\
    =&\mathop{\arg\max }\limits_{\theta } \sum_{i=1}^N\int_z p(z\vert x_i,\theta^{(t)})\log f(x_i,z\vert \theta ) \,\mathrm{d}z\equiv Q(\theta \vert \theta ^{(t)})\\
    =&\mathop{\arg\max }\limits_{\theta }\sum_{i=1}^N \int_z p(z\vert x_i,\theta^{(t)})\log f(x_i,z\vert \theta ) \,\mathrm{d}z
\end{align}$$
    
and naturally $$ q $$ maximization Step becomes computing $$ \displaystyle Q(\theta \vert \theta ^{(t)})=\sum_{i=1}^N \int_z p(z\vert x_i,\theta^{(t)})\log f(x_i,z\vert \theta ) \,\mathrm{d}z $$, i.e. the Expectation of $$ f(x_i,z\vert \theta ) $$ on the posterior $$ p(z\vert x_i,\theta ^{(t)}) $$, gather as Expectation-Maximization Algorithm:

$$\begin{align}
    \mathrm{E_{xpectation}}\text{-Step}:&\,Q(\theta \vert \theta ^{(t)})=\sum_{i=1}^N \int_z p(z\vert x_i,\theta^{(t)})\log f(x_i,z\vert \theta ) \,\mathrm{d}z=\sum_{i=1}^NE_{p(z\vert x_i,\theta ^{(t)})}\left[\log f(x_i,z\vert \theta )\right]\\
    \mathrm{M_{aximization}}\text{-Step}:&\, \theta ^{(t+1)}=\mathop{\arg\max}\limits_{\theta }Q(\theta \vert \theta ^{(t)})=  \mathop{\arg\max}\limits_{\theta }\sum_{i=1}^N \int_z p(z\vert x_i,\theta^{(t)})\log f(x_i,z\vert \theta ) \,\mathrm{d}z
\end{align}$$


E-M Algorithm can guarentee ascent of $$ \mathrm{ELBO}  $$, and finally can ensure convergence (at least to a local maximum).

An application of E-M Algorithm is Gaussian Mixture Model for Clustering, detail see


### Limitation and Improvement

- Note that for generative model, we used a set of latent variable $$ z $$, further we need an $$ \int _z \,\mathrm{d}x $$ in $$ Q(\theta \vert \theta ^{(t)}) $$, thus E-M requires low-dimensionality of $$ z $$ (e.g. in GMM, $$ z $$ is one-dimensional).
- Slow convergence near extreme point, use acceleration improvement, e.g. Louis acceleration.
- In $$ q $$-Maximization step, the form of $$ q $$ might be untraceable (i.e. $$ p(z\vert x,\theta ) $$ untraceable). For such function extreme value problem, use VEM (Variational Expectation Maximization) / VBEM(Variational Bayesian Expectation Maximization)


## GMM Model

 The Gaussian Mixture Model (GMM) for clustering assumes $$ X $$ is generated from a mixed distribution of $$ K $$ normal, i.e. $$ X $$ has probability $$ \pi_l $$ to be generated from corresponding normal $$ N(\mu _l,\Sigma _l) $$:
 $$
    \begin{align}
        X\sim \sum_{l=1}^K\pi_lN(\mu_l,\Sigma _l)=\sum_{l=1}^K\pi_lN(\theta _l),\quad \sum_{l=1}^K\pi_l=1,\,\pi_l\geq 0.
    \end{align}
$$

Use its likelihood function $$ L(\theta;x) $$ and maximize posterior probability by $$ \dfrac{\partial^{} \ell}{\partial \theta ^{}} $$:
$$
\begin{align}
    L(\{\pi_l\},\{\theta_l \};x)=\prod_{i=1}^N \sum_{l=1}^K\pi_l   \dfrac{1}{(2\pi)^{p/2}\vert \Sigma _l\vert ^{1/2}}\exp\left(   -\dfrac{1}{2}(x_i-\mu _l)'\Sigma^{-1} _l(x_i-\mu _l)\right)
\end{align}
$$
    
E-M Algorithm uses the ELBO maximizing method. For simplification express $$ \theta \equiv \{ \cup \pi_l,\cup \mu_l,\cup \Sigma _l \} $$. The maximizing function $$ Q(\theta \vert \theta ^{(t)}) $$ for GMM model and corresponding iteration: 
$$
\begin{align}
    \theta ^{(t+1)}=&\mathop{\arg\max}\limits_{\theta }  Q(\theta \vert \theta ^{(t)})=\mathop{\arg\max}\limits_{\theta }\sum_{i=1}^N\sum_{l=1}^K\gamma _{il}^{(t)}\log \pi_l\phi (x_i\vert \mu _l,\Sigma _l),\\
    \gamma _{il}^{(t)}\equiv& \dfrac{\pi_l^{(t)}\phi(x_i\vert \mu _l^{(t)},\Sigma _l^{(t)})}{\sum\limits_{j=1}^K\pi_j^{(t)}\phi (x_i\vert \mu _j^{(t)},\Sigma _j^{(t)})}
\end{align}
$$
Lagrange Multiplier: Extreme value $$ \mathop{\arg\max}\limits_{\theta }Q(\theta \vert \theta ^{(t)})  $$ with constraint $$ \sum_{l=1}^K \pi_l=1 $$ requires 
$$\begin{align}
        \dfrac{\partial^{}  Q(\theta \vert \theta ^{(t)})}{\partial \mu _l^{}}=0\quad \dfrac{\partial^{}  Q(\theta \vert \theta ^{(t)})}{\partial \Sigma ^{-1}_l}=0 \quad \dfrac{\partial^{}  Q(\theta \vert \theta ^{(t)})+\lambda (\sum_{j=1}^K\pi_l-1)}{\partial \pi_j^{}}=0,\quad \forall l=1,2,\ldots,K
\end{align}$$

Result:
$$
\begin{align}
&\begin{cases}
\mu _l^{(t+1)}=&\dfrac{\sum\limits_{i=1}^N\gamma _{il}^{(t)}x_i}{\sum\limits_{i=1}^N\gamma^{(t)}_{il}}\\
\Sigma _l^{(t+1)}=&\dfrac{\sum\limits_{i=1}^N\gamma^{(t)} _{il}(x_i-\mu _l)(x_i-\mu _l)'}{\sum\limits_{i=1}^N\gamma ^{(t)}_{il}}\\
\pi_l^{(t+1)}=&\dfrac{1}{N}\sum_{i=1}^N\gamma^{(t)}_{il}
\end{cases}\\
&\gamma ^{(t)}_{il}\equiv \dfrac{\pi_l^{(t)}\phi(x_i\vert \mu _l^{(t)},\Sigma _l^{(t)})}{\sum\limits_{j=1}^K\pi_j^{(t)}\phi (x_i\vert \mu _j^{(t)},\Sigma _j^{(t)})} 
\end{align}  
$$

where $$ \gamma _{il} $$ is the posterior probability that the $$ i^\mathrm{th} $$ object belongs to the $$ l^\mathrm{th} $$ group.

The above constraint equations are difficult to solve, use iteration algorithm:

1. Use e.g. $$ K $$-means method to set an initial estimation as $$ (\hat{\mu}^{(0)}_l,\hat{\Sigma }_l^{(0)}),\,\hat{\pi}_l^{(0)}=1/K$$;
2. Repeat Expectation & Maximization:

    (a). $$ \mathrm{E_{xpectation}} $$-Step: Compute posterior of latent variable on each point;
    $$
\begin{align}
    \hat{\gamma }_{il}^{(t)}=\dfrac{\pi_l^{(t)}\phi(x_i\vert \mu _l^{(t)},\Sigma _l^{(t)})}{\sum\limits_{j=1}^K\pi_j^{(t)}\phi (x_i\vert \mu _j^{(t)},\Sigma _j^{(t)})} ,\quad  1\leq i\leq N,\,\, 1\leq l\leq K
\end{align}
$$

    (b). $$ \mathrm{M_{aximize}} $$-Step: Re-calculate parameters $$ \{\mu_l,\Sigma _l,\pi_l\} $$.
1. Repeat until convergence.


Note: EM method for Gaussion Mixture Model is a greedy algorithm $$ \longrightarrow $$ local maximum.