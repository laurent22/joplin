import useQueuedAsyncEffect from '@joplin/lib/hooks/useQueuedAsyncEffect';
import { HighlightedWord, SearchEntry } from '@joplin/lib/reducer';
import SearchService from '@joplin/lib/services/ai/SearchService';
import { ProcessResultsRow, SearchType } from '@joplin/lib/services/search/SearchEngine';
import { Second } from '@joplin/utils/time';
import { useEffect, useMemo, useRef, useState } from 'react';

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

// Returns matching substrings of the note for the given search query
const useSemanticSearchMatches = (query: string, noteId: string) => {
	const [matchingChunks, setMatchingChunks] = useState<string[]>([]);
	const matchingChunksRef = useRef(matchingChunks);
	matchingChunksRef.current = matchingChunks;

	useEffect(() => {
		if (!query && matchingChunksRef.current.length !== 0) {
			setMatchingChunks([]);
		}
	}, [query]);

	useQueuedAsyncEffect(async (event) => {
		if (!query) {
			return;
		}

		const results = await SearchService.instance().search({ query: { text: query }, scope: { type: 'note', noteId }, relevance: 'strict' });
		if (event.cancelled) return;

		const matches = [];
		for (const result of results) {
			const bestMatch = await SearchService.instance().bestMatchInResult(query, result);
			if (event.cancelled) return;
			matches.push(bestMatch);
		}

		setMatchingChunks(matches);
	}, [query, noteId], { interval: Second });

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

	const semanticSearchMatches = useSemanticSearchMatches(semanticSearchQuery, noteId);

	return useMemo((): SearchMarkers => {
		if (showLocalSearch) return localSearchMarkerOptions();

		const output = defaultSearchMarkers();
		output.keywords = highlightedWords;

		if (semanticSearchMatches.length) {
			output.keywords = output.keywords.concat(semanticSearchMatches.flatMap(match =>
				match
					.split('\n')
					.filter(line => line.length > 0)
					.map(line => (
						{ type: 'text', accuracy: 'partial', value: line }
					)),
			));
		}

		return output;
	}, [highlightedWords, showLocalSearch, localSearchMarkerOptions, semanticSearchMatches]);
}
