# Highlight.js

Highlight.js — это инструмент для подсветки синтаксиса, написанный на JavaScript. Он работает
и в браузере, и на сервере. Он работает с практически любой HTML разметкой, не
зависит от каких-либо фреймворков и умеет автоматически определять язык.


## Начало работы

Минимум, что нужно сделать для использования highlight.js на веб-странице — это
подключить библиотеку, CSS-стили и вызывать [`initHighlightingOnLoad`][1]:

```html
<link rel="stylesheet" href="/path/to/styles/default.css">
<script src="/path/to/highlight.pack.js"></script>
<script>hljs.initHighlightingOnLoad();</script>
```

Библиотека найдёт и раскрасит код внутри тегов `<pre><code>`, попытавшись
автоматически определить язык. Когда автоопределение не срабатывает, можно явно
указать язык в атрибуте class:

```html
<pre><code class="html">...</code></pre>
```

Список поддерживаемых классов языков доступен в [справочнике по классам][2].
Класс также можно предварить префиксами `language-` или `lang-`.

Чтобы отключить подсветку для какого-то блока, используйте класс `nohighlight`:

```html
<pre><code class="nohighlight">...</code></pre>
```

## Инициализация вручную

Чтобы иметь чуть больше контроля за инициализацией подсветки, вы можете
использовать функции [`highlightBlock`][3] и [`configure`][4]. Таким образом
можно управлять тем, *что* и *когда* подсвечивать.

Вот пример инициализации, эквивалентной вызову [`initHighlightingOnLoad`][1], но
с использованием jQuery:

```javascript
$(document).ready(function() {
  $('pre code').each(function(i, block) {
    hljs.highlightBlock(block);
  });
});
```

Вы можете использовать любые теги разметки вместо `<pre><code>`. Если
используете контейнер, не сохраняющий переводы строк, вам нужно сказать
highlight.js использовать для них тег `<br>`:

```javascript
hljs.configure({useBR: true});

$('div.code').each(function(i, block) {
  hljs.highlightBlock(block);
});
```

Другие опции можно найти в документации функции [`configure`][4].


## Web Workers

Подсветку можно запустить внутри web worker'а, чтобы окно
браузера не подтормаживало при работе с большими кусками кода.

В основном скрипте:

```javascript
addEventListener('load', function() {
  var code = document.querySelector('#code');
  var worker = new Worker('worker.js');
  worker.onmessage = function(event) { code.innerHTML = event.data; }
  worker.postMessage(code.textContent);
})
```

В worker.js:

```javascript
onmessage = function(event) {
  importScripts('<path>/highlight.pack.js');
  var result = self.hljs.highlightAuto(event.data);
  postMessage(result.value);
}
```


## Установка библиотеки

Highlight.js можно использовать в браузере прямо с CDN хостинга или скачать
индивидуальную сборку, а также установив модуль на сервере. На
[странице загрузки][5] подробно описаны все варианты.

**Не подключайте GitHub напрямую.** Библиотека не предназначена для
использования в виде исходного кода, а требует отдельной сборки. Если вам не
подходит ни один из готовых вариантов, читайте [документацию по сборке][6].

**Файл на CDN содержит не все языки.** Иначе он будет слишком большого размера.
Если нужного вам языка нет в [категории "Common"][5], можно дообавить его
вручную:

```html
<script src="//cdnjs.cloudflare.com/ajax/libs/highlight.js/9.4.0/languages/go.min.js"></script>
```

**Про Almond.** Нужно задать имя модуля в оптимизаторе, например:

```
r.js -o name=hljs paths.hljs=/path/to/highlight out=highlight.js
```


## Лицензия

Highlight.js распространяется под лицензией BSD. Подробнее читайте файл
[LICENSE][7].


## Ссылки

Официальный сайт билиотеки расположен по адресу <https://highlightjs.org/>.

Более подробная документация по API и другим темам расположена на
<http://highlightjs.readthedocs.io/>.

Авторы и контрибьюторы перечислены в файле [AUTHORS.ru.txt][8] file.

[1]: http://highlightjs.readthedocs.io/en/latest/api.html#inithighlightingonload
[2]: http://highlightjs.readthedocs.io/en/latest/css-classes-reference.html
[3]: http://highlightjs.readthedocs.io/en/latest/api.html#highlightblock-block
[4]: http://highlightjs.readthedocs.io/en/latest/api.html#configure-options
[5]: https://highlightjs.org/download/
[6]: http://highlightjs.readthedocs.io/en/latest/building-testing.html
[7]: https://github.com/isagalaev/highlight.js/blob/master/LICENSE
[8]: https://github.com/isagalaev/highlight.js/blob/master/AUTHORS.ru.txt
