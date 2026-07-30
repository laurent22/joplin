import useQueuedAsyncEffect from '@joplin/lib/hooks/useQueuedAsyncEffect';
import { HighlightedWord, SearchEntry } from '@joplin/lib/reducer';
import SearchService from '@joplin/lib/services/ai/SearchService';
import { ProcessResultsRow, SearchType } from '@joplin/lib/services/search/SearchEngine';
import { Second } from '@joplin/utils/time';
import { useMemo, useRef, useState } from 'react';

interface SearchMarkersOptions {
	searchTimestamp: number;
	selectedIndex: number;
	separateWordSearch: boolean;
	withSelection?: boolean;
}


export interface SearchMarkers {
	keywords: HighlightedWord[];
	options: SearchMarkersOptions;
}

function defaultSearchMarkers(): SearchMarkers {
	return {
		keywords: [],
		options: {
			searchTimestamp: 0,
			selectedIndex: 0,
			separateWordSearch: false,
		},
	};
}

const useSemanticSearchMatches = (query: string, noteId: string, noteBody: string, noteTitle: string) => {
	const [matchingChunks, setMatchingChunks] = useState([]);
	const matchingChunksRef = useRef(matchingChunks);
	matchingChunksRef.current = matchingChunks;

	useQueuedAsyncEffect(async (event) => {
		if (!query) {
			if (matchingChunksRef.current.length === 0) return;
			setMatchingChunks([]);
			return;
		}

		const results = await SearchService.instance().search({ query: { text: query }, scope: { type: 'note', noteId } });
		if (event.cancelled) return;
		setMatchingChunks(results.map(r => {
			let text = r.chunkText.trim();
			// The indexer sometimes prepends the note title
			while (r.chunkIndex === 0 && noteTitle && text.startsWith(noteTitle)) {
				text = text.substring(noteTitle.length).trim();
			}
			return text;
		}));
	}, [query, noteId, noteBody, noteTitle], { interval: Second });

	return matchingChunks;
};

export default function useSearchMarkers(
	showLocalSearch: boolean,
	localSearchMarkerOptions: ()=> SearchMarkers,
	noteId: string,
	searchResults: ProcessResultsRow[],
	searchId: string,
	searches: SearchEntry[],
	highlightedWords: HighlightedWord[] = [],
	noteBody: string,
	noteTitle: string,
) {
	const searchResultsRef = useRef(searchResults);
	searchResultsRef.current = searchResults;
	const currentNoteSearchResult = useMemo(() => {
		return searchResultsRef.current.find(result => result.id === noteId);
	}, [noteId]);

	const semanticSearchQuery = useMemo(() => {
		if (!currentNoteSearchResult) return null;
		if (!currentNoteSearchResult.searchType.includes(SearchType.Semantic)) return null;
		const search = searches.find(search => search.id === searchId);
		return search.query_pattern;
	}, [searches, searchId, currentNoteSearchResult]);

	const semanticSearchMatches = useSemanticSearchMatches(semanticSearchQuery, noteId, noteBody, noteTitle);

	return useMemo((): SearchMarkers => {
		if (showLocalSearch) return localSearchMarkerOptions();

		const output = defaultSearchMarkers();
		output.keywords = highlightedWords;

		if (semanticSearchMatches.length) {
			output.keywords = output.keywords.concat(semanticSearchMatches.map(match => (
				{ type: 'text', accuracy: 'partial', value: match }
			)));
		}

		return output;
	}, [highlightedWords, showLocalSearch, localSearchMarkerOptions, semanticSearchMatches]);
}
