# Joplin Server sharing feature

## Sharing a file via a public URL

Joplin Server is essentially a file hosting service and it allows sharing files via public URLs. To do so, an API call is made to `/api/shares` with the ID or path of the file that needs to be shared. This call returns a SHAREID that is then used to access the file via URL. When viewing the file, it will display it according to its mime type. Thus by default a Markdown file will be displayed as plain text.

## Sharing a note via a public URL 

It is built on top of the file sharing feature. The file corresponding to the note is shared via the above API. Then a separate application, specific to Joplin, read and parse the Markdown file, and display it as note.

That application works as a viewer - instead of displaying the Markdown file as plain text (by default), it renders it and displays it as HTML.

The rendering engine is the same as the main applications, which allows us to use the same plugins and settings.

### Attached resources

Any resource attached to the note is also shared - so for example images will be displayed, and it will be possible to open any attached PDF. This 

### Linked note

Any linked note will **not** be shared, due to the following reasons:

- Privacy issue - you don't want to accidentally share a note just because it was linked to another note.

- Even if the linked note has been shared separately, we still don't give access to it. We don't know who that link has been shared with - it could be a different recipient.

### Multiple share links for a given note

It should be possible to have multiple share links for a given note. For example: I share a note with one person, then the same note with a different person. I revoke the share for one person, but I sill want the other person to access the note.

So when a share link is created for a note, the API always return a new link.

## Sharing a note with a user

TBD