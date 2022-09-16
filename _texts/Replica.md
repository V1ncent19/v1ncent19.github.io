---
layout: post
title: Reading Notes of Replica Symmetric Breaking
author: Vincent Peng
date: 2022/8/15
category: Knowledge
---

Here is my reading note for the book '[*Statistical Physics of Spin Glasses and Information Processing: An Introduction*](https://www.researchgate.net/publication/235410255_Statistical_Physics_of_Spin_Glasses_and_Information_Processing)' by [Hidetoshi Nishimori](http://q-annealing.org/index-e.html). I am still not quite clear about this field so please discuss your insights and understanding with me if you are also interested.

## Prerequisites

### Basic Notions in Statistical Physics

State distribution:
$$
\begin{align}
    \mathbb{P}\left( \text{state}_i \right)=\dfrac{e^{-\beta \mathcal{H}(\text{state}_i)}}{Z},\quad Z=\sum_{\text{all
     state}}e^{-\beta \mathcal{H}(\text{state}_i)} 
\end{align}
$$ 

Free Energy:
$$
\begin{align}
    F(\beta )\equiv -\dfrac{1}{\beta }\log Z
\end{align}
$$ 

(Canonical) Entropy:
$$
\begin{align}
    S(\beta )=&-\sum_{i}\dfrac{e^{-\beta \mathcal{H}_i}}{Z}\log\dfrac{e^{-\beta \mathcal{H}_i}}{Z}\\
    =&\sum_{i}\dfrac{e^{-\beta \mathcal{H}_i}}{Z}\left[\beta \mathcal{H}_i+\log Z \right]\\
    =&-\sum_i \dfrac{\beta }{Z}\dfrac{\partial^{} e^{-\beta \mathcal{H}_i}}{\partial \beta ^{}}+\log Z\\
    =&-\beta \dfrac{\partial^{} \log Z}{\partial \beta ^{}}+\log Z\\
    =&-\beta ^2\dfrac{\partial^{} \dfrac{1}{\beta }\log Z}{\partial \beta  ^{}}\\
    =&\beta ^2\dfrac{\partial^{} F}{\partial \beta ^{}}
\end{align}
$$ 

Average energy (internal energy):
$$
\begin{align}
    U=\sum_{i}\mathcal{H}_i\dfrac{e^{-\beta \mathcal{H}_i}}{Z}=&-\dfrac{1}{Z}\sum_{i}\dfrac{\partial^{} e^{-\beta \mathcal{H}_i}}{\partial \beta ^{}}\\
    =&-\dfrac{\partial^{} \log Z}{\partial \beta ^{}}\\
    =&\dfrac{\partial^{} \beta F}{\partial \beta ^{}}
\end{align}
$$ 

Legendre transform bet. $U$ and $F$:
$$
\begin{align}
    U=&\dfrac{\partial^{} \beta F}{\partial \beta ^{}}\\
    =&F+\beta \dfrac{\partial^{} F}{\partial \beta ^{}}\\
    =&F+\dfrac{S}{\beta }
\end{align}
$$ 

Average free energy:
$$
\begin{align}
    f=\lim_{N\to \infty}\dfrac{1}{N}F(\beta ,N)
\end{align}
$$ 


### Useful Lemmas

Lemma 1: Gaussian integral
$$
\begin{align}
    \int e^{-\alpha x^2+\beta x} \,\mathrm{d}x=&\sqrt{\dfrac{\pi}{\alpha }}e^{\frac{\beta ^2}{4\alpha }}\quad (\mathrm{Re}(\alpha )\geq 0)\\
    e^{\frac{ax^2}{2}}=&\sqrt{\dfrac{a}{2\pi}}\int e^{-\frac{am^2}{2}+amx} \,\mathrm{d}m
\end{align}
$$ 

Lemma 2: delta function
$$
\begin{align}
    &\delta(x)=\begin{cases}
        0,&x\neq 0\\
        \infty,&x=0
    \end{cases},\quad w.r.t. \int_\mathbb{R}\delta (x)\,\mathrm{d}x=1\\
    &\int _\mathbb{R}f(x)\delta (x-a) \,\mathrm{d}x=f(a)\\
    &\text{Fourier:}\begin{cases}
        1=\int_{\mathbb{R}}e^{-ikx}\delta (x)\,\mathrm{d}x\\
        \delta (x)=\dfrac{1}{2\pi}\int _\mathbb{R}e^{ikx} \,\mathrm{d}k
    \end{cases}
\end{align}       
$$ 

Lemma 3: delta function + Gaussian integral = Fourier*2
$$
\begin{align}
    f(a)=&\int _\mathbb{R}f(x)\delta (x-a) \,\mathrm{d}x\\
    =&\int _\mathbb{R}\int_\mathbb{R}\dfrac{1}{2\pi}f(x)e^{ik(x-a)}\,\mathrm{d}k \,\mathrm{d}x
\end{align}
$$ 





## Chapter 2 of the Book

### Problem to study

Say we are solving some combinatorial problem $\mathop{\arg\min}\limits_{x} \mathcal{H}(x,\mathcal{C})$, where $\mathcal{C}$ denotes the *configuration* of the parameters of the problem.

- Solve the problem for some specific/explicit $\mathcal{C}$
- If $\mathcal{C}$ has some distribution, we can solve *this type of problem* of $\mathcal{C}\sim f_\mathcal{C}$

Example:
- TSP (Travaling Salesman Problem), $\mathcal{C}$ for locations and path, its distribution represents `this kinds of map to travel'
- ML (Machine learning), $\mathcal{C}$ for training data, its distribution represents the ability to generalize the model

<!-- ### Spin-Glass

“spin glasses” conveys (among many
others) this idea of frozen disorde -->

### Self-averaging Property

Studying the 'averaging property' v.s. 'specific problem'

- self averaging: when size of the system grows, the average of some observable $[O(x)]_\mathcal{C}$ '*represents almost all typical cases*' of $\mathcal{C}$. 
  
$f$ is a self-averaging quantity $\to$ evaluate $[f]$ instead of studying any explicit $f(x,\mathcal{C})$


$$
\begin{align}
    [f]=&\lim_{N\to\infty}\dfrac{1}{N}[F]_\mathcal{C}\lim_{N\to\infty}-\dfrac{1}{N\beta }[\log Z]_\mathcal{C}
\end{align}
$$ 

### Replica trick:

$$
\begin{align}
    [\log Z]=[\dfrac{1}{n}\log Z^n]=\lim_{n\to 0}[\dfrac{Z^n-1}{n}]=\lim_{n\to 0}\dfrac{[Z^n]-1}{n}\tag{2.6}
\end{align}
$$ 

Idea: first evaluate $[Z^n]$ at $n\in\mathbb{N}^+$, then use some other trick to evaluate $n\to 0$ with 'analytically continuation'

Comments on relica trick:
- Avoid averaging on $\log$, better calculation
- Validity of the continuation methods? commonly used method: Replica symmetry splution / Parisi equation


### SK Model


Hamiltonian of *Sherrington-Kirkpatrick Model* : $i,j$ for sites
$$
\begin{align}
    \mathcal{H}=-\sum_{i<j}J_{ij}S_iS_j-h\sum_{i}S_i,\quad i,j=1,2,\ldots,N\tag{2.7}
\end{align}
$$ 


Distribution of bond $J_{ij}$, say normal distribution $J_{ij}\sim_{iid}\mathcal{N}(\dfrac{J_0}{N},\dfrac{J^2}{N})$
$$
\begin{align}
    \mathbb{P}\left( J_{ij} \right) =\sqrt{\dfrac{N}{2\pi J^2}}\exp\left\{ -\dfrac{N(J_{ij}-J_0)^2}{2J^2} \right\}\tag{2.8}
\end{align}
$$ 

Comment: $\bar{J}_{ij}=J_0\big/N$ to ensures $\mathcal{H}$ grows linearly with $N$. ($\mathcal{H}$ should be *extensive quantity*)


$$
\begin{align}
    [F]=-\dfrac{1}{\beta }[\log Z]=-\dfrac{1}{\beta }\int \log Z  \,\prod_{i<j}\mathbb{P}\left( J_{ij} \right)\,\mathrm{d}J_{ij}\tag{2.5}
\end{align}
$$ 

Replica trick:
$$
\begin{align}
    [Z^n]=\int \left(\sum_{\{S_{i=1}^N\}}e^{-\beta \mathcal{H}(S_{i=1}^N)}\right)^n \,\prod_{i<j}\mathbb{P}\left( J_{ij} \right)\,\mathrm{d}J_{ij}\tag{2.5}
\end{align}
$$ 

Key steps:
1. replica: $(\sum_{}\,\cdot \,)^n\to (\sum_{\mathrm{replica} 1 })\times (\sum_{\mathrm{replica} 2 })\times \ldots\times  (\sum_{\mathrm{replica} n })  $, use $S^\alpha $ to denote replica$\alpha $

    $$
    \begin{align}
        [Z^n]=&\int \left(\sum_{\{S_{i=1}^N\}_{\alpha =1}^n}\prod_{\alpha =1}^ne^{-\beta \mathcal{H}(S_{i=1}^{\alpha N})}\right) \,\prod_{i<j}\mathbb{P}\left( J_{ij} \right)\,\mathrm{d}J_{ij}\tag{2.10}\\
        =&\int \left(\sum_{\{S_{i=1}^N\}_{\alpha =1}^n}\exp\left\{ \beta \sum_{i<j}J_{ij}\sum_{\alpha =1}^nS_i^\alpha S_j^\alpha +\beta h\sum_{i}\sum_{\alpha =1}^nS_i^\alpha   \right\}\right) \,\prod_{i<j}\mathbb{P}\left( J_{ij} \right)\,\mathrm{d}J_{ij}\\
        \mathop{=}\limits_{Lemma1}  &\sum_{\{S^\alpha |_{i=1}^N\}_{\alpha =1}^n}\exp\left\{ \dfrac{1}{N}\sum_{i<j}\left(\dfrac{1}{2}\beta ^2J^2\sum_{\alpha ,\beta }S_i^\alpha S_j^\alpha S_i^\beta S_j^\beta +\beta J_0\sum_{\alpha }S_i^\alpha S_j^\alpha  \right)+\beta h\sum_{i}\sum_{\alpha }S_i^\alpha  \right\}
    \end{align}
    $$ 

2. Expectation $\mathbb{E}$ using gaussian integral

    $$
    \begin{align}
        [Z^n]=\sum_{\{S^\alpha |_{i=1}^N\}_{\alpha =1}^n}\exp\left\{ \dfrac{1}{N}\sum_{i<j}\left(\dfrac{1}{2}\beta ^2J^2\sum_{\alpha ,\beta }S_i^\alpha S_j^\alpha S_i^\beta S_j^\beta +\beta J_0\sum_{\alpha }S_i^\alpha S_j^\alpha  \right)+\beta h\sum_{i}\sum_{\alpha }S_i^\alpha  \right\}\\ \tag{2.11}
    \end{align}
    $$ 
    Note: 
    - $S_i^\alpha \in\{+1,-1\}\Rightarrow S_i^\alpha S_i^\alpha =1$. 
    - $\sum_{\alpha ,\beta }S_i^\alpha S_j^\alpha S_i^\beta S_j^\beta=n+2\sum_{\alpha <\beta }S_i^\alpha S_j^\alpha S_i^\beta S_j^\beta$
    - $\sum_{i<j}S_i^\alpha S_j^\alpha S_i^\beta S_j^\beta=-N+\dfrac{1}{2}\sum_{i,j}S_i^\alpha S_j^\alpha S_i^\beta S_j^\beta=-N+\dfrac{1}{2}\left(\sum_{i=1}^NS_i^\alpha S_i^\beta \right)^2$
    - $\sum_{i<j}S_i^\alpha S_j^\alpha =-N+\dfrac{1}{2}\sum_{i,j}S_i^\alpha S_j^\alpha =-N+\dfrac{1}{2}\left(\sum_{i=1}^NS_i^\alpha \right)^2  $


    $$
    \begin{align}
        [Z^n]=&\exp\left[ \dfrac{Nn\beta ^2J^2}{4} \right]\sum_{\{S^\alpha |_{i=1}^N\}_{\alpha =1}^n}\exp\left\{ \dfrac{\beta ^2J^2}{2N}\sum_{\alpha<\beta}\left(\sum_iS^\alpha_iS^\beta _i \right)^2+\dfrac{\beta J_0}{2N}\sum_{\alpha }\left(\sum_i S_i^\alpha \right)^2+\beta h\sum_i\sum_\alpha S_i^\alpha  \right\}
    \end{align}
    $$  
3. Change summation indices
    $$
    \begin{align}
            [Z^n]=&\exp\left[ \dfrac{Nn\beta ^2J^2}{4} \right]\\\cdot 
            &\sum_{\{S^\alpha |_{i=1}^N\}_{\alpha =1}^n}\exp\left\{ \dfrac{\beta ^2J^2}{2N}\sum_{\alpha<\beta}\left(\sum_iS^\alpha_iS^\beta _i \right)^2+\dfrac{\beta J_0}{2N}\sum_{\alpha }\left(\sum_i S_i^\alpha \right)^2+\beta h\sum_i\sum_\alpha S_i^\alpha  \right\}\\ \tag{2.12}
    \end{align}
    $$ 

4. Use lemma 1 to linearize $\left( \sum_{i } \right)^2$ term, integral dummy variable taken as $q_{\alpha \beta }$ and $m_\alpha $
    $$
    \begin{align}
        [Z^n]=&\exp\left\{ \dfrac{Nn\beta ^2J^2}{4} \right\}\int \prod_{\alpha <\beta }\,\mathrm{d}q_{\alpha \beta }\prod_{\alpha } \,\mathrm{d}m_\alpha \\
        \cdot&\exp\left[ -\dfrac{N\beta ^2J^2}{2}\sum_{\alpha <\beta }q_{\alpha \beta }^2-\dfrac{N\beta J_0}{2}\sum_\alpha m_\alpha ^2 \right]\\
        \cdot&\sum_{\{S^\alpha |_{i=1}^N\}_{\alpha =1}^n}\exp\left[ \beta ^2J^2\sum_{\alpha <\beta }\sum_iS_i^\alpha S_i^\beta+\beta \sum_\alpha (J_0m_\alpha +h)\sum_iS_i^\alpha   \right]\tag{2.13}
    \end{align}
    $$ 

5. Reduction of $\sum_{\{S^\alpha |_{i=1}^N\}_{\alpha =1}^n}$: equivalent for all $i$, $\sum_{\{S^\alpha |_{i=1}^N\}_{\alpha =1}^n}\to (\sum_{\alpha })^N$
    $$
    \begin{align}
        [Z^n]=&\exp\left\{ \dfrac{Nn\beta ^2J^2}{4} \right\}\int \prod_{\alpha <\beta }\,\mathrm{d}q_{\alpha \beta }\prod_{\alpha } \,\mathrm{d}m_\alpha \\
        \cdot&\exp\left[ -\dfrac{N\beta ^2J^2}{2}\sum_{\alpha <\beta }q_{\alpha \beta }^2-\dfrac{N\beta J_0}{2}\sum_\alpha m_\alpha ^2 \right]\\
        \cdot&\exp\left[ N\log \sum_{\{S^\alpha \}_{\alpha =1}^n}\exp\left[ \beta ^2J^2\sum_{\alpha <\beta }q_{\alpha \beta }S^\alpha S^\beta +\beta \sum_\alpha  (J_0m_\alpha +h)S^\alpha \right] \right]\tag{2.15}\\
        =&\exp\left\{ \dfrac{Nn\beta ^2J^2}{4} \right\}\int \prod_{\alpha <\beta }\,\mathrm{d}q_{\alpha \beta }\prod_{\alpha } \,\mathrm{d}m_\alpha\\
        \cdot&\exp N\Big\{ -\dfrac{\beta ^2J^2}{2}\sum_{\alpha <\beta }q^2_{\alpha \beta }-\dfrac{\beta J_0}{2}\sum_\alpha m_\alpha ^2 \\
        &+\log \sum_{\{S^\alpha \}_{\alpha =1}^n}\exp\left[ \beta ^2J^2\sum_{\alpha <\beta }q_{\alpha \beta }S^\alpha S^\beta +\beta \sum_\alpha  (J_0m_\alpha +h)S^\alpha \right]\Big\}\\
        :=&\int \prod_{\alpha <\beta }\,\mathrm{d}q_{\alpha \beta }\prod_{\alpha } \,\mathrm{d}m_\alpha \exp\left\{ N\Xi(q_{\alpha \beta },m_\alpha ) \right\}\\
        \Xi\equiv&\dfrac{n\beta ^2J^2}{4} -\dfrac{\beta ^2J^2}{2}\sum_{\alpha <\beta }q^2_{\alpha \beta }-\dfrac{\beta J_0}{2}\sum_\alpha m_\alpha ^2 \\
        &+\log \sum_{\{S^\alpha \}_{\alpha =1}^n}\exp\left[ \beta ^2J^2\sum_{\alpha <\beta }q_{\alpha \beta }S^\alpha S^\beta +\beta \sum_\alpha  (J_0m_\alpha +h)S^\alpha \right]
    \end{align}
    $$ 

6. Thermal limit $N\to\infty$, the integral is dominated by $\max_{q_{\alpha \beta },m_\alpha }\Xi$ term, i.e.
    $$
    \begin{align}
        [Z^n]\propto \exp\left\{ N\Xi \right\},\quad w.r.t. q_{\alpha \beta },m_\alpha =\mathop{\arg\max}\limits_{q_{\alpha \beta },m_\alpha }\Xi(q_{\alpha \beta },m_\alpha ) 
    \end{align}
    $$ 

7. Average free energy should be finite: $[f]=-\dfrac{1}{\beta }\lim_{N\to\infty}\lim_{n\to 0}\dfrac{[Z^n]-1}{nN}<\infty$
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



Comment:
- Now free energy depends on **order parameters** $q_{\alpha \beta },m_\alpha $, instead of all $\{S_{i=1}^N\}_{\alpha =1}^n$
- Exchangablity of $\lim_{n}$ and $\lim_N$? I believe that's what results in replica breaking.
- Condition to $\arg\max \Xi/n$
  - $\dfrac{\partial^{}\Xi/n }{\partial (q_{\alpha \beta },m_\alpha )^{}}=0$:
  $$
  \begin{align}
    \begin{cases}
        q_{\alpha \beta }=\langle S^\alpha S^\beta \rangle_L&=[\langle S_i^\alpha S_i^\beta  \rangle]=[\langle \dfrac{1}{N}\sum_{i=1}^N S_i^\alpha S_i^\beta  \rangle _{\mathcal{H}_\mathrm{replica}}]\\
        m_\alpha =\langle S^\alpha \rangle_L&=[\langle S_i^\alpha \rangle]=[\langle \dfrac{1}{N}\sum_{i=1}^NS_i^\alpha  \rangle _{\mathcal{H}_\mathrm{replica}}]
    \end{cases}
    \end{align}
    $$ 
    Intuition: $q_{\alpha \beta }$ is the **overlap** between repica $\alpha $ and $\beta $. $\langle\, \cdot \, \rangle_{\mathcal{H}_\mathrm{replica}}$ is the distribution of the whole replicas system, while $S^\alpha_i S^\beta _i$ focuses on *part of the whole replica system* 
    ![](images/2022-06-25-12-16-02.png)

    Thermal equilibrium: $\mathrm{replica1}\leftrightarrow\mathrm{replica2}\leftrightarrow\cdots\leftrightarrow\mathrm{replica}\alpha $ at $t\to \infty, \beta \to \infty$. Spin glass equilibrium: $t$ is large but $t<\infty$, which means that each replica is trapped in its valley $\to$ replica symmetry breaking
  - Semi-positive definite of Hessian $\dfrac{\partial^{2} \Xi/n}{\partial \partial ^T (q_{\alpha \beta },m_\alpha )}$

- Another intuition from ensemble theory:

    To study how states changes when reaching equilibrium at $t\to \infty$, you can either:
    1. obsereve **one** system till $t\to \infty$
    2. or observe $n\to \infty$ systems simultanously

    Perhaps replica would be similar to ensemble? then $n\to 0$ would be similar to $t<\infty$, which is the spin glass state time scale. But I haven't seen any work talking about such analogy.


## Appendix B -- Parisi Solution

#### (B.1)

Lemma (1):
$$
\begin{align}
    \exp\left[ \dfrac{\partial^{} }{\partial h_\beta  } \right]\exp\left[ \sum_{\alpha }h_\alpha S^\alpha   \right]=&\sum_{i=0}^\infty \dfrac{1}{i!}\dfrac{\partial^{i} }{\partial h_\beta  ^i}\exp\left[ \sum_\alpha h_\alpha S^\alpha  \right]\\
    =&\sum_{i=0}^\infty\dfrac{1}{i!}(S^\beta )^i\exp\left[ \sum_{\alpha }h_\alpha S^\alpha  \right]\\
    =&\exp\left[ S^\beta \right]\exp\left[ \sum_{\alpha }h_\alpha S^\alpha  \right]\\
    \Rightarrow \exp\left[ q_{\alpha \beta }\dfrac{\partial^{2} }{\partial h_\alpha h_\beta } \right]\exp\left[ \sum_{\alpha }S^\alpha  \right]=&\exp\left[ q_{\alpha \beta }S^\alpha S^\beta+\sum_{\alpha }h_\alpha S^\alpha   \right]
\end{align}
$$ 


$$
\begin{align}
    G=&\mathrm{Tr}\exp\left[ \dfrac{1}{2}\sum_{\alpha ,\beta }^nq_{\alpha \beta }S^\alpha S^\beta +h\sum_{\alpha }^nS^\alpha  \right]\\
    =&\exp\left[ \dfrac{1}{2}\sum_{\alpha ,\beta }q_{\alpha \beta}\dfrac{\partial^{2} }{\partial h_\alpha h_\beta } \right]\mathrm{Tr}\exp\left[ \sum_{\alpha }h_\alpha S^\alpha  \right]\Bigg|_{h_\alpha =h}\\
    =&\exp\left[ \dfrac{1}{2}\sum_{\alpha ,\beta }q_{\alpha \beta}\dfrac{\partial^{2} }{\partial h_\alpha h_\beta } \right]\prod_\alpha \cosh h_\alpha S^\alpha \Bigg|_{h_\alpha =h}\\
\end{align}
$$ 

#### (B.8)

$$
\begin{align}
    g(x+\mathrm{d}x,h )&=\exp\left[ -\dfrac{1}{2}\,\mathrm{d}q(x)\dfrac{\partial^{2} }{\partial h^{2}} \right]g(x,h)^{1+\mathrm{d}\log x }\\
    g(x+\mathrm{d}x,h )-g(x,h ) &=\left\{ 1-\dfrac{1}{2}\mathrm{d}q(x)\dfrac{\partial^{2} }{\partial h^{2}}  \right\}g(x,h)^{1+\mathrm{d}\log x }-g(x,h )\\
    \dfrac{\mathrm{d}^{} g(x,h)}{\mathrm{d}x^{}}=&-\dfrac{1}{2}\dfrac{\mathrm{d}^{} q(x)}{\mathrm{d}x^{}}\dfrac{\partial^{2} }{\partial h ^{2}}g(x,h)+\left( g(x,h)^{1+\mathrm{d}\log x }-g(x,h) \right)\Big/ \mathrm{d}x\\
     \dfrac{\mathrm{d}^{} g(x,h)}{\mathrm{d}x^{}}=&-\dfrac{1}{2}\dfrac{\mathrm{d}^{} q(x)}{\mathrm{d}x^{}}\dfrac{\partial^{2} }{\partial h ^{2}}g(x,h)+g(x,h)\dfrac{g^{\,\mathrm{d}\log x}-g^0}{x\,\mathrm{d}\log x}\\
     \dfrac{\mathrm{d}^{} g(x,h)}{\mathrm{d}x^{}}=&-\dfrac{1}{2}\dfrac{\mathrm{d}^{} q(x)}{\mathrm{d}x^{}}\dfrac{\partial^{2}g(x,h) }{\partial h ^{2}}+\dfrac{g(x,h)}{x}\log g(x,h)\\
\end{align}
$$ 

#### (B.10)

$$
\begin{align}
    \dfrac{1}{n}\log\mathrm{Tr}e^L=&\exp\left[ \dfrac{1}{2}q(0)\dfrac{\partial^{2} }{\partial h^{2}} \right] \dfrac{1}{n}\log [g(m_1,h)]^{n/m_1}\Big|_{h\to 0,m_1\to 0,m_1-0=\mathrm{d}x=x\to 0 }\\
    =&\exp\left[ \dfrac{1}{2}q(0)\dfrac{\partial^{2} }{\partial h^{2}} \right]\dfrac{1}{x}\log g(x,h)\Big|_{x,h\to 0}\\
    =&\exp\left[ \dfrac{1}{2}q(0)\dfrac{\partial^{2} }{\partial h^{2}} \right]f_0(0,h)\Big|_{h\to 0}\\
    =&\exp\left[ \dfrac{1}{2}q(0)\dfrac{\partial^{2} }{\partial h^{2}} \right]\int_{w\in\mathbb{R}}f_0(0,w)\delta(h-w)\,\mathrm{d}w\Bigg|_{h\to 0}\\
    =&\exp\left[ \dfrac{1}{2}q(0)\dfrac{\partial^{2} }{\partial h^{2}} \right]\int_{w\in\mathbb{R}}f_0(0,w)\int_{v\in\mathbb{R}}\dfrac{1}{2\pi}\exp\left[ iv(h-w) \right]\,\mathrm{d}v\,\mathrm{d}w\Bigg|_{h\to 0}\\
    =&\int_{w\in\mathbb{R}}\int_{v\in\mathbb{R}}f_0(0,w)\dfrac{1}{2\pi}\exp\left[ \dfrac{1}{2}q(0)\dfrac{\partial^{2} }{\partial h^{2}} \right]\exp\left[ iv(h-w) \right]\,\mathrm{d}v \,\mathrm{d}w\Bigg|_{h\to 0}\\
    (\text{Lemma 1})=&\int_{w\in\mathbb{R}}\int_{v\in\mathbb{R}}f_0(0,w)\dfrac{1}{2\pi}\exp\left[ -\dfrac{1}{2}q(0)v^2+iv(h-w) \right]\,\mathrm{d}v \,\mathrm{d}w\Bigg|_{h\to 0}\\
    =&\int_{w\in\mathbb{R}}f_0(0,w)\dfrac{1}{2\pi}\sqrt{\dfrac{\pi}{q(0)/2}}\exp\left[ \dfrac{-(w-h)^2}{2q(0)} \right]\,\mathrm{d}w\Bigg|_{h\to 0}\\
    =&\int_{w\in\mathbb{R}}f_0(0,w)\dfrac{1}{2\pi}\sqrt{\dfrac{\pi}{q(0)/2}}\exp\left[ \dfrac{-w^2}{2q(0)} \right]\,\mathrm{d}w\\
    (w=\sqrt{q_0}u)=&\int _uf(0,u) \,\mathrm{D}u
\end{align}
$$ 


