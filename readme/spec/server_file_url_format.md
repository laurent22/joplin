# Structure of file URLs in Joplin Server

To identify a file, Joplin Server supports two types of URLs:

## Access by ID

**Format:** `BASE_URL/files/FILE_ID`

This is the simplest way and it matches how other API items are accessed by ID.

For example: `https://example.com/api/files/5c7e0f3f54434ba`

## Access by full path

**Format:** `BASE_URL/files/SPECIAL_DIR:/path/to/file/:`

This is to access a file by its full path. In this case, the path must be prefixed by `SPECIAL_DIR`, which can only be `root` at the moment. Then to differentiate the path from URL segments, it needs to be wrapped in colons `:`.

For example, to access the metadata of file `/my/file.txt`

`https://example.com/api/files/root:/my/file.txt:`

To access its content:

`https://example.com/api/files/root:/my/file.txt:/content`

To access the root only (for example to list its content):

`https://example.com/api/files/root:/:`

Which can also be written as:

`https://example.com/api/files/root`

## Difference between API and web app end points

The API and web app end points are consistent in the way they access files, except that in one case the URLs will start with `/api` and the other with just `/`. For example, this would access the same file:

- API: `https://example.com/api/files/root:/my/file.txt:`
- Web: `https://example.com/files/root:/my/file.txt:`