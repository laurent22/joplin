These are project ideas. You are welcome to propose your own project ideas, or variations of the ones below.

# 1. Support for multiple profiles

The applications should support multiple profiles so that, for example, one can have a "work" profile and a "personal" profile. This will also make it easier to share notes: for example a "work project" profile could be created and shared with co-workers via sync.

We want to offer this feature by allowing the user to select a profile from the app (eg. "work" or "personal", then switch to it. Switching would be done by restarting the app and loading the selected profile.

Expected Outcome: The user should be able to select a profile and switch to it.

Difficulty Level: Moderate

Platforms: Desktop and/or mobile (at the student's choice)

Skills Required: JavaScript; React; React Native (for mobile)

Potential Mentor(s):

More info: [GitHub issue](https://github.com/laurent22/joplin/issues/591), [Forum Thread](https://discourse.joplinapp.org/t/can-i-run-a-second-instance-of-joplin/110)

# 2. Collaboration via Nextcloud

We need a way to share notes with other users, and to collaborate on notes. This is useful for companies, to collaborate on projects for example, but also for individual users when they want to share their notes with other people.

The basis for this would be the [Joplin Web API for Nextcloud](https://github.com/laurent22/joplin-nextcloud/), which is currently used to share a note publicly, and which can be extended for other uses.

The main feature we would like to see is the ability to select a Nextcloud user from the app, then share a note with him or her. Once the note is shared, it will appear in the Joplin clients of the other user (via sync). The solution should be generic enough that it can later be used to share a whole notebook.

Expected Outcome: The user should be able to select a Nextcloud user then share a note with them. That note should then appear in the other user's Joplin clients.

Difficulty Level: High

Platforms: Desktop and/or mobile (at the student's choice)

Skills Required: JavaScript; React; React Native (for mobile)

Potential Mentor(s):

More info: [Forum thread about Joplin Web API for Nextcloud](https://discourse.joplinapp.org/t/joplin-api-in-nextcloud-prototype/)

# 3. Hierarchical Tags

One of the most asked-for feature in Joplin is support for hierarchical tags. This would allow users that heavily rely on tags to organise them into a hierarchy, as is done for the notebooks.

Expected Outcome: The tags can be organised into a hierarchy

Difficulty Level: Moderate

Platforms: Desktop, Mobile and Terminal

Skills Required: JavaScript; React; React Native (for mobile)

Potential Mentor(s):

More info: [GitHub issue](https://github.com/laurent22/joplin/issues/375)

# 4. Sharing on mobile

The mobile application allows sharing text from any application to Joplin. However it is not currently possible to share images or to share selected text with Joplin. We would like to allow sharing an image or file from any application to Joplin. And to allow selecting some text in an application (in a browser for instance) and share it with Joplin

Expected Outcome: Share images and selected with Joplin

Difficulty Level: Moderate

Platforms: Mobile (iOS and Android)

Skills Required: JavaScript; React; React Native

Potential Mentor(s):

More info: [Mobile - Add share menu #876](https://github.com/laurent22/joplin/issues/876)

# 5. Web client for Nextcloud

There is the community's wish to have the notes integrated Nextcloud, so that Notes can be sought by Nextcloud itsself. Although this idea focuses on Nextcloud it shall allow to extend it to other collaboration applications going beyond the current scope of  [Synchronisation](https://joplinapp.org/#synchronisation). There is already the [web application](https://github.com/foxmask/joplin-web) what may used as a starting point, but it is also fine to start from scratch.

Feature parity with the desktop client is not needed and would be out of scope. These are the features that would be needed to create a minimal web client:

- Ability to list the notebooks in a hierarchy
- Ability to view a note and render the Markdown to HTML
- Ability to edit the Markdown note and save it
- Handle conflicts when, for example, a note is modified in the web client and, at the same time, it is modified via sync.

Expected Outcome: Viewing and editing notes and notebooks from a Nextcloud-based web client

Difficulty Level: High

Skills Required: PHP (for the Nextcloud app). For the front-end it can be plain HTML (no JS), or React.

Potential Mentor(s):

More info: [GitHub: Nextcloud notes integration (Web client)](https://github.com/laurent22/joplin/issues/228)

# 5. OCR support

It is possible to add support for OCR content in Joplin via the [http://tesseract.projectnaptha.com/](Tesseract library). A first step would be to assess the feasability of this project by integrating the lib in the desktop app and trying to OCR an image. OCR support should be implemented as a service of the desktop app. It would extract the text from the images, and append the content as plain text to the notes.

Expected Outcome: A service on the desktop app that extract text from images and attach it to the note.

Difficulty Level: High

Skills Required: JavaScript

Potential Mentor(s):

# 6. Password-protected notes

We would like to add an option to allow encrypting a note or a notebook with a password. When opening the note, the password must be provided to reveal the content.

Expected Outcome: The user select a note and has the option to encrypt it.

Difficulty Level: Medium

Skills Required: JavaScript; React

Potential Mentor(s):

# 7. Search

The current search engine is built on top of SQLite FTS. An index of the notes is built and this is what is used by FTS when searching.

While it works relatively well, there is still room for improvement. In particular we would like to implement the following:

- Remove the need for wildcard queries - for example instead of typing "search*", it will be possible to simply type "search" and results that contain "search" or "searching" will be included. Those that contain the exact match will come first.

- Search within certain tags (eg. "tag:software search" to search within the notes tagged with "software" and that contain the word "search").

- Improve relevance algorithm (give a weight to certain criteria, and allow adding new criteria more easily). In particular give more weight to recently modified notes, and less weight to completed to-dos.

- Allow fuzzy search (for example return results that contain "saerch" for the query "search")

Expected Outcome: To be defined with the student. Depending on what features they would like to implement.

Difficulty Level: Medium

Skills Required: JavaScript

Potential Mentor(s):

More info: [Search engine improvements](https://github.com/laurent22/joplin/issues/1877)
