import { useMemo } from 'react';

const BaseModel = require('lib/BaseModel.js');
const SearchEngine = require('lib/services/searchengine/SearchEngine');

interface SearchMarkersOptions {
	searchTimestamp: number,
	selectedIndex: number,
	separateWordSearch: boolean,
}

export interface SearchMarkers {
	keywords: any[],
	options: SearchMarkersOptions,
}

function defaultSearchMarkers():SearchMarkers {
	return {
		keywords: [],
		options: {
			searchTimestamp: 0,
			selectedIndex: 0,
			separateWordSearch: false,
		},
	};
}

export default function useSearchMarkers(showLocalSearch:boolean, localSearchMarkerOptions:Function, searches:any[], selectedSearchId:string) {
	return useMemo(():SearchMarkers => {
		if (showLocalSearch) return localSearchMarkerOptions();

		const output = defaultSearchMarkers();

		const search = BaseModel.byId(searches, selectedSearchId);
		if (search) {
			const parsedQuery = SearchEngine.instance().parseQuery(search.query_pattern);
			output.keywords = SearchEngine.instance().allParsedQueryTerms(parsedQuery);
		}

		return output;
	}, [showLocalSearch, localSearchMarkerOptions, searches, selectedSearchId]);
}
