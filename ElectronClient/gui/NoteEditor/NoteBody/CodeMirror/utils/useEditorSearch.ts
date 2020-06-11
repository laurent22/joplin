import { useState } from 'react';
// Helper functions that use the cursor
export default function useCursorUtils(CodeMirror: any) {

	const [markers, setMarkers] = useState(null);
	const [scrollMarkers, setScrollMarkers] = useState(null);

	function clearMarkers() {
		if (markers) {
			for (let i = 0; i < markers.length; i++) {
				markers[i].clear();
			}
		}

		if (scrollMarkers) {
			for (let i = 0; i < scrollMarkers.length; i++) {
				scrollMarkers[i].clear();
			}
		}
	}

	CodeMirror.defineExtension('setMarkers', function(keywords: any, options: any) {
		clearMarkers();
		const matches = [];
		const marks = [];
		const scrollMarks = [];

		for (let i = 0; i < keywords.length; i++) {
			const keyword = keywords[i];

			if (keyword.value === '') continue;

			let searchTerm = keyword.value;

			if (keyword.accuracy === 'partially') {
				searchTerm = new RegExp(keyword.value, 'i');
			}

			scrollMarks.push(this.showMatchesOnScrollbar(searchTerm, true, 'mark-scrollbar'));
			const cursor = this.getSearchCursor(searchTerm);

			while (cursor.findNext()) {
				matches.push(cursor.pos);
				marks.push(this.markText(cursor.from(), cursor.to(), { className: 'mark' }));
			}

			if (options.selectedIndex < matches.length) {
				const selected = matches[options.selectedIndex];
				marks.push(this.markText(selected.from, selected.to, { className: 'mark-selected' }));
				this.scrollIntoView(selected);
			}

		}

		setMarkers(marks);
		setScrollMarkers(scrollMarks);
		return matches.length;
	});
}
