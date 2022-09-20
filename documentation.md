---
layout: page
title: Documentation
author: Tuorui Peng
---

Here are some useful scripts, programs, or any resources I think useful.

-----------

<div class="toc">
  {% assign texts_list = site.texts | sort: "date"  %}
  <h2>Content </h2>
  <button onclick="sortListDir()" id="sort_btn"> <span class="icon-sort-amount-desc" > Sort by Date &#09;</span> <span class="icon-sort-amount-desc">  &#xea4d;</span></button>
  <p></p>

  <ul id="sort_lst">
    {% assign texts_list = site.texts | sort: "date"  %}
    {% for node in texts_list reversed %}
      {% if node.title != null and node.category == 'Documentation' and node.date != null and node.url != "/404.html" %} 
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
          '{% if node.title != null and node.category == "Documentation" and node.date != null and node.url != "/404.html" %} '+
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
          '{% if node.title != null and node.category == "Documentation" and node.date != null and node.url != "/404.html" %} '+
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

--------------
