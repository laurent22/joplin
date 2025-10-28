import { useCallback, useEffect, useRef, useState } from 'react';
import shim from '@joplin/lib/shim';
import Logger from '@joplin/utils/Logger';
import CodeMirror5Emulation from '@joplin/editor/CodeMirror/CodeMirror5Emulation/CodeMirror5Emulation';

const logger = Logger.create('useEditorSearch');

// Registers a helper CodeMirror extension to be used with
// useEditorSearchHandler.

type Mark = { clear: ()=> void };
interface SearchHighlightState {
	previousKeywordValue: string;
	previousIndex: number;
	previousSearchTimestamp: number;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Partial refactor of old code before rule was applied
	overlayTimeoutRef: { current: any };
	clearMarkers(): void;
	clearOverlay(editor: CodeMirror5Emulation): void;
	getSearchTerm(keyword: string): RegExp;
	highlightSearch(cm: CodeMirror5Emulation, searchTerm: RegExp, index: number, scrollTo: boolean, withSelection: boolean): Mark;
	setMarkers(marker: Mark[]): void;
	setPreviousIndex(index: number): void;
	setPreviousSearchTimestamp(timestamp: number): void;
	setPreviousKeywordValue(value: string): void;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Partial refactor of old code before rule was applied
	setScrollbarMarks(marks: any): void;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Partial refactor of old code before rule was applied
	setOverlay(overlay: any): void;
	setOverlayTimeout(timeout: number): void;
}


// Modified from codemirror/addons/search/search.js
const searchOverlay = (query: RegExp) => {
	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
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
};

const addCodeMirrorExtension = (CodeMirror: CodeMirror5Emulation) => {
	CodeMirror.defineOption('joplin.search-highlight-state', null, ()=>{});
	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	CodeMirror?.defineExtension('setMarkers', function(keywords: any, options: any) {
		// Pass arguments in via options to allow the extension to work if multiple editors are open simultaneously
		// See https://github.com/laurent22/joplin/issues/13399.
		const state: SearchHighlightState = this.getOption('joplin.search-highlight-state');
		if (!options) {
			options = { selectedIndex: 0, searchTimestamp: 0 };
		}

		if (options.showEditorMarkers === false) {
			state.clearMarkers();
			state.clearOverlay(this);
			return;
		}

		state.clearMarkers();

		// HIGHLIGHT KEYWORDS
		// When doing a global search it's possible to have multiple keywords
		// This means we need to highlight each one
		// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
		const marks: any = [];
		for (let i = 0; i < keywords.length; i++) {
			const keyword = keywords[i];

			if (keyword.value === '') continue;

			const searchTerm = state.getSearchTerm(keyword);

			// We only want to scroll the first keyword into view in the case of a multi keyword search
			const scrollTo = i === 0 && (state.previousKeywordValue !== keyword.value || state.previousIndex !== options.selectedIndex || options.searchTimestamp !== state.previousSearchTimestamp);

			try {
				const match = state.highlightSearch(this, searchTerm, options.selectedIndex, scrollTo, !!options.withSelection);
				if (match) marks.push(match);
			} catch (error) {
				if (error.name !== 'SyntaxError') {
					throw error;
				}
				// An error of 'Regular expression too large' might occur in the markJs library
				// when the input is really big, this catch is here to avoid the application crashing
				// https://github.com/laurent22/joplin/issues/7634
				console.error('Error while trying to highlight words from search: ', error);
			}
		}

		state.setMarkers(marks);
		state.setPreviousIndex(options.selectedIndex);
		state.setPreviousSearchTimestamp(options.searchTimestamp);

		// SEARCHOVERLAY
		// We only want to highlight all matches when there is only 1 search term
		if (keywords.length !== 1 || keywords[0].value === '') {
			state.clearOverlay(this);
			const prev = keywords.length > 1 ? keywords[0].value : '';
			state.setPreviousKeywordValue(prev);
			return 0;
		}

		const searchTerm = state.getSearchTerm(keywords[0]);

		// Determine the number of matches in the source, this is passed on
		// to the NoteEditor component
		const regexMatches = this.getValue().match(searchTerm);
		const nMatches = regexMatches ? regexMatches.length : 0;

		// Don't bother clearing and re-calculating the overlay if the search term
		// hasn't changed
		if (keywords[0].value === state.previousKeywordValue) return nMatches;

		state.clearOverlay(this);
		state.setPreviousKeywordValue(keywords[0].value);

		// These operations are pretty slow, so we won't add use them until the user
		// has finished typing, 500ms is probably enough time
		const timeout = shim.setTimeout(() => {
			const scrollMarks = this.showMatchesOnScrollbar?.(searchTerm, true, 'cm-search-marker-scrollbar');
			const overlay = searchOverlay(searchTerm);
			this.addOverlay(overlay);
			state.setOverlay(overlay);
			state.setScrollbarMarks(scrollMarks);
		}, 500);

		state.setOverlayTimeout(timeout);
		state.overlayTimeoutRef.current = timeout;

		return nMatches;
	});
};

export default function useEditorSearchExtension(CodeMirror: CodeMirror5Emulation) {

	const [markers, setMarkers] = useState([]);
	const [overlay, setOverlay] = useState(null);
	const [scrollbarMarks, setScrollbarMarks] = useState(null);
	const [previousKeywordValue, setPreviousKeywordValue] = useState(null);
	const [previousIndex, setPreviousIndex] = useState(null);
	const [previousSearchTimestamp, setPreviousSearchTimestamp] = useState(0);
	const [overlayTimeout, setOverlayTimeout] = useState(null);
	const overlayTimeoutRef = useRef(null);
	overlayTimeoutRef.current = overlayTimeout;

	const clearMarkers = useCallback(() => {
		for (let i = 0; i < markers.length; i++) {
			markers[i].clear();
		}

		setMarkers([]);
	}, [markers]);

	const clearOverlay = useCallback((cm: CodeMirror5Emulation) => {
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
	}, [scrollbarMarks, overlay, overlayTimeout]);


	// Highlights the currently active found work
	// It's possible to get tricky with this functions and just use findNext/findPrev
	// but this is fast enough and works more naturally with the current search logic
	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	function highlightSearch(cm: CodeMirror5Emulation, searchTerm: RegExp, index: number, scrollTo: boolean, withSelection: boolean) {
		const cursor = cm.getSearchCursor(searchTerm);

		// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
		let match: any = null;
		for (let j = 0; j < index + 1; j++) {
			if (!cursor.findNext()) {
				// If we run out of matches then just highlight the final match
				break;
			}
			match = { from: cursor.from(), to: cursor.to() };
		}

		if (match) {
			if (scrollTo) {
				if (withSelection) {
					cm.setSelection(match.from, match.to);
				} else {
					cm.scrollIntoView(match);
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

	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
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

	if (CodeMirror) {
		const state: SearchHighlightState = {
			previousKeywordValue,
			previousIndex,
			previousSearchTimestamp,
			overlayTimeoutRef,
			clearMarkers,
			clearOverlay,
			getSearchTerm,
			highlightSearch,
			setMarkers,
			setPreviousIndex,
			setPreviousSearchTimestamp,
			setPreviousKeywordValue,
			setScrollbarMarks,
			setOverlay,
			setOverlayTimeout,
		};
		addCodeMirrorExtension(CodeMirror);
		CodeMirror.setOption('joplin.search-highlight-state', state);
	}
}
