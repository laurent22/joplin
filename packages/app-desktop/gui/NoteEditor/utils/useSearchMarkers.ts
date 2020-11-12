import { useMemo } from 'react';

interface SearchMarkersOptions {
	searchTimestamp: number,
	selectedIndex: number,
	separateWordSearch: boolean,
}

export interface SearchMarkers {
	keywords: any[],
	options: SearchMarkersOptions,
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


export default function useSearchMarkers(showLocalSearch: boolean, localSearchMarkerOptions: Function, searches: any[], selectedSearchId: string, highlightedWords: any[] = []) {
	return useMemo((): SearchMarkers => {
		if (showLocalSearch) return localSearchMarkerOptions();

		const output = defaultSearchMarkers();
		output.keywords = highlightedWords;

		return output;
	}, [highlightedWords, showLocalSearch, localSearchMarkerOptions, searches, selectedSearchId]);
}
