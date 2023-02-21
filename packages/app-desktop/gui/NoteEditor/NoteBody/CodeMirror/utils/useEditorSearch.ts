import { useEffect, useRef, useState } from 'react';
import shim from '@joplin/lib/shim';
import Logger from '@joplin/lib/Logger';

const logger = Logger.create('useEditorSearch');

export default function useEditorSearch(CodeMirror: any) {

	const [markers, setMarkers] = useState([]);
	const [overlay, setOverlay] = useState(null);
	const [scrollbarMarks, setScrollbarMarks] = useState(null);
	const [previousKeywordValue, setPreviousKeywordValue] = useState(null);
	const [previousIndex, setPreviousIndex] = useState(null);
	const [previousSearchTimestamp, setPreviousSearchTimestamp] = useState(0);
	const [overlayTimeout, setOverlayTimeout] = useState(null);
	const overlayTimeoutRef = useRef(null);
	overlayTimeoutRef.current = overlayTimeout;

	function clearMarkers() {
		for (let i = 0; i < markers.length; i++) {
			markers[i].clear();
		}

		setMarkers([]);
	}

	function clearOverlay(cm: any) {
		if (overlay) cm.removeOverlay(overlay);
		if (scrollbarMarks) {
			try {
				scrollbarMarks.clear();
			} catch (error) {
				// This can randomly crash the app so just print a warning since
				// it's probably not critical.
				// https://github.com/laurent22/joplin/issues/7499
				logger.error('useEditorSearch: Could not clear scrollbar marks:', error);
			}
		}

		if (overlayTimeout) shim.clearTimeout(overlayTimeout);

		setOverlay(null);
		setScrollbarMarks(null);
		setOverlayTimeout(null);
	}

	// Modified from codemirror/addons/search/search.js
	function searchOverlay(query: RegExp) {
		return { token: function(stream: any) {
			query.lastIndex = stream.pos;
			const match = query.exec(stream.string);
			if (match && match.index === stream.pos) {
				stream.pos += match[0].length || 1;
				return 'search-marker';
			} else if (match) {
				stream.pos = match.index;
			} else {
				stream.skipToEnd();
			}
			return null;
		} };
	}

	// Highlights the currently active found work
	// It's possible to get tricky with this fucntions and just use findNext/findPrev
	// but this is fast enough and works more naturally with the current search logic
	function highlightSearch(cm: any, searchTerm: RegExp, index: number, scrollTo: boolean, withSelection: boolean) {
		const cursor = cm.getSearchCursor(searchTerm);

		let match: any = null;
		for (let j = 0; j < index + 1; j++) {
			if (!cursor.findNext()) {
				// If we run out of matches then just highlight the final match
				break;
			}
			match = cursor.pos;
		}

		if (match) {
			if (scrollTo) {
				if (withSelection) {
					cm.setSelection(match.from, match.to);
				} else {
					cm.scrollTo(match);
				}
			}
			return cm.markText(match.from, match.to, { className: 'cm-search-marker-selected' });
		}

		return null;
	}

	// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Regular_Expressions#Escaping
	function escapeRegExp(keyword: string) {
		return keyword.replace(/[.*+\-?^${}()|[\]\\]/g, '\\$&'); // $& means the whole matched string
	}

	function getSearchTerm(keyword: any) {
		const value = escapeRegExp(keyword.value);
		return new RegExp(value, 'gi');
	}

	useEffect(() => {
		return () => {
			if (overlayTimeoutRef.current) shim.clearTimeout(overlayTimeoutRef.current);
			overlayTimeoutRef.current = null;
		};
	}, []);

	CodeMirror.defineExtension('setMarkers', function(keywords: any, options: any) {
		if (!options) {
			options = { selectedIndex: 0, searchTimestamp: 0 };
		}

		clearMarkers();

		// HIGHLIGHT KEYWORDS
		// When doing a global search it's possible to have multiple keywords
		// This means we need to highlight each one
		const marks: any = [];
		for (let i = 0; i < keywords.length; i++) {
			const keyword = keywords[i];

			if (keyword.value === '') continue;

			const searchTerm = getSearchTerm(keyword);

			// We only want to scroll the first keyword into view in the case of a multi keyword search
			const scrollTo = i === 0 && (previousKeywordValue !== keyword.value || previousIndex !== options.selectedIndex || options.searchTimestamp !== previousSearchTimestamp);

			try {
				const match = highlightSearch(this, searchTerm, options.selectedIndex, scrollTo, !!options.withSelection);
				if (match) marks.push(match);
			} catch (error) {
				if (error.name !== 'SyntaxError') {
					throw error;
				}
				// An error of 'Regular expression too large' might occour in the markJs library
				// when the input is really big, this catch is here to avoid the application crashing
				// https://github.com/laurent22/joplin/issues/7634
				console.error('Error while trying to highlight words from search: ', error);
			}
		}

		setMarkers(marks);
		setPreviousIndex(options.selectedIndex);
		setPreviousSearchTimestamp(options.searchTimestamp);

		// SEARCHOVERLAY
		// We only want to highlight all matches when there is only 1 search term
		if (keywords.length !== 1 || keywords[0].value === '') {
			clearOverlay(this);
			const prev = keywords.length > 1 ? keywords[0].value : '';
			setPreviousKeywordValue(prev);
			return 0;
		}

		const searchTerm = getSearchTerm(keywords[0]);

		// Determine the number of matches in the source, this is passed on
		// to the NoteEditor component
		const regexMatches = this.getValue().match(searchTerm);
		const nMatches = regexMatches ? regexMatches.length : 0;

		// Don't bother clearing and re-calculating the overlay if the search term
		// hasn't changed
		if (keywords[0].value === previousKeywordValue) return nMatches;

		clearOverlay(this);
		setPreviousKeywordValue(keywords[0].value);

		// These operations are pretty slow, so we won't add use them until the user
		// has finished typing, 500ms is probably enough time
		const timeout = shim.setTimeout(() => {
			const scrollMarks = this.showMatchesOnScrollbar(searchTerm, true, 'cm-search-marker-scrollbar');
			const overlay = searchOverlay(searchTerm);
			this.addOverlay(overlay);
			setOverlay(overlay);
			setScrollbarMarks(scrollMarks);
		}, 500);

		setOverlayTimeout(timeout);
		overlayTimeoutRef.current = timeout;

		return nMatches;
	});
}
