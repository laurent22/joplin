import { useState, useCallback, MutableRefObject, useEffect } from 'react';
import Logger from '@joplin/utils/Logger';
import { SearchMarkers } from './useSearchMarkers';
const CommandService = require('@joplin/lib/services/CommandService').default;

const logger = Logger.create('useNoteSearchBar');

const queryMaxLength = 1000;

interface LocalSearch {
	query: string;
	selectedIndex: number;
	resultCount: number;
	searching: boolean;
	timestamp: number;
}

function defaultLocalSearch(): LocalSearch {
	return {
		query: '',
		selectedIndex: 0,
		resultCount: 0,
		searching: false,
		timestamp: 0,
	};
}

export interface UseNoteSearchBarProps {
	noteSearchBarRef: MutableRefObject<any>;
}

export default function useNoteSearchBar({ noteSearchBarRef }: UseNoteSearchBarProps) {
	const [showLocalSearch, setShowLocalSearch] = useState(false);
	const [localSearch, setLocalSearch] = useState<LocalSearch>(defaultLocalSearch());


	useEffect(() => {
		if (showLocalSearch && noteSearchBarRef.current) {
			noteSearchBarRef.current.focus();
		}
	}, [showLocalSearch, noteSearchBarRef]);

	const onChange = useCallback((query: string) => {
		// A query that's too long would make CodeMirror throw an exception
		// which would crash the app.
		// https://github.com/laurent22/joplin/issues/5380
		if (query.length > queryMaxLength) {
			logger.warn(`Query is longer than ${queryMaxLength} characters - it is going to be trimmed`);
			query = query.substr(0, queryMaxLength);
		}

		setLocalSearch((prev: LocalSearch) => {
			return {
				query: query,
				selectedIndex: 0,
				timestamp: Date.now(),
				resultCount: prev.resultCount,
				searching: true,
			};
		});
	}, []);

	const noteSearchBarNextPrevious = useCallback((inc: number) => {
		setLocalSearch((prev: LocalSearch) => {
			const ls = { ...prev };
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
		void CommandService.instance().execute('focusElementNoteBody');
	}, []);

	const setResultCount = useCallback((count: number) => {
		setLocalSearch((prev: LocalSearch) => {
			if (prev.resultCount === count && !prev.searching) return prev;

			return {
				...prev,
				resultCount: count,
				searching: false,
			};
		});
	}, []);

	const searchMarkers = useCallback((): SearchMarkers => {
		return {
			options: {
				selectedIndex: localSearch.selectedIndex,
				separateWordSearch: false,
				searchTimestamp: localSearch.timestamp,
				withSelection: true,
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
