---
layout: post
title: Variance of Odds Ratio in Contingency Table
author: Vincent Peng
date: 2022/4/27
category: Knowledge
---

Odds ratio of the contingency table below is an important statistics
$$
\begin{align}
    \theta =\dfrac{\mathbb{P}\left( D\vert E \right) \big/\mathbb{P}\left( D^\complement\vert E \right) }{\mathbb{P}\left( D\vert E^\complement\right)\big/\mathbb{P}\left( D^\complement \vert E^\complement \right)  }
\end{align}
$$ 

<div style="position: relative; text-align: center;">
  <table style='border: 2px solid rgb(215, 207, 207); width=100%;' align='center'>
    <!-- <tr>
      <th></th>
      <th></th>
    </tr> -->
    <tr>
      <td>  </td>
      <td>$$D^{\,}$$</td>
      <td> $$D^\complement$$</td>
    </tr>
    <tr>
      <td>$$E$$ </td>
      <td>$$n_{11}   $$</td>
      <td>$$n_{12}   $$</td>
    </tr>
    <tr>
      <td>$$E^\complement$$</td>
      <td>$$n_{21}$$</td>
      <td>$$n_{22}$$</td>
    </tr>
  </table>
</div>



Estimation of odds ratio is symmetric w.r.t. retrospective/prospective study:
$$
\begin{align}
    \hat{\theta }=\dfrac{n_{11}n_{22}}{n_{12}n_{21}}
\end{align}
$$ 

its variance is derived with assumption $$(n_{11},n_{12},n_{21},n_{22})\sim M(p_{11},p_{12},p_{21},p_{22}; n) $$

### Covariance of Multinoimal Distribution

for $$a_1,\ldots,a_n\sim M(p_1,\ldots,p_n;a)$$:
$$
\begin{align}
    cov(a_i,a_j)=&\mathbb{E}\left( (a_i-ap_i)(a_j-ap_j) \right)\\
    =&\mathbb{E}\left( a_ia_j \right)-a^2p_ip_j\\
    =&\mathbb{E}\left( a_i\mathbb{E}\left( a_j\vert a_i \right)  \right)   -a^2p_ip_j\\
    =&\mathbb{E}\left( a_i (a-a_i)\dfrac{p_j}{1-p_i} \right) -a^2p_ip_j\\
    =&\dfrac{p_j}{1-p_i} \mathbb{E}\left( aa_i-a_i^2 \right) -a^2p_ip_j\\
    =&\dfrac{p_j}{1-p_i}\left[ a^2p_i-\left( ap_i(1-p_i) + a^2p_i^2  \right) \right] -a^2p_ip_j\\
    =&-ap_ip_j,\quad i\neq j
\end{align}
$$ 

i.e. 
$$
\begin{align}
    cov(a_i,a_j)=\begin{cases}
        -ap_ip_j,&i\neq j\\
        ap_i(1-p_i),&i=j
    \end{cases}=a\left(\delta _{ij}p_i-p_ip_j\right)
\end{align}
$$ 

### Delta Method

To estimate variance of function of r.v., say $$var(f(X))$$, use the taylor expansion of $$f(\, \cdot \, )$$ at $$\mathbb{E}(X)$$:
$$
\begin{align}
    f(X)\approx f\left(\mathbb{E}\left( X \right) \right)+\nabla f(\mathbb{E}\left( X \right) )'\left(X-\mathbb{E}\left( X \right) \right)+\mathcal{O}(\nabla\nabla f)
\end{align}
$$ 

then 
$$
\begin{align}
    var(f(X))\approx & \left(\nabla f(\mathbb{E}\left( X \right) )\right)' var(X) \left(\nabla f(\mathbb{E}\left( X \right) )\right) 
\end{align}
$$ 

Similarly for bi-function
<!-- $$
\begin{align}
    f(X,Y)\approx f(\mathbb{E}\left( X \right) ,\mathbb{E}\left( Y \right) )+(\nabla_x f)'\left(X-\mathbb{E}\left( X \right) \right)+(\nabla_y f)'\left(Y-\mathbb{E}\left( Y \right) \right)+\mathcal{O}(\nabla\nabla f)
\end{align}
$$  -->

then 
$$
\begin{align}
    cov(f(X),g(Y))\approx & \left(\nabla_x f\right)' cov(X,Y) \left(\nabla_y g\right) 
\end{align}
$$ 


using delta method for multinomial distribution, we could obtain that 
$$
\begin{align}
    cov(\log a_i,\log a_j)=&\dfrac{1}{a^2p_ip_j}cov(a_i,a_j)=\dfrac{\left(\delta _{ij}p_i-p_ip_j\right)}{ap_ip_j}=\dfrac{\delta _{ij}}{n_i}-\dfrac{1}{a}
\end{align}
$$ 

### Variance of Odds Ratio
$$
\begin{align}
    var\left( \log \dfrac{n_{11}n_{22}}{n_{12}n_{21}} \right)=&var\left( \log n_{11}+\log n_{22}-\log_{21}-\log_{12} \right)\\
    =&\sum_{(ij)}var(\log n_{ij})+2\sum_{(ij,kl)\in \{(11,22),(12,21)\}} cov(\log n_{ij},\log {n_{kl}})\\
    &-2\sum_{(ij,kl)\notin \{(11,22),(12,21)\}} cov(\log n_{ij},\log {n_{kl}})\\
    =&\sum_{(ij)}\dfrac{1}{n_{ij}}-\dfrac{4}{n}-\dfrac{4}{n}+\dfrac{8}{n}\\
    =&\dfrac{1}{n_{11}}+\dfrac{1}{n_{21}}+\dfrac{1}{n_{12}}+\dfrac{1}{n_{22}}
\end{align}
$$ 

And use delta method again to obtain variance for odds ratio
$$
\begin{align}
    var(\dfrac{n_{11}n_{22}}{n_{12}n_{21}})=\left(\dfrac{n_{11}n_{22}}{n_{12}n_{21}}\right)^2\left(\dfrac{1}{n_{11}}+\dfrac{1}{n_{21}}+\dfrac{1}{n_{12}}+\dfrac{1}{n_{22}}\right)
\end{align}
$$ 

Comment: the above could be used to multi-row/column contingency table on four aligned grids, e.g.
$$
\begin{align}
    var(\dfrac{n_{22}n_{44}}{n_{24}n_{42}})=\left(\dfrac{n_{22}n_{44}}{n_{24}n_{42}}\right)^2\left(\dfrac{1}{n_{22}}+\dfrac{1}{n_{44}}+\dfrac{1}{n_{24}}+\dfrac{1}{n_{42}}\right)
\end{align}
$$ 