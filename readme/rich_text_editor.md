# About the Rich Text editor

**TLDR:** Avoid using Markdown plugins if you primarily intend to use the Rich Text editor, and be aware of the editor's limitations.

At its core, Joplin stores notes in [Markdown format](https://github.com/laurent22/joplin/blob/dev/readme/markdown.md). Markdown is a simple way to format text that looks great on any device and, while it's formatted text, it still looks perfectly readable in a plain text editor.

In some cases however, the extra markup format that appears in notes can be seen as a drawback. Bold text will `look **like this**` for example, and tables might not be particularly readable. For that reason, Joplin also features a Rich Text editor, which allows you to edit notes with a [WYSIWYG](https://en.wikipedia.org/wiki/WYSIWYG) editing experience. Bold text will "look **like this**" and tables will be more readable, among others.

However **there is a catch**: in Joplin, notes, even when edited with this Rich Text editor, are **still Markdown** under the hood. This is generally a good thing, because it means you can switch at any time between Markdown and Rich Text editor, and the note is still readable. It is also good if you sync with the mobile application, which doesn't have a rich text editor. The catch is that since Markdown is used under the hood, it means the rich text editor has a number of limitations it inherits from that format:

- For a start, **most Markdown plugins will not be compatible**. If you open a Markdown note that makes use of such plugin in the Rich Text editor, it is likely you will lose the plugin special formatting. The only supported plugins are the "fenced" plugins - those that wrap a section of text in triple backticks (for example, KaTeX, Mermaid, etc. are working). You can see on the Markdown config screen which plugins that are compatible or not.

- It is not possible to have multiple new lines in a row. Because in Markdown, multiple new lines would be collapsed into one when rendered.

- Tables must have a header, because this is a requirement in Markdown. When you create a table, it will let you create it without a header, but under the hood it will add an empty one. And next time you open the note, this empty header will be present.

Those are the known limitations but if you notice any other issue not listed here, please let us know [in the forum](https://discourse.joplinapp.org/).