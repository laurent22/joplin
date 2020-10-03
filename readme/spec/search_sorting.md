# Search Engine

The Search Engine powers the Search input in the note list and the Goto Anything dialog.

## Search algorithm

### Determining weight as a sorting parameter

Weight is determined by both [BM25](https://en.wikipedia.org/wiki/Okapi_BM25) and the amount of days since user_updated_time.

BM25 is based on term frequency - inverse document frequency
The tf–idf value increases proportionally to the number of times a word appears in the document
and is offset by the number of documents in the corpus that contain the word, which helps to adjust
for the fact that some words appear more frequently in general.

BM25 returns weight zero for search term which occurs in more than half the notes.
So terms that are abundant in all notes to have zero relevance w.r.t BM25.

Each note's user_updated_time is then used to increase the BM25 weight by the inverse of the amount of days since the note was updated.
Recent notes will therefore be weighted highly in the search results.
The additional weight of user_updated_time decays logarithmically, so user_updated_time becomes minute after many months have passed.

### Discretely using only the most important parameter in sorting

Sorting occurs as the SearchEngine processes results, after searching for and weighting these results.

Sorting parameters are discretely used.
Therefore, for example, search results with note title matches will appear above all results with only note body matches, regardless of weight or other factors.
