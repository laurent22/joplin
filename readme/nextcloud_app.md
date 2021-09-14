# Joplin Web API for Nextcloud

**This is a beta feature, not yet completed. More info coming soon!**

The app can be downloaded from there: https://apps.nextcloud.com/apps/joplin

The Joplin Web API for Nextcloud is a helper application that enables certain features that are not possible otherwise. In particular:

- Sharing a note publicly
- Sharing a note with another Joplin user (who uses the same Nextcloud instance)
- Collaborating on a note
- Sharing a notebook

## FAQ

> Does it work with encrypted notes?

No

> Does it render images and other attachments?

No

> How about math formulas?

No

> Can I share a notebook?

No

> Can I edit a shared note directly on the browser?

No

## TODO

- [ ] Handle encrypted notes (shared notes will be unencrypted on server)
- [ ] Move Joplin note rendererer to separate package and re-use it to render notes in the Nextcloud app
- [ ] Allow editing note in browser