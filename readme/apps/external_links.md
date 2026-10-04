# External URL links

This feature allows creation of links to notes, folders, and tags. When opening such link Joplin will start, unless it's already running, and open the corresponding item.

To create a link, right click a note, a folder, or a tag in the sidebar and select "Copy external link". The link will be copied to clipboard.

## Link format

* `joplin://x-callback-url/openNote?id=<note id>` for note
* `joplin://x-callback-url/openFolder?id=<folder id>` for folder
* `joplin://x-callback-url/openTag?id=<tag id>` for tag

## Commands that return a result

Two desktop-only commands send a result back to the calling application, using the [x-callback-url](https://x-callback-url.com/) convention:

* `joplin://x-callback-url/getCurrentNote?x-success=<url>&x-error=<url>` returns the currently selected note
* `joplin://x-callback-url/createNote?title=<title>&body=<body>&x-success=<url>&x-error=<url>` creates a note in the current notebook and returns it

Joplin opens the `x-success` URL with `title` and `url` appended, where `url` links back to the note, or the `x-error` URL with `errorMessage`. Existing parameters are preserved, so the callback URL must be percent-encoded. For example `getCurrentNote` with an `x-success` of `hook://x-callback-url/setCurrentNode` opens:

<!-- cSpell:disable -->

```
hook://x-callback-url/setCurrentNode?title=My%20note&url=joplin%3A%2F%2Fx-callback-url%2FopenNote%3Fid%3D...
```

<!-- cSpell:enable -->

### Valid response URLs

These commands can be triggered from a web page, and the response URL is passed to the operating system, so `x-success` and `x-error` are accepted only if the scheme belongs to a known application, such as `editorial://workflow-callback`, or the host is `x-callback-url`, such as `hook://x-callback-url/setCurrentNode`. Anything else is ignored with a warning in the log. `http` and `https` URLs are rejected since they cannot return to the calling application and would send the note title and ID to a web server.

If your application's callback is rejected, please [open an issue](https://github.com/laurent22/joplin/issues) so its scheme can be added.

## Known problems

On macOS if Joplin isn't running it will start but it won't open the note. If Joplin is running but on a different space as the external link, then Joplin will come to the foreground but without displaying the note.
