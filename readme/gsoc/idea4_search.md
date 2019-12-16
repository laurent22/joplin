# GSoC: Search engine improvements

The current search engine is built on top of SQLite FTS. An index of the notes is built and this is what is used by FTS when searching.

While it works relatively well, there is still room for improvement. In particular we would like to implement the following:

- Remove the need for wildcard queries - for example instead of typing "search*", it will be possible to simply type "search" and results that contain "search" or "searching" will be included. Those that contain the exact match will come first.

- Search within certain tags (eg. "tag:software search" to search within the notes tagged with "software" and that contain the word "search").

- Improve relevance algorithm (give a weight to certain criteria, and allow adding new criteria more easily). In particular give more weight to recently modified notes, and less weight to completed to-dos.

- Allow fuzzy search (for example return results that contain "saerch" for the query "search")

## See also

[Search engine improvements](https://github.com/laurent22/joplin/issues/1877)
