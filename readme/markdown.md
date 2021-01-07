# Markdown Guide

Markdown is a simple way to format text that looks great on any device. It doesn't do anything fancy like change the font size, color, or type — just the essentials, using keyboard symbols you already know. Since it is plain text, it is an easy way to author notes and documents and when needed it can be converted to a rich text HTML document.

Joplin desktop and mobile applications can display both the Markdown text and the rendered rich text document.

Joplin follows the [CommonMark](https://spec.commonmark.org/) specification, with additional features added via plugins.

## Cheat Sheet

This is a quick summary of the Markdown syntax.

|     | Markdown | Rendered Output
| --- | --- | ---
| **Heading 1** | <pre># Heading 1</pre> | <h1>Heading 1</h1>
| **Heading 2** | <pre>## Heading 2</pre> | <h2>Heading 2</h2>
| **Heading 3** | <pre>### Heading 3</pre> | <h3>Heading 3</h3>
| **Bold** | <pre>This is some `**bold text**`</pre> | This is some <strong>bold text</strong>
| **Italic** | <pre>This is some `*italic text*`</pre> | This is some <i>italic text</i>
| **Blockquotes** | <pre>> Kent.<br/>> Where's the king?<br/><br/>> Gent.<br/>> Contending with the<br/>> fretful elements</pre> | <blockquote>Kent.<br/>Where's the king?<br/><br/>Gent.<br/>Contending with<br/>the fretful elements</blockquote>
| **List** | <pre>* Milk<br/>* Eggs<br/>* Beers<br/>    * Desperados<br/>    * Heineken<br/>* Ham</pre> | <ul><li>Milk</li><li>Eggs</li><li>Beers<ul><li>Desperados</li><li>Heineken</li></ul></li><li>Ham</li></ul>
| **Ordered list** | <pre>1. Introduction<br/>2. Main topic<br/>    1. First sub-topic<br/>    2. Second sub-topic<br/>3. Conclusion</pre> | <ol><li>Introduction</li><li>Main topic<ol><li>First sub-topic</li><li>Second sub-topic</li></ol></li><li>Conclusion</li></ol>
| **Inline code** | <pre>This is \`someJavaScript()\`</pre> | This is `someJavaScript()`
| **Code block** | <pre>Here's some JavaScript code:<br><br>\`\`\`<br>function hello() {<br>    alert('hello');<br>}<br>\`\`\`<br><br>Language is normally auto-detected,<br>but it can also be specified:<br><br>\`\`\`sql<br>SELECT * FROM users;<br>DELETE FROM sessions;<br>\`\`\`</pre> | Here's some JavaScript code:<br><br><pre>function hello() {<br>&nbsp;&nbsp;&nbsp;&nbsp;alert('hello');<br>}</pre><br>Language is normally auto-detected, but it can also be specified:<br><br><pre>SELECT * FROM users;<br>DELETE FROM sessions;</pre>
| **Unformatted text** | <pre>Indent with a tab or 4 spaces<br>for unformatted text.<br/><br/>    This text will not be formatted:<br><br>    Robert'); DROP TABLE students;--</pre> | Indent with a tab or 4 spaces for unformatted text.<br><br><pre>This text will not be formatted:<br><br>Robert'); DROP TABLE students;--</pre>
| **Link** | <pre>This is detected as a link:<br><br>`https://joplinapp.org`<br><br>And this is a link anchoring text content:<br><br>`[Joplin](https://joplinapp.org)`<br><br>And this is a link, with a title,<br>anchoring text content:<br><br>`[Joplin](https://joplinapp.org "Joplin project page")`</pre> | This is detected as a link:<br><br>https://joplinapp.org<br><br>And this is a link anchoring text content:<br><br>[Joplin](https://joplinapp.org)<br><br>And this is a link, with a title,<br>anchoring text content:<br><br>[Joplin](https://joplinapp.org "Joplin project page") (_hint: hover over the link_)
| **Images** | <pre>`![Joplin icon](https://git.io/JenGk)`</pre> | ![Here's Joplin icon](https://git.io/JenGk)
| **Horizontal Rule** | <pre>One rule:<br>\*\*\*<br>Another rule:<br>\-\-\-</pre> | One rule:<hr><br>Another rule:<br><hr>
| **Tables** | [See below](#tables) |

### Tables

Tables are created using pipes `|` and and hyphens `-`. This is a Markdown table:

	| First Header  | Second Header |
	| ------------- | ------------- |
	| Content Cell  | Content Cell  |
	| Content Cell  | Content Cell  |

Which is rendered as:

| First Header  | Second Header |
| ------------- | ------------- |
| Content Cell  | Content Cell  |
| Content Cell  | Content Cell  |

Note that there must be at least 3 dashes separating each header cell.

Colons can be used to align columns:

	| Tables        | Are           | Cool  |
	| ------------- |:-------------:| -----:|
	| col 3 is      | right-aligned | $1600 |
	| col 2 is      | centered      |   $12 |

Which is rendered as:

| Tables        | Are           | Cool  |
| ------------- |:-------------:| -----:|
| col 3 is      | right-aligned | $1600 |
| col 2 is      | centered      |   $12 |

## Joplin Extras

Besides the standard Markdown syntax, Joplin supports several additional features.

### Links to other notes

You can create a link to a note by specifying its ID in the URL. For example:

	[Link to my note](:/0b0d62d15e60409dac34f354b6e9e839)

Since getting the ID of a note is not straightforward, each app provides a way to create such link. In the **desktop app**, right click on a note an select "Copy Markdown link". In the **mobile app**, open a note and, in the top right menu, select "Copy Markdown link". You can then paste this link anywhere in another note.

### Math notation

Math expressions can be added using the [KaTeX notation](https://khan.github.io/KaTeX/). To add an inline equation, wrap the expression in `$EXPRESSION$`, eg. `$\sqrt{3x-1}+(1+x)^2$`. To create an expression block, wrap it as follow:

	$$
	EXPRESSION
	$$

For example:

	$$
	f(x) = \int_{-\infty}^\infty
		\hat f(\xi)\,e^{2 \pi i \xi x}
		\,d\xi
	$$

Here is an example with the Markdown and rendered result side by side:

<img src="https://joplinapp.org/images/Katex.png" height="345px">

### Chemical equations

Joplin supports chemical equations via the mhchem plugin for KaTeX. This plugin is automatically enabled if you enable math notation. See the [mhchem documentation](https://mhchem.github.io/MathJax-mhchem/) for the syntax.

<img src="https://joplinapp.org/images/Katex_mhchem.png" height="196px">

### Diagrams

You can create diagrams in Joplin using the [Mermaid syntax](https://mermaidjs.github.io/). To add such a graph, wrap the Mermaid script inside a "\`\`\`mermaid" code block like this:

	```mermaid
	graph TD;
	    A-->B;
	    A-->C;
	    B-->D;
	    C-->D;
	```

This is how it would look with the Markdown on the left, and rendered graph on the right:

![Mermaid support in Joplin](https://joplinapp.org/images/Mermaid.png)

Note that Mermaid graphs are always rendered on a white background regardless of the current theme. This is because they can contain various colours that may not be compatible with the current theme.

### Checkboxes

Checkboxes can be added like so:

	- [ ] Milk
	- [x] Rice
	- [ ] Eggs

Which would turn into:

![Checkbox support in Joplin](https://joplinapp.org/images/Markdown_checkbox.jpg)

The checkboxes can then be ticked in the mobile and desktop applications.

### HTML support

It is generally recommended to enter the notes as Markdown as it makes the notes easier to edit. However for cases where certain features aren't supported (such as strikethrough or to highlight text), you can also use HTML code directly. For example this would be a valid note:

	This is <s>strikethrough text</s> mixed with regular **Markdown**.

### Plugins

Joplin supports a number of plugins that can be toggled on/off to enable/disable markdown features on top of the standard Markdown features you would expect. These plugins are listed below. Note: not all of the plugins are enabled by default, if the enable field is 'no' below, then open the option screen to enable the plugin. Plugins can be disabled in the same manner.

Note that the functionality added by these plugins is not part of the CommonMark spec so, while they will all work within Joplin, it is not guaranteed that they will work in other Markdown readers. Often this is not an issue but keep it in mind if you require compatibility with other Markdown applications.

| Plugin | Syntax | Description | Enabled | Screenshot |
|--------|--------|-------------|---------|------------|
| Soft breaks | See [breaks](https://markdown-it.github.io/#md3=%7B%22source%22%3A%22This%20is%20line1%5CnThis%20is%20line2%5Cn%5CnThis%20is%20a%20line%20with%202%20trailing%20spaces%20%20%5CnNext%20line%5Cn%5CnClick%20the%20%60breaks%60%20checkbox%20above%20to%20see%20the%20difference.%5CnJoplin%27s%20default%20is%20hard%20breaks%20%28checked%20%60breaks%60%20checkbox%29.%22%2C%22defaults%22%3A%7B%22html%22%3Afalse%2C%22xhtmlOut%22%3Afalse%2C%22breaks%22%3Afalse%2C%22langPrefix%22%3A%22language-%22%2C%22linkify%22%3Afalse%2C%22typographer%22%3Afalse%2C%22_highlight%22%3Afalse%2C%22_strict%22%3Afalse%2C%22_view%22%3A%22html%22%7D%7D) markdown-it demo| Joplin uses hard breaks by default, which means that a line break is rendered as `<br>`. Enable soft breaks for traditional markdown line-break behaviour. | no | [View](https://joplinapp.org/images/md_plugins/softbreaks_plugin.jpg)
| Typographer | See [typographer](https://markdown-it.github.io/#md3=%7B%22source%22%3A%22%23%20Typographic%20replacements%5Cn%5Cn%28c%29%20%28C%29%20%28r%29%20%28R%29%20%28tm%29%20%28TM%29%20%28p%29%20%28P%29%20%2B-%5Cn%5Cntest..%20test...%20test.....%20test%3F.....%20test!....%5Cn%5Cn!!!!!!%20%3F%3F%3F%3F%20%2C%2C%20%20--%20---%5Cn%5Cn%5C%22Smartypants%2C%20double%20quotes%5C%22%20and%20%27single%20quotes%27%5Cn%22%2C%22defaults%22%3A%7B%22html%22%3Afalse%2C%22xhtmlOut%22%3Afalse%2C%22breaks%22%3Afalse%2C%22langPrefix%22%3A%22language-%22%2C%22linkify%22%3Atrue%2C%22typographer%22%3Atrue%2C%22_highlight%22%3Atrue%2C%22_strict%22%3Afalse%2C%22_view%22%3A%22html%22%7D%7D) markdown-it demo | Does typographic replacements, (c) -&gt; © and so on | no | [View](https://joplinapp.org/images/md_plugins/typographer_plugin.jpg) |
| Linkify | See [linkify](https://markdown-it.github.io/#md3=%7B%22source%22%3A%22Use%20the%20Linkify%20checkbox%20to%20switch%20link-detection%20on%20and%20off.%5Cn%5Cn%2A%2AThese%20links%20are%20auto-detected%3A%2A%2A%5Cn%5Cnhttps%3A%2F%2Fexample.com%5Cn%5Cnexample.com%5Cn%5Cntest%40example.com%5Cn%5Cn%2A%2AThese%20are%20always%20links%3A%2A%2A%5Cn%5Cn%5Blink%5D%28https%3A%2F%2Fjoplinapp.org%29%5Cn%5Cn%3Chttps%3A%2F%2Fexample.com%3E%22%2C%22defaults%22%3A%7B%22html%22%3Afalse%2C%22xhtmlOut%22%3Afalse%2C%22breaks%22%3Afalse%2C%22langPrefix%22%3A%22language-%22%2C%22linkify%22%3Atrue%2C%22typographer%22%3Atrue%2C%22_highlight%22%3Atrue%2C%22_strict%22%3Afalse%2C%22_view%22%3A%22html%22%7D%7D) markdown-it demo | Auto-detects URLs and convert them to clickable links | yes |     |
| [Katex](https://katex.org) | `$$math expr$$` or `$math$` | [See above](#math-notation) | yes | [View](https://joplinapp.org/images/md_plugins/katex_plugin.jpg) |
| [Fountain](https://fountain.io) | <code>\`\`\`fountain</code><br/>Your screenplay...<br/><code>\`\`\`</code> | Adds support for the Fountain markup language, a plain text markup language for screenwriting | no | [View](https://joplinapp.org/images/md_plugins/fountain_plugin.jpg) |
| [Mermaid](https://mermaid-js.github.io/mermaid/) | <code>\`\`\`mermaid</code><br/>mermaid syntax...<br/><code>\`\`\`</code> | See [plugin page](https://mermaid-js.github.io/mermaid/#/examples) for full description | no | [View](https://joplinapp.org/images/md_plugins/mermaid.jpg) |
| [Mark](https://github.com/markdown-it/markdown-it-mark) | `==marked==` | Transforms into `<mark>marked</mark>` (highlighted) | yes | [View](https://joplinapp.org/images/md_plugins/mark_plugin.jpg) |
| [Footnote](https://github.com/markdown-it/markdown-it-footnote) | `Simples inline footnote ^[I'm inline!]` | See [plugin page](https://github.com/markdown-it/markdown-it-footnote) for full description | yes | [View](https://joplinapp.org/images/md_plugins/footnote_plugin.jpg) |
| [TOC](https://github.com/nagaozen/markdown-it-toc-done-right) | Any of `${toc}, [[toc]], [toc], [[_toc_]]` | Adds a table of contents to the location of the toc page. Based on headings and sub-headings | no | [View](https://joplinapp.org/images/md_plugins/toc_plugin.jpg) |
| [Sub](https://github.com/markdown-it/markdown-it-sub) | `X~1~` | Transforms into X<sub>1</sub> | no | [View](https://joplinapp.org/images/md_plugins/sub_plugin.jpg) |
| [Sup](https://github.com/markdown-it/markdown-it-sup) | `X^2^` | Transforms into X<sup>2</sup> | no | [View](https://joplinapp.org/images/md_plugins/sup_plugin.jpg) |
| [Deflist](https://github.com/markdown-it/markdown-it-deflist) | See [pandoc](http://johnmacfarlane.net/pandoc/README.html#definition-lists) page for syntax | Adds the html `<dl>` tag accessible through markdown | no | [View](https://joplinapp.org/images/md_plugins/deflist_plugin.jpg) |
| [Abbr](https://github.com/markdown-it/markdown-it-abbr) | *[HTML]: Hyper Text Markup Language<br/>The HTML specification | Allows definition of abbreviations that can be hovered over later for a full expansion | no | [View](https://joplinapp.org/images/md_plugins/abbr_plugin.jpg) |
| [Emoji](https://github.com/markdown-it/markdown-it-emoji) | `:smile:` | Transforms into 😄. See [this list](https://gist.github.com/rxaviers/7360908) for more emojis | no |[View](https://joplinapp.org/images/md_plugins/emoji_plugin.jpg) |
| [Insert](https://github.com/markdown-it/markdown-it-ins) | `++inserted++` | Transforms into `<ins>inserted</ins>` (<ins>inserted</ins>) | no | [View](https://joplinapp.org/images/md_plugins/insert_plugin.jpg) |
| [Multitable](https://github.com/RedBug312/markdown-it-multimd-table) | See [MultiMarkdown](https://fletcher.github.io/MultiMarkdown-6/syntax/tables.html) page | Adds more power and customization to markdown tables | no | [View](https://joplinapp.org/images/md_plugins/multitable_plugin.jpg) |
