'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
const react_1 = require('react');
function useEffectiveNoteId(props) {
	// When a notebook is changed without any selected note,
	// no note is selected for a moment, and then a new note gets selected.
	// In this short transient period, the last displayed note id should temporarily
	// be used to prevent NoteEditor's body from being unmounted.
	// See https://github.com/laurent22/joplin/issues/6416
	// and https://github.com/laurent22/joplin/pull/6430 for details.
	const lastDisplayedNoteId = react_1.useRef(null);
	const whenNoteIdIsTransientlyAbsent = !props.noteId && props.notes.length > 0;
	const effectiveNoteId = whenNoteIdIsTransientlyAbsent ? lastDisplayedNoteId.current : props.noteId;
	react_1.useEffect(() => {
		if (props.noteId) { lastDisplayedNoteId.current = props.noteId; }
	}, [props.noteId]);
	return effectiveNoteId;
}
exports.default = useEffectiveNoteId;
// # sourceMappingURL=useEffectiveNoteId.js.map
