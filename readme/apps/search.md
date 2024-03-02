# Searching

Joplin implements the SQLite Full Text Search (FTS4) extension. It means the content of all the notes is indexed in real time and search queries return results very fast. Both [Simple FTS Queries](https://www.sqlite.org/fts3.html#simple_fts_queries) and [Full-Text Index Queries](https://www.sqlite.org/fts3.html#full_text_index_queries) are supported. See below for the list of supported queries:

One caveat of SQLite FTS is that it does not support languages which do not use Latin word boundaries (spaces, tabs, punctuation). To solve this issue, Joplin has a custom search mode, that does not use FTS, but still has all of its features (multi term search, filters, etc.). One of its drawbacks is that it can get slow on larger note collections. Also, the sorting of the results will be less accurate, as the ranking algorithm (BM25) is, for now, only implemented for FTS. Finally, in this mode there are no restrictions on using the `*` wildcard (`swim*`, `*swim` and `ast*rix` all work). This search mode is currently enabled if one of the following languages are detected:
 - Chinese
 - Japanese
 - Korean
 - Thai

## Supported queries

Search type | Description | Example
------------|-------------|---------
Single word | Returns all the notes that contain this term. | For example, searching for `cat` will return all the notes that contain this exact word. Note: it will not return the notes that contain the substring - thus, for "cat", notes that contain "cataclysmic" or "prevaricate" will **not** be returned.
Multiple word | Returns all the notes that contain **all** these words, but not necessarily next to each other. | `dog cat` - will return any notes that contain the words "dog" and "cat" anywhere in the note, no necessarily in that order nor next to each other. It will **not** return results that contain "dog" or "cat" only.
Phrase | Add double quotes to return the notes that contain exactly this phrase. | `"shopping list"` - will return the notes that contain these **exact terms** next to each other and in this order. It will **not** return for example a note that contains "going shopping with my list".
Prefix | Add a wildcard to return all the notes that contain a term with a specified prefix. | `swim*` - will return all the notes that contain eg. "swim", but also "swimming", "swimsuit", etc. IMPORTANT: The wildcard **can only be at the end** - it will be ignored at the beginning of a word (eg. `*swim`) and will be treated as a literal asterisk in the middle of a word (eg. `ast*rix`)
Switch to basic search | One drawback of Full Text Search is that it ignores most non-alphabetical characters. However in some cases you might want to search for this too. To do that, you can use basic search. You switch to this mode by prefixing your search with a slash `/`. This won't provide the benefits of FTS but it will allow searching exactly for what you need. Note that it can also be much slower, even extremely slow, depending on your query. | `/"- [ ]"` - will return all the notes that contain unchecked checkboxes.

## Search filters

You can also use search filters to further restrict the search.

| Operator | Description | Example |
| --- | --- | --- |
|**-**|If placed before a text term, it excludes the notes that contain that term. You can also place it before a filter to negate it. |`-spam` searches for all notes without the word `spam`.<br>`office -trash` searches for all notes with the word `office` and without the word `trash`.|
|**any:**|Return notes that satisfy any/all of the required conditions. `any:0` is the default, which means all conditions must be satisfied.|`any:1 cat dog` will return notes that have the word `cat` or `dog`.<br>`any:0 cat dog` will return notes with both the words `cat` and `dog`. |
| **title:** <br> **body:**|Restrict your search to just the title or the body field.|`title:"hello world"` searches for notes whose title contains `hello` and `world`.<br>`title:hello -body:world` searches for notes whose title contains `hello` and body does not contain `world`.
| **tag:** |Restrict the search to the notes with the specified tags.|`tag:office` searches for all notes having tag office.<br>`tag:office tag:important` searches for all notes having both office and important tags.<br>`tag:office -tag:spam` searches for notes having tag `office` which do not have tag `spam`.<br>`any:1 tag:office tag:spam` searches for notes having tag `office` or tag `spam`.<br>`tag:be*ful` does a search with wildcards.<br>`tag:*` returns all notes with tags.<br>`-tag:*` returns all notes without tags.|
| **notebook:** | Restrict the search to the specified notebook(s). |`notebook:books` limits the search scope within `books` and all its subnotebooks.<br>`notebook:wheel*time` does a wildcard search.|
| **created:** <br> **updated:** <br> **due:**| Searches for notes created/updated on dates specified using YYYYMMDD format. You can also search relative to the current day, week, month, or year. | `created:20201218` will return notes created on or after December 18, 2020.<br>`-updated:20201218` will return notes updated before December 18, 2020.<br>`created:20200118 -created:20201215` will return notes created between January 18, 2020, and before December 15, 2020.<br>`created:202001 -created:202003` will return notes created on or after January and before March 2020.<br>`updated:1997 -updated:2020` will return all notes updated between the years 1997 and 2019.<br>`created:day-2` searches for all notes created in the past two days.<br>`updated:year-0` searches all notes updated in the current year.<br>`-due:day+7` will return all todos which are due or will be due in the next seven days.<br>`-due:day-5` searches all todos that are overdue for more than 5 days.|
| **type:** |Restrict the search to either notes or todos. | `type:note` to return all notes<br>`type:todo` to return all todos |
| **iscompleted:** | Restrict the search to either completed or uncompleted todos. | `iscompleted:1` to return all completed todos<br>`iscompleted:0` to return all uncompleted todos|
|**latitude:** <br> **longitude:** <br> **altitude:**|Filter by location|`latitude:40 -latitude:50` to return notes with latitude >= 40 and < 50  |
|**resource:**|Filter by attachment MIME type|`resource:image/jpeg` to return notes with a jpeg attachment.<br>`-resource:application/pdf` to return notes without a pdf attachment.<br>`resource:image/*` to return notes with any images.|
|**sourceurl:**|Filter by source URL|`sourceurl:https://www.google.com`<br>`sourceurl:*joplinapp.org` to perform a wildcard search.|
|**id:**|Filter by note ID|`id:9cbc1b4f242043a9b8a50627508bccd5` return a note with the specified id |

Note: In the CLI client you have to escape the query using `--` when using negated filters.
Eg. `:search -- "-tag:tag1"`.

The filters are implicitly connected by and/or connectives depending on the following rules:

- By default, all filters are connected by "AND".
- To override this default behaviour, use the `any` filter, in which case the search terms will be connected by "OR" instead.
- There's an exception for the `notebook` filters which are connected by "OR". The reason being that no note can be in multiple notebooks at once.

Incorrect search filters are interpreted as a phrase search, e.g. a misspelled filter or non-existing `https://joplinapp.org`.

## Search order

Notes are sorted by "relevance". Currently it means the notes that contain the requested terms the most times are on top. For queries with multiple terms, it also matters how close to each other the terms are. This is a bit experimental so if you notice a search query that returns unexpected results, please report it in the forum, providing as many details as possible to replicate the issue.

## Goto Anything

In the desktop application, press <kbd>Ctrl+P</kbd> or <kbd>Cmd+P</kbd> and type a note title or part of its content to jump to it. Or type <kbd>#</kbd> followed by a tag name, or <kbd>@</kbd> followed by a notebook name.