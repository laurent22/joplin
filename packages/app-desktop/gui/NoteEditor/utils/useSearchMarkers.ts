import { useMemo } from 'react';

interface SearchMarkersOptions {
	searchTimestamp: number;
	selectedIndex: number;
	separateWordSearch: boolean;
	withSelection?: boolean;
}

export interface SearchMarkers {
	keywords: any[];
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


// eslint-disable-next-line @typescript-eslint/ban-types -- Old code before rule was applied
export default function useSearchMarkers(showLocalSearch: boolean, localSearchMarkerOptions: Function, searches: any[], selectedSearchId: string, highlightedWords: any[] = []) {
	return useMemo((): SearchMarkers => {
		if (showLocalSearch) return localSearchMarkerOptions();

		const output = defaultSearchMarkers();
		output.keywords = highlightedWords;

		return output;
		// eslint-disable-next-line @seiyab/react-hooks/exhaustive-deps -- Old code before rule was applied
	}, [highlightedWords, showLocalSearch, localSearchMarkerOptions, searches, selectedSearchId]);
}
