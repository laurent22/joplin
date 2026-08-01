import useQueuedAsyncEffect from '@joplin/lib/hooks/useQueuedAsyncEffect';
import { HighlightedWord, SearchEntry } from '@joplin/lib/reducer';
import SearchService, { SearchResult } from '@joplin/lib/services/ai/SearchService';
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

// The indexer can prepend the note title to the first chunk:
// Remove it so that the results are exact substrings of the note body
const removeNoteTitle = (result: SearchResult, noteTitle: string) => {
	if (result.chunkIndex !== 0) return result;

	let chunkText = result.chunkText.trim();
	while (chunkText.startsWith(`${noteTitle}\n`)) {
		chunkText = chunkText.substring(noteTitle.length).trim();
	}

	return {
		...result,
		chunkText,
	};
};

interface UseSemanticSearchMatchesProps {
	query: string;
	noteId: string;
	noteTitle: string;
}

// Returns matching substrings of the note for the given search query
const useSemanticSearchMatches = ({ query, noteId, noteTitle }: UseSemanticSearchMatchesProps) => {
	const [matchingChunks, setMatchingChunks] = useState<string[]>([]);
	const matchingChunksRef = useRef(matchingChunks);
	matchingChunksRef.current = matchingChunks;

	useEffect(() => {
		if (!query && matchingChunksRef.current.length !== 0) {
			setMatchingChunks([]);
		}
	}, [query]);

	const noteTitleRef = useRef(noteTitle);
	noteTitleRef.current = noteTitle;

	useQueuedAsyncEffect(async (event) => {
		if (!query) {
			return;
		}

		const results = await SearchService.instance().search({ query: { text: query }, scope: { type: 'note', noteId } });
		if (event.cancelled) return;

		const matches = [];
		for (const result of results) {
			const bestMatch = await SearchService.instance().bestMatchInResult(
				query, removeNoteTitle(result, noteTitleRef.current),
			);
			if (event.cancelled) return;
			matches.push(bestMatch);
		}

		setMatchingChunks(matches);
	}, [query, noteId], { interval: Second });

	return matchingChunks;
};

interface UseSearchMarkersProps {
	showLocalSearch: boolean;
	localSearchMarkerOptions: ()=> SearchMarkers;
	noteId: string;
	searchResults: ProcessResultsRow[];
	searchId: string;
	searches: SearchEntry[];
	highlightedWords: HighlightedWord[];
	noteTitle: string;
}

export default function useSearchMarkers({
	showLocalSearch,
	localSearchMarkerOptions,
	noteId,
	searchResults,
	searchId,
	searches,
	highlightedWords,
	noteTitle,
}: UseSearchMarkersProps) {
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

	const semanticSearchMatches = useSemanticSearchMatches({
		query: semanticSearchQuery, noteId, noteTitle,
	});

	return useMemo((): SearchMarkers => {
		if (showLocalSearch) return localSearchMarkerOptions();

		const output = defaultSearchMarkers();
		output.keywords = highlightedWords ?? [];

		if (semanticSearchMatches.length) {
			output.keywords = output.keywords.concat(semanticSearchMatches.map(match => (
				{ type: 'text', accuracy: 'partial', value: match }
			)));
		}

		return output;
	}, [highlightedWords, showLocalSearch, localSearchMarkerOptions, semanticSearchMatches]);
}
