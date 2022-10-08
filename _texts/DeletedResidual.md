---
layout: post
title: Residuals for Influential Diagnosis in Linear Regression
author: Vincent Peng
date: 2021/05/02
category: Knowledge
---

In linear regression, influential diagnosis is important to obtain better model fit and performance. Usually such diagnosis is based on residuals. Here are some important residuals that help locate influentials.

A point is called a influential if it **violate the model** + **could (potentially) influence the estimator**. The former is called outlier, the latter is called leverage.

## Recap: Linear regression
For linear model (with intercept)
$$
\begin{align}
    Y=\mathop{X}\limits_{n\times (p+1)} \mathop{\beta }\limits_{(p+1)\times 1} +\varepsilon ,\quad \varepsilon \sim N(0,\sigma ^2I)
\end{align}
$$ 

the OLS regression result:
$$
\begin{align}
    \hat{Y}=&X(X'X)^{-1}X'Y:=HY\\
    H:=&X(X'X)^{-1}X'=\dfrac{\partial^{} \hat{Y}}{\partial Y^{}}\\
    \hat{\beta }=&(X'X)^{-1}X'Y\sim N(\beta ,\sigma ^2(X'X)^{-1})\\
    e=&\hat{Y}-Y=(I-H)Y\sim N(0,\sigma ^2(I-H))\\
    \hat{\sigma }^2=&\dfrac{e'e}{n-p-1}=\dfrac{Y'(I-H)Y}{n-p-1}\\
     &\dfrac{(n-p-1)\hat{\sigma }^2}{\sigma ^2}\sim \chi^2_{n-p-1}
\end{align}
$$ 

## Residuals

### Self-sensitivity $$h_{ii}$$ for Leverage Point

Self-sensitivity $$h_{ii}$$ is the weight of data point in estimating $$\hat{Y}$$. $$h_{ii}$$ are the diagonal elements of hat matrix $$H$$.
$$
\begin{align}
    h_{ii}:=\dfrac{\partial^{} \hat{Y}}{\partial Y^{}}\Bigg|_{ii}=X_i'(X'X)^{-1}X_i=H_{ii}
\end{align}
$$ 

Comment: In linear regreesion, the design matrix $$X$$ is considered without randomness. Then the change in $$Y$$ would results in change of $$\hat{\beta }$$, and finally result in change of $$\hat{Y}$$. This is a measure of "how a data point is potentially capable of influencing estimation" -- Leverage.

### Standardized Residual $$e_{\mathrm{sd}i}$$ for Outlier

Standardized residual is just a normalization to $$\sigma ^2=1$$
$$
\begin{align}
    e_{\mathrm{sd}i}=\dfrac{e_i}{\sigma _{e_i}}=\dfrac{e_i}{\sigma \sqrt{1-h_{ii}}}\sim N(0,1)
\end{align}
$$ 

### Internally Studentized Residual $$r_i$$

(Internally) Studentized residual is obtained by replacing $$\sigma $$ into $$\hat{\sigma }$$ in standardized residual
$$
\begin{align}
    r_i=\dfrac{e_i}{\hat{\sigma }\sqrt{1-h_{ii}}}\sim t_{n-p-1}
\end{align}
$$ 

### Deleted Residual $$d_i$$ for Leverage

Recall that self-sensitivity reflected the influence when $$Y_i$$ changes. Here deleted residual focus on when $$Y_i$$ disappears. Denote $$\hat{Y}_{i(\wedge i)}$$ for estimator of $$Y_i$$ from the model without $$(X_i,Y_i)$$ involved (i.e. $$\hat{Y}_{i(\wedge i)}$$ is a predictor $$\hat{Y}_{i(\wedge i)}=X_i'\hat{\beta }_{(\wedge i)}$$).
$$
\begin{align}
    d_i=Y_i-\hat{Y}_{i(\wedge i)}\color{red}= \dfrac{e_i}{1-h_{ii}}
\end{align}
$$ 

Here's the proof for $$\color{red}=$$:

1. A lemma: $$(A+B)^{-1}=A^{-1}-\dfrac{1}{1+tr(BA^{-1})}A^{-1}BA^{-1} $$, where $$\mathrm{rank}(B)=1$$. Denote $$B=uv'$$, then:
    $$
    \begin{align}
        (A+B)^{-1}(A+B)=&I+A^{-1}B-\dfrac{A^{-1}B+A^{-1}BA^{-1}B}{1+tr(BA^{-1})}\\
        =&I+A^{-1}B-\dfrac{A^{-1}uv'+A^{-1}u (v'A^{-1}u)v' }{1+tr(BA^{-1}}\\
        =&I+A^{-1}B-\dfrac{A^{-1}uv'(1+tr(uv'A^{-1})) }{1+tr(BA^{-1}}\\
        =&I
    \end{align}
    $$ 

2. To solve $$\hat{\beta }_{(\wedge i)}=\left(X_{(\wedge i)}'X_{(\wedge i)}\right)^{-1}X'_{(\wedge i)}$$, here we denote $$X_i$$ as a *row vector*, i.e.$$X_i=(1,X_{i1},X_{i2},\ldots,X_{ip})$$. Using the above lemma:
    $$
    \begin{align}
        (X_{(\wedge i)}'X_{(\wedge i)})^{-1}=&(X'X-X_i'X_i)^{-1}\\
        =&(X'X)^{-1}+\dfrac{1}{1-tr[X_i'X_i(X'X)^{-1}]}(X'X)^{-1}X_i'X_i(X'X)^{-1}\\
        =&(X'X)^{-1}+\dfrac{1}{1-h_{ii}}(X'X)^{-1}X_i'X_i(X'X)^{-1}\\
        X_{(\wedge i)}Y_{(\wedge i)}=&X'Y-X_i'Y_i
    \end{align}
    $$

    then calaulate $$ \hat{\beta }_{(\wedge i)} $$:
    $$
    \begin{align}
        \hat{\beta }_{(\wedge i)}=&(X_{(\wedge i)}'X_{(\wedge i)})^{-1}X_{(\wedge i)}'Y_{(\wedge i)}\notag \\
        =&\left[(X'X)^{-1}+\dfrac{(X'X)^{-1}X_i'X_i(X'X)^{-1}}{1-h_{ii}}\right]\left(X'Y-X_i'Y_i\right)\notag\\
        =&\hat{\beta }+\dfrac{(X'X)^{-1}X_i'{X_i(X'X)^{-1}X'Y}}{1-h_{ii}}-(X'X)^{-1}X_i'Y_i-\dfrac{(X'X)^{-1}X_i'{X_i(X'X)^{-1}X_i'}Y_i}{1-h_{ii}}\notag\\
        =&\hat{\beta }+\dfrac{(X'X)^{-1}X_i'{\hat{Y}_i}}{1-h_{ii}}-\dfrac{(X'X)^{-1}X_i'Y_i(1-h_{ii})}{1-h_{ii}}-\dfrac{(X'X)^{-1}X_i'Y_i}{1-h_{ii}}{h_{ii}}\notag\\
        =&\hat{\beta }+\dfrac{(X'X)^{-1}X_i'}{1-h_{ii}}(\hat{Y}_i-Y_i)
    \end{align}
    $$
                    
3.  Then 
    $$
    \begin{align}
        Y_i-\hat{Y}_{i(\wedge i)}=&Y_i-\hat{Y}_i+\hat{Y}_i-\hat{Y}_{i(\wedge i)}\\
        =&e_i+X_i(\hat{\beta }-\hat{\beta }_{(\wedge i)})\\
        =&e_i+X_i(X'X)^{-1}X_i'\dfrac{e_i}{1-h_{ii}}\\
        =&\dfrac{e_i}{1-h_{ii}} 
    \end{align}
    $$

Comment: the result indicates that 
$$
\begin{align}
    d_i:=Y_i-\hat{Y}_{i(\wedge i)}=\dfrac{e_i}{1-h_{ii}}\sim N(0,\dfrac{\sigma ^2}{1-h_{ii}})
\end{align}
$$ 

where $$\sigma ^2=\hat{\sigma }_{(\wedge i)}^2$$ is estimated by the corresponding $$\mathrm{MSE}$$

### Externally Studentized Residual

In internally studentized residual, note that $$\hat{\sigma }^2$$ could be significantly influenced if $$Y_i$$ is an influential. To avoid the self-influence, $$e_i$$ is replaced by $$d_i$$, i.e.
$$
\begin{align}
    t_i:=\dfrac{d_i}{s(d_i)}=\dfrac{e_i}{\hat{\sigma }_{(\wedge i)}\sqrt{1-h_{ii}}}\sim t_{n-p-2}
\end{align}
$$ 

where the variance estimator is given by
$$
\begin{align}
    (n-p-2)\hat{\sigma }^2_{(\wedge i)}:=&(n-p-2)\hat{\sigma }^2
    {e'_{(\wedge i)}e_{(\wedge i)}}{}\\
    =&{(Y_{(\wedge i)}-X_{(\wedge i)}\beta _{(\wedge i)})'(Y_{(\wedge i)}-X_{(\wedge i)}\beta _{(\wedge i)})}\\
    =&(e'e-e_i^2)+\dfrac{2e_i}{1-h_{ii}}h_{ii}(\hat{Y}_i-Y_i)+\dfrac{e_i^2}{1-h_{ii}}h_{ii} \\
    =&e'e-\dfrac{e_i^2}{1-h_{ii}}\\
    =&(n-p-1)\hat{\sigma }^2-\dfrac{e_i^2}{1-h_{ii}}
\end{align}
$$ 

thus externally studentized residual $$t_i$$ could also be expressed by $$r_i$$ as:
$$
\begin{align}
    t_i=&\dfrac{e_i}{\hat{\sigma }_{(\wedge i)}\sqrt{1-h_{ii}}}\\
    =&\dfrac{e_i}{\hat{\sigma }\sqrt{1-h_{ii}}}\left(\dfrac{\hat{\sigma }}{\hat{\sigma }_{(\wedge i)}}\right)^{1/2}\\
    =&r_i\left(\dfrac{n-p-2}{n-p-1-r_i^2}\right)^{1/2}<r_i
\end{align}
$$ 