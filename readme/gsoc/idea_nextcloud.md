# GSoC: Nextcloud notes integration (Web client)

## What is the goal of the project 

There is the community's wish to have the notes integrated Nextcloud, so that Notes can be sought by Nextcloud itsself. Although this idea focuses on Nextcloud it shall allow to extend it to other collaboration applications going beyond the current scope of  [Synchronisation](https://joplinapp.org/#synchronisation).

There is already the [web application](https://github.com/foxmask/joplin-web) what may can be integrated in collaboration application.

There is also a [Joplin Web API for Nextcloud](https://github.com/laurent22/joplin-nextcloud/), which is currently used to share a note publicly, and which could be extended to other uses. There is a [discussion thread](https://discourse.joplinapp.org/t/joplin-api-in-nextcloud-prototype/) about it in the forum.

## Features

Feature parity with the desktop client is not needed and would be out of scope.

These are the features that would be needed to create a minimal web client:

- Ability to list the notebooks in a hierarchy
- Ability to view a note and render the Markdown to HTML
- Ability to edit the Markdown note and save it
- Handle conflicts when, for example, a note is modified in the web client and, at the same time, it is modified via sync.

## Who is talking about it

The idea is outcome of (but not limited to) of some discussion taking place in the Forum and on GitHub: 

- [Support Joplin structure and notebooks #248](https://github.com/nextcloud/notes/issues/248)
- [Joplin Web](https://discourse.joplinapp.org/t/joplin-web-web-application-companion-for-joplin/555)
- [New search engine in Joplin](https://discourse.joplinapp.org/t/new-search-engine-in-joplin/1479)
- [Nextcloud notes integration (Web client)](https://github.com/laurent22/joplin/issues/228)
