import { useState } from 'react';
// Helper functions that use the cursor
export default function useCursorUtils(CodeMirror: any) {

	const [markers, setMarkers] = useState(null);

	function clearMarkers() {
		if (!markers) return;

		for (let i = 0; i < markers.length; i++) {
			markers[i].clear();
		}
	}


	CodeMirror.defineExtension('setMarkers', function(keywords: any, options: any) {
		clearMarkers();
		const matches = [];
		const marks = [];

		for (let i = 0; i < keywords.length; i++) {
			const keyword = keywords[i];

			if (keyword.value === '') continue;

			let searchTerm = keyword.value;

			if (keyword.accuracy === 'partially') {
				searchTerm = new RegExp(keyword.value, 'i');
			}

			const cursor = this.getSearchCursor(searchTerm, null);

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
		return matches.length;
	});
}
