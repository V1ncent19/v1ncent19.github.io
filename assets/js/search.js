---

---
// Based on a script by Kathie Decora : katydecorah.com/code/lunr-and-jekyll/

// Create the lunr index for the search
var index = lunr(function () {
  this.field('title')
  this.field('author')
  this.field('layout')
  this.field('date')
  this.field('category')
  this.field("content", { boost: 10 });
  this.ref('id')
});

// Add to this index the proper metadata from the Jekyll content
{% assign count = 0 %}
{% for text in site.texts %}
index.add({
  title: {{text.title | jsonify}},
  author: {{text.author | jsonify}},
  layout: {{text.layout | jsonify}},
  date: {{text.date | jsonify}},
  // category: {{text.category | jsonify}}
  content: {{text.content  | strip_html| jsonify}},
  id: {{count}}
});{% assign count = count | plus: 1 %}
{% endfor %}
// console.log( jQuery.type(index) );

// Builds reference data (maybe not necessary for us, to check)
var store = [{% for text in site.texts %}{
  "title": {{text.title | jsonify}},
  "author": {{text.author | jsonify}},
  "layout": {{ text.layout | jsonify }},
  "link": {{text.url | jsonify}},
  "date": {{text.date |date: '%B %-d, %Y'| jsonify }},
  "category": {{text.category | jsonify}},
  "excerpt": {{ text.content | strip_html |truncatewords: 20 | jsonify }}
}
{% unless forloop.last %},{% endunless %}{% endfor %}];

// Query
var qd = {}; // Gets values from the URL
location.search.substr(1).split("&").forEach(function(item) {
    var s = item.split("="),
        k = s[0],
        v = s[1] && decodeURIComponent(s[1]);
    (k in qd) ? qd[k].push(v) : qd[k] = [v]
});

function doSearch() {
  var resultdiv = $('#results');
  var query = $('input#search').val();

  // The search is then launched on the index built with Lunr
  var result = index.search(query);
  resultdiv.empty();
  if (result.length == 0) {
    resultdiv.append('<p class="">No results found.</p>');
  } else if (result.length == 1) {
    resultdiv.append('<p class="">Found '+result.length+' result</p>');
  } else {
    resultdiv.append('<p class="">Found '+result.length+' results</p>');
  }
  for (var item in result) {
          var ref = result[item].ref;
          var searchitem =
            '<div class="result"><a href="' +
            store[ref].link +
            '" class="post-title">' +
            store[ref].title +
            '</a> <div class="post-date small">' +
            store[ref].category +
            " | <I>" +
            store[ref].date +
            "</I><p>" +
            store[ref].excerpt +
            "</p></div></div>";
          resultdiv.append(searchitem);
        }

  // Loop through, match, and add results
  // for (var item in result) {
  //   var ref = result[item].ref;
  //   var searchitem = '<div class="result"><p><a href="{{ site.baseurl }}'+store[ref].link+'?q='+query+'">'+store[ref].title+'</a></p></div>';
  //   resultdiv.append(searchitem);
  // }
}

$(document).ready(function() {
  if (qd.q) {
    $('input#search').val(qd.q[0]);
    doSearch();
  }
  $('input#search').on('keyup', doSearch);
});
