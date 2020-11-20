# Search Engine

The Search Engine powers the Search input in the note list and the Goto Anything dialog.

## Search algorithm

### Discretely using only the most critical parameter in sorting

Sorting occurs as the Search Engine processes results, after searching for and weighting these results.

Parameters include fuzziness, title matching, weight (based on BM25 and age), the completed status of to-dos, and the note's age.

The Search Engine uses only the first relevant parameter to determine the order, rather than a weighted average.
In effect, this means search results with note title matches will appear above all results that only matched the note body,
regardless of weight or other parameters.

### Determining weight as a sorting parameter

The Search Engine determines the weight parameter using both [BM25](https://en.wikipedia.org/wiki/Okapi_BM25)
and the number of days since last user update.

#### BM25

The Search Engine determines BM25 based on "term frequency-inverse document frequency."
The "TF–IDF" value increases proportionally to the number of times a word appears in the document
and is offset by the number of documents in the corpus that contain the word, which helps to adjust
for the fact that some words appear more frequently in general.

BM25 returns weight zero for a search term that occurs in more than half the notes.
So terms that are abundant in all notes to have zero relevance w.r.t. BM25.

#### Days since last user update

Sorting increases the BM25 weight by the inverse number of days since the note was updated.
Recent notes will, therefore, be weighted highly in the search results.
This time-based weight decays logarithmically, becoming less of a factor than BM25 after months have passed.

