import { HighlightedWord } from '@joplin/lib/reducer';
import { useMemo } from 'react';

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

export default function useSearchMarkers(showLocalSearch: boolean, localSearchMarkerOptions: ()=> SearchMarkers, highlightedWords: HighlightedWord[] = []) {
	return useMemo((): SearchMarkers => {
		if (showLocalSearch) return localSearchMarkerOptions();

		const output = defaultSearchMarkers();
		output.keywords = highlightedWords;

		return output;
	}, [highlightedWords, showLocalSearch, localSearchMarkerOptions]);
}
