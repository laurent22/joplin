# Joplin Web API for Nextcloud

* * *

**IMPORTANT: THIS APPLICATION IS DEPRECATED AND WILL NO LONGER BE SUPPORTED FROM JOPLIN v16**

It is deprecated in favour of [Joplin Server](https://discourse.joplinapp.org/t/joplin-web-api-for-nextcloud/4491/72?u=laurent), so if you are relying on it please do not upgrade to Joplin v16 till you are ready to migrate to Joplin Server or some other alternative.

* * *

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
