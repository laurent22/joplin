'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
const react_1 = require('react');
// Helper functions that use the cursor
function useCursorUtils(CodeMirror) {
	const [markers, setMarkers] = react_1.useState([]);
	const [overlay, setOverlay] = react_1.useState(null);
	const [scrollbarMarks, setScrollbarMarks] = react_1.useState(null);
	const [overlayTimeout, setOverlayTimeout] = react_1.useState(null);
	const [previousKeywordValue, setPreviousKeywordValue] = react_1.useState(null);
	function clearMarkers() {
		for (let i = 0; i < markers.length; i++) {
			markers[i].clear();
		}
		setMarkers([]);
	}
	function clearOverlay(cm) {
		if (overlay) { cm.removeOverlay(overlay); }
		if (scrollbarMarks) { scrollbarMarks.clear(); }
		setOverlay(null);
		setScrollbarMarks(null);
	}
	// Modified from codemirror/addons/search/search.js
	function searchOverlay(query) {
		return { token: function(stream) {
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
	function highlightSearch(cm, searchTerm, index) {
		const marks = [];
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
	function getSearchTerm(keyword) {
		let searchTerm = new RegExp(keyword.value, 'g');
		if (keyword.accuracy === 'partially') {
			searchTerm = new RegExp(keyword.value, 'gi');
		}
		return searchTerm;
	}
	CodeMirror.defineExtension('setMarkers', function(keywords, options) {
		if (!options) {
			options = { selectedIndex: 0 };
		}
		clearMarkers();
		// HIGHLIGHT KEYWORDS
		// When doing a global search it's possible to have multiple keywords
		// This means we need to highlight each one
		let marks = [];
		for (let i = 0; i < keywords.length; i++) {
			const keyword = keywords[i];
			if (keyword.value === '') { continue; }
			const searchTerm = getSearchTerm(keyword);
			marks = marks.concat(highlightSearch(this, searchTerm, options.selectedIndex));
		}
		setMarkers(marks);
		// SEARCHOVERLAY
		// We only want to highlight all matches when there is only 1 search term
		if (keywords.length !== 1 || keywords[0].value == '') {
			clearOverlay(this);
			return 0;
		}
		const searchTerm = getSearchTerm(keywords[0]);
		// Determine the number of matches in the source, this is passed on
		// to the NoteEditor component
		const regexMatches = this.getValue().match(searchTerm);
		const nMatches = regexMatches ? regexMatches.length : 0;
		// Don't bother clearing and re-calculating the overlay if the search term
		// hasn't changed
		if (keywords[0].value === previousKeywordValue) { return nMatches; }
		clearOverlay(this);
		setPreviousKeywordValue(keywords[0].value);
		if (overlayTimeout) {
			clearTimeout(overlayTimeout);
		}
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
		return nMatches;
	});
}
exports.default = useCursorUtils;
// # sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXNlRWRpdG9yU2VhcmNoLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsidXNlRWRpdG9yU2VhcmNoLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7O0FBQUEsaUNBQWlDO0FBQ2pDLHVDQUF1QztBQUN2QyxTQUF3QixjQUFjLENBQUMsVUFBZTtJQUVyRCxNQUFNLENBQUMsT0FBTyxFQUFFLFVBQVUsQ0FBQyxHQUFHLGdCQUFRLENBQUMsRUFBRSxDQUFDLENBQUM7SUFDM0MsTUFBTSxDQUFDLE9BQU8sRUFBRSxVQUFVLENBQUMsR0FBRyxnQkFBUSxDQUFDLElBQUksQ0FBQyxDQUFDO0lBQzdDLE1BQU0sQ0FBQyxjQUFjLEVBQUUsaUJBQWlCLENBQUMsR0FBRyxnQkFBUSxDQUFDLElBQUksQ0FBQyxDQUFDO0lBQzNELE1BQU0sQ0FBQyxjQUFjLEVBQUUsaUJBQWlCLENBQUMsR0FBRyxnQkFBUSxDQUFDLElBQUksQ0FBQyxDQUFDO0lBQzNELE1BQU0sQ0FBQyxvQkFBb0IsRUFBRSx1QkFBdUIsQ0FBQyxHQUFHLGdCQUFRLENBQUMsSUFBSSxDQUFDLENBQUM7SUFFdkUsU0FBUyxZQUFZO1FBQ3BCLEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxPQUFPLENBQUMsTUFBTSxFQUFFLENBQUMsRUFBRSxFQUFFO1lBQ3hDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLEVBQUUsQ0FBQztTQUNuQjtRQUVELFVBQVUsQ0FBQyxFQUFFLENBQUMsQ0FBQztJQUNoQixDQUFDO0lBRUQsU0FBUyxZQUFZLENBQUMsRUFBTztRQUM1QixJQUFJLE9BQU87WUFBRSxFQUFFLENBQUMsYUFBYSxDQUFDLE9BQU8sQ0FBQyxDQUFDO1FBQ3ZDLElBQUksY0FBYztZQUFFLGNBQWMsQ0FBQyxLQUFLLEVBQUUsQ0FBQztRQUUzQyxVQUFVLENBQUMsSUFBSSxDQUFDLENBQUM7UUFDakIsaUJBQWlCLENBQUMsSUFBSSxDQUFDLENBQUM7SUFDekIsQ0FB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
