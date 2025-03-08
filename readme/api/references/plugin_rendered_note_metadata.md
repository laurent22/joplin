# Rendered note metadata

Joplin allows the use of certain metadata tags within the rendered (HTML) version of a note.

At present, the "print-title" metadata tag is the only one supported. By default, the title of a note is displayed at the top when the note is printed or exported. However, this behavior may not always be desired, such as when a plugin needs to produce a document with a specific custom header. In such cases, you can disable the default behavior by including this tag and setting its value to `false`. 

You can add this tag either directly in the Markdown document or through a Markdown-it content script in the rendered note.

To prevent the note title from being printed, include the following line in the document:

`<!-- joplin-metadata-print-title = false -->`