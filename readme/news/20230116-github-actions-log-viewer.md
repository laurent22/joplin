---
tweet: Introducing the "GitHub Action Raw Log Viewer" extension for Chrome
---

# Introducing the "GitHub Actions Raw Log Viewer" extension for Chrome

If you've ever used GitHub Actions, you will find that they provide by default a nice coloured output for the log. It looks good and it's even interactive! (You can click to collapse/expand blocks of text) But unfortunately it doesn't scale to large workflows, like we have for Joplin - the log can freeze and it will take forever to search for something. Indeed searching is done in "real time"... which mostly means it will freeze for a minute or two for each letter you type in the search box. Not great.

Thankfully GitHub provides an alternative access: the raw logs. This is much better because they will open as plain text, without any styling or JS magic, which means you can use the browser native search and it will be fast.

But now the problem is that raw logs look like this:

![Raw log without extension](https://raw.githubusercontent.com/laurent22/joplin/dev/Assets/WebsiteAssets/images/news/20230116-ga-raw-log.png)

While it's not impossible to read, all colours that would display nicely in a terminal are gone and replaced by [ANSI codes](https://en.wikipedia.org/wiki/ANSI_escape_code). You can find what you need in there but it's not particularly easy.

This is where the new **GitHub Action Raw Log Viewer** extension for Chrome can help. It will parse your raw log and convert the ANSI codes to proper colours. This results in a much more readable rendering:

![Raw log with extension](https://raw.githubusercontent.com/laurent22/joplin/dev/Assets/WebsiteAssets/images/news/20230116-ga-raw-log-colored.png)

The extension is fast even for very large logs and it's of course easy to search for text since it simply works with your browser built-in search.

The extension is open source, with the code available here: https://github.com/laurent22/github-actions-logs-extension

And to install it, follow this link:

[![Download GitHub Action Raw Log Viewer extension](https://raw.githubusercontent.com/laurent22/joplin/dev/Assets/WebsiteAssets/images/news/20230116-extension-get-it-now.png)](https://chrome.google.com/webstore/detail/github-action-raw-log-vie/lgejlnoopmcdglhfjblaeldbcfnmjddf
)
