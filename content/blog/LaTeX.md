---
layout: post
title: LaTeX Head File
author: Vincent Peng
date: 2022/4/24
category: Documentation
---

Here I document two LaTeX head files I frequently use. By replacing all `CAPITALIZED CONTENTS` to what you need and compile with `xelatex` you could obtain a well pre-designed LaTeX document. For help with package or command, refer to [CTAN](https://www.ctan.org/) or [LaTeX Studio](https://www.latexstudio.net/).

### LaTeX head for general purpose:

<div class="content">
<pre>
\documentclass[11pt,a4paper]{ctexart}
%以下为所使用的宏包
\usepackage{ulem}%下划线
\usepackage{amsmath,amsfonts,amssymb,amsthm,amsbsy}%数学符号
\usepackage{graphicx}%插入图片
\usepackage{booktabs}%三线表
%\usepackage{indentfirst}%首行缩进
\usepackage{tikz}%作图
\usepackage{appendix}%附录
\usepackage{array}%多行公式/数组
\usepackage{makecell}%表格缩并
\usepackage{siunitx}%SI单位--\SI{number}{unit}
\usepackage{mathrsfs}%数学字体
\usepackage{enumitem}%列表间距
\usepackage{multirow}%列表横向合并单元格
\usepackage[colorlinks,linkcolor=red,anchorcolor=blue,citecolor=green]{hyperref}%超链接引用
\usepackage{float}%图片、表格位置排版
\usepackage{pict2e,keyval,fp,diagbox}%带有斜线的表格
\usepackage{fancyvrb,listings}%设置代码插入环境
\usepackage{minted}%代码环境设置
\usepackage{fontspec}%字体设置
\usepackage{color,xcolor}%颜色设置
\usepackage{titlesec} %自定义标题格式
\usepackage{tabularx}%列表扩展
\usepackage{authblk}%titlepage作者信息
\usepackage{nicematrix}%更好的矩阵标定
\usepackage{fbox}%更多浮动体盒子

%以下是页边距设置
\usepackage[left=0.5in,right=0.5in,top=0.81in,bottom=0.8in]{geometry}

%以下是段行设置
\linespread{1.4}%行距
\setlength{\parskip}{0.1\baselineskip}%段距
\setlength{\parindent}{2em}%缩进

%其他设置
\numberwithin{equation}{section}%公式按照章节编号
\newenvironment{point}{\raggedright$\blacktriangleright$}{}

%代码环境\lst设置
\definecolor{CodeBlue}{HTML}{268BD2}
\definecolor{CodeBlue2}{HTML}{0000CD}
\definecolor{CodeGreen}{HTML}{2AA1A2}
\definecolor{CodeRed}{HTML}{CB4B16}
\definecolor{CodeYellow}{HTML}{B58900}
\definecolor{CodePurPle}{HTML}{D33682}
\definecolor{CodeGreen2}{HTML}{859900}
\lstset{
    basicstyle=\tt,%字体设置
    numbers=left, %设置行号位置
    numberstyle=\tiny\color{black}, %设置行号大小
    keywordstyle=\color{black}, %设置关键字颜色
    stringstyle=\color{CodeRed}, %设置字符串颜色
    commentstyle=\color{CodeGreen}, %设置注释颜色
    frame=single, %设置边框格式
    escapeinside=``, %逃逸字符(1左面的键)，用于显示中文
    %breaklines, %自动折行
    extendedchars=false, %解决代码跨页时，章节标题，页眉等汉字不显示的问题
    xleftmargin=2em,xrightmargin=2em, aboveskip=1em, %设置边距
    tabsize=4, %设置tab空格数
    showspaces=false, %不显示空格
    emph={TRUE,FALSE,NULL,NAN,NA,<-,},emphstyle=\color{CodeBlue2}, %其他高亮}
}

%节标题格式设置
% \titleformat{\section}[block]{\large\bfseries}{Exercise II.\arabic{section}}{1em}{}[]
% \titleformat{\subsection}[block]{}{    \arabic{section}.(\alph{subsection})}{1em}{}[]
% \titleformat{\subsubsection}[block]{\normalsize\bfseries}{    \arabic{subsection}-\alph{subsubsection}}{1em}{}[]
% \titleformat{\paragraph}[block]{\small\bfseries}{[\arabic{paragraph}]}{1em}{}[]

% \titleformat{\sectioncommand}[shape]{format}{title-label}{sep}{before-title}[after-title]


% 中文字号
% 初号42pt, 小初36pt, 一号26pt, 小一24pt, 二号22pt, 小二18pt, 三号16pt, 小三15pt, 四号14pt, 小四12pt, 五号10.5pt, 小五9pt

\begin{document}

\begin{center}\thispagestyle{plain}
    {\LARGE\textbf{YOUT TITLE}}

    AUTHOR\footnote{AUTHOR CONTACT}
\end{center}

{{CONTENT}}

\end{document}
</pre>
</div>






### LaTeX head for experiment report:

