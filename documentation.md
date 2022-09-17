---
layout: page
title: Documentation
author: Tuorui Peng
---

Here are some useful scripts, programs, or any resources I think useful.

-----------

<div class="toc">
  <h2>Contents</h2>
  <p></p>
  <ul class="texts">
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

--------------
