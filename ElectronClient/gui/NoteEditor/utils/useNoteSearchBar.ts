import { useState, useCallback } from 'react';
import { SearchMarkers } from './useSearchMarkers';

interface LocalSearch {
	query: string,
	selectedIndex: number,
	resultCount: number,
	searching: boolean,
	timestamp: number,
}

function defaultLocalSearch():LocalSearch {
	return {
		query: '',
		selectedIndex: 0,
		resultCount: 0,
		searching: false,
		timestamp: 0,
	};
}

export default function useNoteSearchBar() {
	const [showLocalSearch, setShowLocalSearch] = useState(false);
	const [localSearch, setLocalSearch] = useState<LocalSearch>(defaultLocalSearch());

	const onChange = useCallback((query:string) => {
		setLocalSearch((prev:LocalSearch) => {
			return {
				query: query,
				selectedIndex: 0,
				timestamp: Date.now(),
				resultCount: prev.resultCount,
				searching: true,
			};
		});
	}, []);

	const noteSearchBarNextPrevious = useCallback((inc:number) => {
		setLocalSearch((prev:LocalSearch) => {
			const ls = Object.assign({}, prev);
			ls.selectedIndex += inc;
			ls.timestamp = Date.now();
			if (ls.selectedIndex < 0) ls.selectedIndex = ls.resultCount - 1;
			if (ls.selectedIndex >= ls.resultCount) ls.selectedIndex = 0;
			return ls;
		});
	}, []);

	const onNext = useCallback(() => {
		noteSearchBarNextPrevious(+1);
	}, [noteSearchBarNextPrevious]);

	const onPrevious = useCallback(() => {
		noteSearchBarNextPrevious(-1);
	}, [noteSearchBarNextPrevious]);

	const onClose = useCallback(() => {
		setShowLocalSearch(false);
		setLocalSearch(defaultLocalSearch());
	}, []);

	const setResultCount = useCallback((count:number) => {
		setLocalSearch((prev:LocalSearch) => {
			if (prev.resultCount === count && !prev.searching) return prev;

			return {
				...prev,
				resultCount: count,
				searching: false,
			};
		});
	}, []);

	const searchMarkers = useCallback(():SearchMarkers => {
		return {
			options: {
				selectedIndex: localSearch.selectedIndex,
				separateWordSearch: false,
				searchTimestamp: localSearch.timestamp,
			},
			keywords: [
				{
					type: 'text',
					value: localSearch.query,
					accuracy: 'partially',
				},
			],
		};
	}, [localSearch]);

	return { localSearch, onChange, onNext, onPrevious, onClose, setResultCount, showLocalSearch, setShowLocalSearch, searchMarkers };
}
