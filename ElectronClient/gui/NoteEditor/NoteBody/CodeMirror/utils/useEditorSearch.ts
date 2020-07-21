import { useEffect, useRef, useState } from 'react';

export default function useEditorSearch(CodeMirror: any) {

	const [markers, setMarkers] = useState([]);
	const [overlay, setOverlay] = useState(null);
	const [scrollbarMarks, setScrollbarMarks] = useState(null);
	const [previousKeywordValue, setPreviousKeywordValue] = useState(null);
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
		if (scrollbarMarks) scrollbarMarks.clear();

		if (overlayTimeout) clearTimeout(overlayTimeout);

		setOverlay(null);
		setScrollbarMarks(null);
		setOverlayTimeout(null);
	}

	// Modified from codemirror/addons/search/search.js
	function searchOverlay(query: RegExp) {
		return { token: function(stream: any) {
			query.lastIndex = stream.pos;
			const match = query.exec(stream.string);
			if (match && match.index == stream.pos) {
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
	function highlightSearch(cm: any, searchTerm: RegExp, index: number) {
		const marks: any = [];

		const cursor = cm.getSearchCursor(searchTerm);

		let match = null;
		for (let j = 0; j < index + 1; j++) {
			if (!cursor.findNext()) {
				// If we run out of matches then just highlight the final match
				break;
			}
			match = cursor.pos;
		}

		if (match) {
			marks.push(cm.markText(match.from, match.to, { className: 'cm-search-marker-selected' }));
			cm.scrollIntoView(match);
		}

		return marks;
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
			if (overlayTimeoutRef.current) clearTimeout(overlayTimeoutRef.current);
			overlayTimeoutRef.current = null;
		};
	}, []);

	CodeMirror.defineExtension('setMarkers', function(keywords: any, options: any) {
		if (!options) {
			options = { selectedIndex: 0 };
		}

		clearMarkers();

		// HIGHLIGHT KEYWORDS
		// When doing a global search it's possible to have multiple keywords
		// This means we need to highlight each one
		let marks: any = [];
		for (let i = 0; i < keywords.length; i++) {
			const keyword = keywords[i];

			if (keyword.value === '') continue;

			const searchTerm = getSearchTerm(keyword);

			marks = marks.concat(highlightSearch(this, searchTerm, options.selectedIndex));
		}

		setMarkers(marks);

		// SEARCHOVERLAY
		// We only want to highlight all matches when there is only 1 search term
		if (keywords.length !== 1 || keywords[0].value == '') {
			clearOverlay(this);
			setPreviousKeywordValue('');
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
		const timeout = setTimeout(() => {
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