<div class="content">
<pre>
\\documentclass[11pt,a4paper]{ctexart}
%以下为所使用的宏包
\usepackage{ulem}%下划线
\usepackage{amsmath,amsfonts,amssymb,amsthm,amsbsy}%数学符号
\usepackage{graphicx}%插入图片
\usepackage{booktabs}%三线表
%\usepackage{indentfirst}%首行缩进
\usepackage{tikz}%作图
\usepackage{appendix}%附录
\usepackage{array}%多行公式/数组
\usepackage{makecell}%表格缩并
\usepackage{siunitx}%SI单位--\SI{number}{unit}
\usepackage{mathrsfs}%数学字体
\usepackage{enumitem}%列表间距
\usepackage{multirow}%列表横向合并单元格
\usepackage[colorlinks,linkcolor=red,anchorcolor=blue,citecolor=green]{hyperref}%超链接引用
\usepackage{float}%图片、表格位置排版
\usepackage{pict2e,keyval,fp,diagbox}%带有斜线的表格
\usepackage{fancyvrb,listings}%设置代码插入环境
\usepackage{minted}%代码环境设置
\usepackage{fontspec}%字体设置
\usepackage{color,xcolor}%颜色设置
\usepackage{titlesec} %自定义标题格式
\usepackage{tabularx}%列表扩展
\usepackage{authblk}%titlepage作者信息
\usepackage{nicematrix}%更好的矩阵标定
\usepackage{fbox}%更多浮动体盒子

%以下是段行设置
\linespread{1.4}%行距
\setlength{\parskip}{0.1\baselineskip}%段距
\setlength{\parindent}{2em}%缩进


%其他设置
\numberwithin{equation}{section}%公式按照章节编号
\newenvironment{point}{\raggedright$\blacktriangleright$}{}


%代码环境\lst设置
\definecolor{CodeBlue}{HTML}{268BD2}
\definecolor{CodeBlue2}{HTML}{0000CD}
\definecolor{CodeGreen}{HTML}{2AA1A2}
\definecolor{CodeRed}{HTML}{CB4B16}
\definecolor{CodeYellow}{HTML}{B58900}
\definecolor{CodePurPle}{HTML}{D33682}
\definecolor{CodeGreen2}{HTML}{859900}
\lstset{
    basicstyle=\tt,%字体设置
    numbers=left, %设置行号位置
    numberstyle=\tiny\color{black}, %设置行号大小
    keywordstyle=\color{black}, %设置关键字颜色
    stringstyle=\color{CodeRed}, %设置字符串颜色
    commentstyle=\color{CodeGreen}, %设置注释颜色
    frame=single, %设置边框格式
    escapeinside=``, %逃逸字符(1左面的键)，用于显示中文
    %breaklines, %自动折行
    extendedchars=false, %解决代码跨页时，章节标题，页眉等汉字不显示的问题
    xleftmargin=2em,xrightmargin=2em, aboveskip=1em, %设置边距
    tabsize=4, %设置tab空格数
    showspaces=false, %不显示空格
    emph={TRUE,FALSE,NULL,NAN,NA,<-,},emphstyle=\color{CodeBlue2}, %其他高亮}
}


%节标题格式设置
% \titleformat{\section}[block]{\large\bfseries}{Exercise II.\arabic{section}}{1em}{}[]
% \titleformat{\subsection}[block]{}{    \arabic{section}.(\alph{subsection})}{1em}{}[]
% \titleformat{\subsubsection}[block]{\normalsize\bfseries}{    \arabic{subsection}-\alph{subsubsection}}{1em}{}[]
% \titleformat{\paragraph}[block]{\small\bfseries}{[\arabic{paragraph}]}{1em}{}[]

% \titleformat{\sectioncommand}[shape]{format}{title-label}{sep}{before-title}[after-title]

% 中文字号
% 初号42pt, 小初36pt, 一号26pt, 小一24pt, 二号22pt, 小二18pt, 三号16pt, 小三15pt, 四号14pt, 小四12pt, 五号10.5pt, 小五9pt

\usepackage[left=2.5cm,right=2.5cm,top=3.5cm,bottom=3.5cm]{geometry}
\setmainfont{Times New Roman} %英文字体设置
\linespread{1.05}%行距\selectfont 
\usepackage[comma, super, square]{natbib}%参考文献，右上角方括号数字
\usepackage[numbib]{tocbibind}
\renewcommand{\bibname}{参考文献}%参考文献自动成一节
\usepackage{setspace}%灵活改变行间距 \setstretch{linespread}

\begin{titlepage}
\title{\fontsize{22pt}{\baselineskip}\songti CHN TITLE} %标题二号宋体
\author{\fontsize{12pt}{\baselineskip}\kaishu CHN AUTHOR NAME\\ %姓名学号五号楷体
\fontsize{10 pt}{\baselineskip}\kaishu CHN DEPARTMENT AND SCHOOL} %单位六号楷体
\date{\today}
\end{titlepage}


\begin{document}
\maketitle
\renewcommand{\abstract}{\noindent\textbf{摘$ \quad $要:}}
\begin{abstract}
CHN ABSTRACT\\
\noindent\textbf{关键词：}CHN KEYWORDS
\end{abstract}
\begin{center}
\fontsize{14pt}{\baselineskip}\selectfont ENG TITLE\\
\fontsize{10.5pt}{\baselineskip}\selectfont \textbf{ENG AUTHOR NAME}\\
\fontsize{9pt}{\baselineskip}\selectfont ENG DEPARTMENT AND SCHOOL
\end{center}
\renewcommand{\abstract}{\noindent\textbf{Abstract:}}
\begin{abstract}
ENG ABSTRACT\\
\noindent\textbf{Key Words:}ENG KEYWORDS
\end{abstract}
\setstretch{1.4}
\section{引言}

{{CONTENT}}

\end{document}
</pre>
</div>

