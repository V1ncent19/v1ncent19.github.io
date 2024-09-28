---
layout: page
title: L'art Culinaire
author: Tuorui Peng
---

I love cooking! I've been exploring all kinds of cuisines, and I'm still learning. Here are some of my favorite repasts. I just treat this section as a personal cookbook or diary. I hope you enjoy it!

**Side note**: maybe a better name for this part is "La science Culinaire", because for me cooking is more like a science than an art lol. If possible, I always try to understand the mechanism behind the recipe and cooking tricks. 

有时候我也会翻车，观看更多失败案例请移步我的 pyq。


<div class="toc">
  {% assign texts_list = site.texts | sort: "date"  %}
  <h2>Content </h2>
  <button onclick="sortListDir()" id="sort_btn"> <span class="icon-sort-amount-desc" > Sort by Date &#09;</span> <span class="icon-sort-amount-desc">  &#xea4d;</span></button>
  <p></p>

  <ul id="sort_lst">
    {% assign texts_list = site.texts | sort: "date"  %}
    {% for node in texts_list reversed %}
      {% if node.title != null and node.category == 'Cuisine' and node.date != null and node.url != "/404.html" %} 
        <li class="text-title">
          <a href="{{ site.baseurl }}/../{{ node.url }}">
            {{ node.title }}
          </a>
          <div class="post-date small"> <I>{{ node.date | date: '%B %-d, %Y' }}</I></div>
        </li>
      {% endif %}
    {% endfor %}
    </ul>
</div>

------------------


  <script>
  var dir = 'a'
  function sortListDir() {
    var list = document.getElementById("sort_lst");
    var btn = document.getElementById("sort_btn");
      if (dir == 'a'){
        list.innerHTML = '{% assign texts_list = site.texts | sort: "title"  %}'+
        '{% for node in texts_list %}'+
          '{% if node.title != null and node.category == "Cuisine" and node.date != null and node.url != "/404.html" %} '+
            '<li class="text-title">'+
              '<a href="{{ site.baseurl }}/../{{ node.url }}">'+
                '{{ node.title }}'+
              '</a>'+
              '<div class="post-date small"> <I>{{ node.date | date: "%B %-d, %Y" }}</I></div>'+
            '</li>'+
          '{% endif %}'+
        '{% endfor %}';
        btn.innerHTML = ' <span class="icon-sort-amount-desc" > Sort by Title &#09;</span> <span class="icon-sort-amount-desc">  &#xea4d;</span>';
        dir = 'd';
      } else {
        list.innerHTML = '{% assign texts_list = site.texts | sort: "date"  %}'+
        '{% for node in texts_list reversed %}'+
          '{% if node.title != null and node.category == "Cuisine" and node.date != null and node.url != "/404.html" %} '+
            '<li class="text-title">'+
              '<a href="{{ site.baseurl }}/../{{ node.url }}">'+
                '{{ node.title }}'+
              '</a>'+
              '<div class="post-date small"> <I>{{ node.date | date: "%B %-d, %Y" }}</I></div>'+
            '</li>'+
          '{% endif %}'+
        '{% endfor %}';
        btn.innerHTML = '<span class="icon-sort-amount-desc" > Sort by Date </span> <span class="icon-sort-amount-desc">  &#xea4d;</span>';
        dir = 'a';
      }
      
  }
  </script>


## Chinese Cuisine

Being a native cantonese, my favourite chinese cuisine is definitely cantonese cuisine! But I notice that it's really hard to buy some of the ingredients in the US, so updating this section is a bit difficult. Mostly depend on what I bought from the local HK supermarket lmao.

广东菜，yyds！可能是广东仔天生对于辣味的糟糕掌握度，我目前还没怎么尝试辣口的菜品，基本都是普通广东口味，但是这里材料好难买，每次都要跑一趟香港超市，所以更新有点困难，基本取决于我能买到啥= =。

### 香煎鸡排配辛拉面

[辛拉面]({{ site.baseurl }}/texts/shinramen). 这是广东菜吗？idk，但这就是辛拉面。1刀的价格，10分钟的烹饪时间，任意的食材搭配，浓郁的汤底料包，后面忘了，总之味道就啊啊啊啊啊啊😫😫（梗出处见[showmaker奎桑提圣经](https://www.bilibili.com/video/BV15k4y1M79s/?spm_id_from=333.337.search-card.all.click)）

![辛拉面]({{site.baseurl}}/assets/photos/cuisine/shinramen.jpg)


### 豉汁排骨

[豉汁排骨]({{ site.baseurl }}/texts/chizhipaigu). 真的就是材料太难买了，下次试试能不能整个黑椒牛仔骨玩玩。
![豉汁排骨]({{site.baseurl}}/assets/photos/cuisine/chizhipaigu.jpg)

### 青椒炒鸡


[青椒炒鸡]({{ site.baseurl }}/texts/qingjiaochaoji)，展现了一定的烹饪方法上的解析延拓能力，但是辣麻了。

**Note**：经过多次试验，目前这里的版本是错误的做法，改日录制了正确的做法会再加更新。

![青椒炒鸡]({{site.baseurl}}/assets/photos/cuisine/qingjiaochaorou2.jpg)

### （广式）炖牛腩

[炖牛腩]({{ site.baseurl }}/texts/niunan). 牛腩汤意大利面确实不行。

![炖牛腩]({{site.baseurl}}/assets/photos/cuisine/niunan2.jpg)

### 炒饭

[炒饭]({{ site.baseurl }}/texts/chaofan). 一直以为炒饭这个东西应该有很多种炒法，而大家都会认为自己的炒法是最正宗的（笑）。这个假期我在家尝试了若干次，在此提供一下实验成果和相关的炒饭哲学。

![炒饭]({{site.baseurl}}/assets/photos/cuisine/chaofan1.jpg)











## Western Cuisine

### Ragù alla Bolognese

[Ragù alla Bolognese]({{ site.baseurl }}/texts/bolognese). 第二次才成功，效果非常好，熬一次酱能吃大半个月，在我不知道吃什么的时候总能拿这个当 plan B。

![Bolognese]({{site.baseurl}}/assets/photos/cuisine/bolognese3.jpg)

### Spaghetti alla Carbonara

[Carbonara]({{site.baseurl}}/texts/carbonara). 一直以为这个是很难的菜，其实做起来真的很难，做了三四次我都搞不好温度，马上人要红温了。

![Carbonara]({{site.baseurl}}/assets/photos/cuisine/carbonara.jpg)

### 奶汁烩一切

[Creme]({{site.baseurl}}/texts/creme). 咱就是说奶汁烩菜这个真是好啊，吃完之后汁还能再捞一顿意面，做一顿等于做两顿。

![奶汁烩鸡]({{site.baseurl}}/assets/photos/cuisine/creme2.jpg)

### 煎牛排

[Steak]({{site.baseurl}}/texts/steak). 主题就是熟能生巧。

![煎牛排]({{site.baseurl}}/assets/photos/cuisine/steak1.jpg)

### 慕斯蛋糕

[Mousse]({{site.baseurl}}/texts/mousse). 目前还处在研发阶段，处于一个还不错，能吃的状态，以后买了称和硅胶勺应该能做的更好，主要是现在有甜点吃了。

![慕斯蛋糕]({{site.baseurl}}/assets/photos/cuisine/mousse1.jpg)


### Clam Chowder

[Clam Chowder]({{site.baseurl}}/texts/clamchowder). 在Boston吃到后一直觉得不错，回来后自己复刻的，感觉还不错。

![Clam Chowder]({{site.baseurl}}/assets/photos/cuisine/clamchowder.jpg)
