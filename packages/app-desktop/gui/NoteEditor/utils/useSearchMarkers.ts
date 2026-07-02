import { useMemo } from 'react';

interface SearchMarkersOptions {
	searchTimestamp: number;
	selectedIndex: number;
	separateWordSearch: boolean;
	withSelection?: boolean;
}

export interface SearchMarkers {
	keywords: { value: string; type?: string; accuracy?: string }[];
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


// eslint-disable-next-line @typescript-eslint/no-unsafe-function-type, @typescript-eslint/no-explicit-any -- Function type matches the original signature; any[] matches the lib reducer's searches shape and the heterogeneous highlightedWords shape (string[] at the call site, keyword shapes inside)
export default function useSearchMarkers(showLocalSearch: boolean, localSearchMarkerOptions: Function, searches: any[], selectedSearchId: string, highlightedWords: any[] = []) {
	return useMemo((): SearchMarkers => {
		if (showLocalSearch) return localSearchMarkerOptions();

		const output = defaultSearchMarkers();
		output.keywords = highlightedWords;

		return output;
		// eslint-disable-next-line @seiyab/react-hooks/exhaustive-deps -- Old code before rule was applied
	}, [highlightedWords, showLocalSearch, localSearchMarkerOptions, searches, selectedSearchId]);
}
