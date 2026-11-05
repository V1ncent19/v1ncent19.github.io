---
layout: post
title: LaTeX VSCode Snippets
author: Vincent Peng
date: 2023/10/06
category: Documentation
---



My VSCode Snippet Settings (the json file) for LaTeX. The Snippets allow me to quickly input some common LaTeX commands.


<div class="content">
<pre>

{
	// Place your snippets for latex here. Each snippet is defined under a snippet name and has a prefix, body and 
	// description. The prefix is what is used to trigger the snippet and the body will be expanded and inserted. Possible variables are:
	// $1, $2 for tab stops, $0 for the final cursor position, and ${1:label}, ${2:another} for placeholders. Placeholders with the 
	// same ids are connected.
	// Example:
	// "Print to console": {
	// 	"prefix": "log",
	// 	"body": [
	// 		"console.log('$1');",
	// 		"$2"
	// 	],
	// 	"description": "Log output to console"
		// }


	"Input a figure": {
        "prefix": "\\figure",
        "body": [
            "\\begin{figure}[${1:htbp}]",
            "\t\\centering",
            "\t\\includegraphics[width=0.7\\linewidth]{$2}",
            "\t\\caption{$3}",
            "\t\\label{$3}",
            "\\end{figure}",
            "$0"
        ],
        "description": "Input a figure"
    },

	"Fraction":{
		"prefix":["\\frac","@/","/"],
		"body":[
			"\\dfrac{ ${1:${TM_SELECTED_TEXT}} }{ $2 } $0"
		],
		"description": "Input a dfraction"
	},

	"Partial":{
		"prefix": ["pd","\\pd"],
		"body":[
			"\\dfrac{\\partial^{$1} $2 }{\\partial $3^{$1} }"
		],
		"description": "Partial Derivative"
	},

	"derivative":{
		"prefix": ["\\d"],
		"body": "\\dfrac{\\mathrm{d}^{$1} $2 }{\\mathrm{d} $3^{$1} }","description": "Derivative"
	},

	"MakeTabular":{
		"prefix":["tabular","\\tabular","table","\\table"],
		"body": [
			"\\begin{table}[${1:H}]",
			"\t\\centering",
			"\t\\renewcommand\\arraystretch{1.15}",
			"\t\\begin{tabular}{$2}",
			"\t\t\\hline\n",
			"\t\t\\hline",
			"\t\\end{tabular}",
			"\t\\caption{$0}",
			"\t\\label{$0}",
			"\\end{table}\n"
		],
		"description": "Make Table"
	},

	// "Bra":{
	// 	"prefix": ["bra"],
	// 	"body": "\\langle ${1:\\psi} |$0",
	// 	"description": "<Bra|"
	// },
	// "Ket":{
	// 	"prefix": ["ket","\\ket"],
	// 	"body": "| ${2:\\psi} \\rangle$0",
	// 	"description": "|Ket>"
	// },
	// "Bra_Ket":{
	// 	"prefix": ["braket","bk","\\bk","\\braket"],
	// 	"body": "\\langle $1 | $2 \\rangle$0",
	// 	"description": "Bra_Ket"
	// },

	"Itemize":{
		"prefix": "\\itemize",
		"body": [
			"\\begin{itemize}[topsep=2pt,itemsep=0pt]",
			"\t\\item $0",
			"\\end{itemize}\n\n\t"
		]
	},

	"Enumerate":{
		"prefix": "\\enumerate",
		"body": [
			"\\begin{enumerate}[topsep=2pt,itemsep=2pt]",
			"\t\\item $0",
			"\\end{enumerate}\n\n\t"
		]
	},

	"Sample":{
		"prefix": "\\sample",
		"body": [
			"\\vec{${1:X}}=(${1:X}_{1},${1:X}_{2},\\ldots,${1:X}_{${2:n}}) $0"
		],
		"description": "Random Sample"
	},

	"displaystyle":{
		"prefix": "\\ds",
		"body": "{\\displaystyle ${1:${TM_SELECTED_TEXT}} } $0"
	},
	"dsum":{
		"prefix": "\\dsum",
		"body": "\\sum\\limits${1:${TM_SELECTED_TEXT}}"
	},
	"dlim":{
		"prefix": "\\dlim",
		"body": "\\lim\\limits_{ ${1:${TM_SELECTED_TEXT}} }$0"
	},


	"mathscr":{
		"prefix": "\\mathscr",
		"body": "\\mathscr{ ${1:${TM_SELECTED_TEXT}} }$0"
	},

	"int":{
		"prefix": "\\integrate",
		"body": "\\int ${TM_SELECTED_TEXT}$1 \\,\\mathrm{d}${2:x}"
	},
	"intd":{
		"prefix": ["\\dx","\\dz","\\dt","dd"],
		"body": "\\,\\mathrm{d}${2:x}",
		"description": "d_"
	},

	"LongTitle":{
		"prefix": ["longtitle","\\longtitle"],
		"body": [
			"\\begin{titlepage}",
			"\t\\title{$1}",
			"\t\\author{}",
			"\t\\date{\\today}",
			"\\end{titlepage}",
			"\n\n\n\\begin{document}\n\t$0",
			"\n\n\n\n\n\n\n\\end{document}"
		]
	},
	"ShortTitle":{
		"prefix": ["shorttitle","\\shorttitle"],
		"body": [
			"\\begin{document}\n",
			"\\begin{center}\\thispagestyle{plain}",
			"\t{\\LARGE\\textbf{$1}}\n\n\t",
			"\\end{center}",
			"\n\n\n\n\n\\end{document}"
		]
	},
	"HWTitle":{
		"prefix": ["hwtitle","\\hwtitle"],
		"body": [
			"\\begin{document}\n",
			"\\begin{center}\\thispagestyle{plain}\n",
			"{\\LARGE\\textbf{\t\t\t\t}}\n",
			"{\\Large\\textbf{HW}}\n",
			"\\footnote{}",
			"\\end{center}\n",
			"\\thispagestyle{myheadings}\\markright{Compiled using \\LaTeX}",
			"\\pagestyle{myheadings}\\markright{}",
			"\n\n\n\n\n $0 \n\n",
			"\\section{}"
			"\n\n\n\n\n\\end{document}"
		]
	},
	"abstract":{
		"prefix": "abstract",
		"body": ["\n\\begin{abstract}",
		"\t$0。\\\\\\\\",
		"\\indent\\textbf{关键词：}",
		"\\end{abstract}\n"],
	},
	

	"Const":{
		"prefix": ["\\const","const"],
		"body": "\\mathrm{const}"
	},
	
	"Lto":{
		"prefix": ["Lto","dto","\\Lto","\\dto"],
		"body": "\\xrightarrow[]{\\mathrm{d}} $0"
	},
	"pto":{
		"prefix": ["pto","\\pto"],
		"body": "\\xrightarrow[]{\\mathrm{p}} $0"
	},
	"asto":{
		"prefix": ["asto","\\asto"],
		"body": "\\xrightarrow[]{\\mathrm{a.s.}} $0"
	},
	"msto":{
		"prefix": ["msto","\\msto"],
		"body": "\\xrightarrow[]{\\mathrm{m.s.}} $0"
	},

	"Point":{
		"prefix": "\\point",
		"body": "\\begin{point}\n\t${TM_SELECTED_TEXT}$1\n\\end{point}\n$0"
	},

	"RLanguage":{
		"prefix": "\\R",
		"body": "\\begin{lstlisting}[language=R]\n$0\n\\end{lstlisting}\n"
	},

	"newline":{
		"prefix": "\\\\",
		"body": "\\\\\\\\"
	},

	"BeginningLaTeX":{
		"prefix": ["beginlatex"],
		"body": [
			"\\documentclass[11pt,a4paper]{ctexart}",
			"%以下为所使用的宏包",
			"\\usepackage{ulem}%下划线",
			"\\usepackage{amsmath,amsfonts,amssymb,amsthm,amsbsy}%数学符号",
			"\\usepackage{graphicx}%插入图片",
			"\\usepackage{booktabs}%三线表",
			"%\\usepackage{indentfirst}%首行缩进",
			"\\usepackage{tikz}%作图",
			"\\usepackage{appendix}%附录",
			"\\usepackage{array}%多行公式/数组",
			"\\usepackage{makecell}%表格缩并",
			"\\usepackage{siunitx}%SI单位--\\SI{number}{unit}",
			"\\usepackage{mathrsfs}%数学字体",
			"\\usepackage{enumitem}%列表间距",
			"\\usepackage{multirow}%列表横向合并单元格",
			"\\usepackage[colorlinks,linkcolor=red,anchorcolor=blue,citecolor=green]{hyperref}%超链接引用",
			"\\usepackage{float}%图片、表格位置排版",
			"\\usepackage{pict2e,keyval,fp,diagbox}%带有斜线的表格",
			"\\usepackage{fancyvrb,listings}%设置代码插入环境",
			"\\usepackage{minted}%代码环境设置",
			"\\usepackage{fontspec}%字体设置",
			"\\usepackage{color,xcolor}%颜色设置",
			"\\usepackage{titlesec} %自定义标题格式",
			"\\usepackage{tabularx}%列表扩展",
			"\\usepackage{authblk}%titlepage作者信息",
			"\\usepackage{nicematrix}%更好的矩阵标定",
			"\\usepackage{fbox}%更多浮动体盒子",
			"\n\n",
			"%以下是页边距设置",
			"\\usepackage[left=0.5in,right=0.5in,top=0.81in,bottom=0.8in]{geometry}\n",
			"%以下是段行设置",
			"\\linespread{1.4}%行距",
			"\\setlength{\\parskip}{0.1\\baselineskip}%段距",
			"\\setlength{\\parindent}{2em}%缩进",
			"\n",
			"%其他设置",
			"\\numberwithin{equation}{section}%公式按照章节编号",
			"\\newenvironment{point}{\\raggedright$\\blacktriangleright$}{}",
			"\\newenvironment{algorithm}[1]{\\vspace{12pt} \\hrule\\hrule \\vspace{3pt} \\noindent\\textbf{\\color[HTML]{E63F00}Algorithm } \\,\\textit{#1} \\vspace{3pt} \\hrule\\vspace{6pt}}{\\vspace{6pt}\\hrule\\hrule \\vspace{12pt}} % 算法伪代码格式环境",
			"\n",
			"%代码环境\\lst设置",
			"\\definecolor{CodeBlue}{HTML}{268BD2}",
			"\\definecolor{CodeBlue2}{HTML}{0000CD}",
			"\\definecolor{CodeGreen}{HTML}{2AA1A2}",
			"\\definecolor{CodeRed}{HTML}{CB4B16}",
			"\\definecolor{CodeYellow}{HTML}{B58900}",
			"\\definecolor{CodePurPle}{HTML}{D33682}",
			"\\definecolor{CodeGreen2}{HTML}{859900}",
			"\\lstset{",
			"    basicstyle=\\tt,%字体设置",
			"    numbers=left, %设置行号位置",
			"    numberstyle=\\tiny\\color{black}, %设置行号大小",
			"    keywordstyle=\\color{black}, %设置关键字颜色",
			"    stringstyle=\\color{CodeRed}, %设置字符串颜色",
			"    commentstyle=\\color{CodeGreen}, %设置注释颜色",
			"    frame=single, %设置边框格式",
			"    escapeinside=`, %逃逸字符(1左面的键)，用于显示中文",
			"    %breaklines, %自动折行",
			"    extendedchars=false, %解决代码跨页时，章节标题，页眉等汉字不显示的问题",
			"    xleftmargin=2em,xrightmargin=2em, aboveskip=1em, %设置边距",
			"    tabsize=4, %设置tab空格数",
			"    showspaces=false, %不显示空格",
			"    emph={TRUE,FALSE,NULL,NAN,NA,<-,},emphstyle=\\color{CodeBlue2}, %其他高亮}",
			"}",
			"\n",
			"%节标题格式设置",
			"% \\titleformat{\\section}[block]{\\large\\bfseries}{Exercise \\arabic{section}}{1em}{}[]",
			"% \\titleformat{\\subsection}[block]{}{    \\arabic{section}.(\\alph{subsection})}{1em}{}[]",
			"% \\titleformat{\\subsubsection}[block]{\\normalsize\\bfseries}{    \\arabic{subsection}-\\alph{subsubsection}}{1em}{}[]",
			"% \\titleformat{\\paragraph}[block]{\\small\\bfseries}{[\\arabic{paragraph}]}{1em}{}[]",
			"\n",
			"% \\titleformat{\\sectioncommand}[shape]{format}{title-label}{sep}{before-title}[after-title]",
			"\n",
			"",
			"% 中文字号",
			"% 初号42pt, 小初36pt, 一号26pt, 小一24pt, 二号22pt, 小二18pt, 三号16pt, 小三15pt, 四号14pt, 小四12pt, 五号10.5pt, 小五9pt",
		],
	},

	"lstinline":{
		"prefix": "\\rinline",
		"body": "\\lstinline|$1|$0"
	},

	"textbf":{
		"prefix": "\\bf",
		"body": "\\textbf{${1:${TM_SELECTED_TEXT}}}$0"
	},
	"mathrm":{
		"prefix": "\\rm",
		"body": "\\mathrm{ ${1:${TM_SELECTED_TEXT}} } $0"
	},
	"samplematrix":{
		"prefix": "\\samplematrix",
		"body": [
		"\\begin{bmatrix}",
		"${1:x}_{11}&${1:x}_{12}&\\ldots&${1:x}_{1${3:p}}\\\\\\\\",
		"${1:x}_{21}&${1:x}_{22}&\\ldots&${1:x}_{2${3:p}}\\\\\\\\",
		"\\vdots&\\vdots&\\ddots&\\vdots\\\\\\\\",
		"${1:x}_{${2:n}1}&${1:x}_{${2:n}2}&\\ldots&${1:x}_{${2:n}${3:p}}\\\\\\\\",
		"\\end{bmatrix}$0"
		],
		"description": "sample x_np"
	},
	"exp1":{
		"prefix": "\\exp",
		"body": "\\exp\\left[ ${1:${TM_SELECTED_TEXT}} \\right]$0"
	},
	"exp2":{
		"prefix": "\\exp",
		"body": "\\exp\\left\\{ ${1:${TM_SELECTED_TEXT}} \\right\\\\}$0"
	},
	"BelowSubscript":{
		"prefix": ["\\below","\\down"],
		"body": "\\mathop{ $1 }\\limits_{$2} $0"
	},
	"LHS":{
		"prefix": "LHS",
		"body": " \\mathrm{L.H.S.}"
	},
	"RHS":{
		"prefix": "RHS",
		"body": " \\mathrm{R.H.S.}"
	},
	"rightarrow":{
		"prefix": ["get","\\get"],
		"body": " \\Rightarrow "
	},
	"betahat":{
		"prefix": "hbeta",
		"body": "\\hat{\\beta}$0"
	},
	"SS":{
		"prefix": "\\ss",
		"body": "\\mathrm{SS$1} $0 "
	},
	"MS":{
		"prefix": "\\ms",
		"body": "\\mathrm{MS$1} $0 "
	},
	"inv":{
		"prefix": ["inv","\\inv"],
		"body": "^{-1}"
	},
	"rcode":{
		"prefix":["\\code"],
		"body": ["\\begin{rcode}",
			"\\begin{lstlisting}[language=R]",
			"$0",
			"\\end{lstlisting}",
			"\\end{rcode}",
		]
	},
	"approx":{
		"prefix": "\\~~",
		"body": "\\approx ",
	},
	"Fourier Transformation":{
		"prefix": "\\fourier",
		"body": "\\mathscr{F}\\left[ ${1:${TM_SELECTED_TEXT}} \\right] $0",
	},
	"bibitem":{
		"prefix": "\\makebib",
		"body": ["\\newpage",
		"\\begin{thebibliography}{99}",
		"\\bibitem{ref-1}",
		"$0",
		"\\end{thebibliography}"
		]
	},
	"bib":{
		"prefix": ["\\bib","\\thebib"],
		"body": ["\\addcontentsline{toc}{section}{参考文献}",
			"\\begin{thebibliography}{99}",
		  	"  \\bibitem{cite1}",
			"$0",
			"\\end{thebibliography}",]
		},
	"R.":{
		"prefix": "\\R.",
		"body": "\\lstinline|R.| $0",
	},
	"norm":{
		"prefix": "\\norm",
		"body": "\\left\\Vert ${1:${TM_SELECTED_TEXT}} \\right\\Vert $0"
	},
	"abs":{
		"prefix": "\\abs",
		"body": "\\left\\vert ${1:${TM_SELECTED_TEXT}} \\right\\vert $0"
	},

	"probability":{
		"prefix": "\\pr",
		"body": "\\mathbb{P}\\left( ${1:${TM_SELECTED_TEXT}} \\right) $0"
	},
	"expectation":{
		"prefix": "\\e",
		"body": "\\mathbb{E}\\left[ ${1:${TM_SELECTED_TEXT}} \\right] $0"
	},
	"backshift operator":{
		"prefix": "\\back",
		"body": "\\mathscr{B}\\left( ${1:${TM_SELECTED_TEXT}} \\right) $0"
	},
	"independent of":{
		"prefix": ["\\independent","\\idpd"],
		"body": "\\independent",
		"description": "independent of"
	},
	"inner product":{
		"prefix": "\\ip",
		"body": "\\left\\langle $1 \\right\\rangle $0",
	},
	"algorithm":{
		"prefix": "\\algorithm",
		"body": ["\\begin{algorithm}{$1}",
		"\t$2",
		"\\end{algorithm}",
		"\t$0"
		],
	},
	"quick left right":{
		"prefix": "\\lr",
		"body": "\\left${TM_SELECTED_TEXT}$1 \\right$0"
	},
	""
}
</pre>
</div>


