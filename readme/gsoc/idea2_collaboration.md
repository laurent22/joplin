# GSoC: Collaboration

We need a way to share notes with other users, or publicly, and to collaborate on notes with other users. This is useful for companies, to collaborate on projects for example, but also for individual users when they want to share their notes with other people.

The basis for this would be the [Joplin Web API for Nextcloud](https://github.com/laurent22/joplin-nextcloud/), which is currently used to share a note publicly, and which can be extended for other uses. There is a [discussion thread](https://discourse.joplinapp.org/t/joplin-api-in-nextcloud-prototype/) about it in the forum.

## Features

The features we are looking to implement are:

- Sharing a note publicly and allow the people you shared the link with to edit it.
- Share a notebook publicly.
- Share a note or notebook with the given Nextcloud user.

For now, we limit the scope to Nextcloud but later the Nextcloud app (which is essentially a PHP app) could be extracted and made to work with other backends.

## See also

- [Feature Request: Multiple synchronization targets #1293](https://github.com/laurent22/joplin/issues/1293)
