const React = require('react');
const { useState, useEffect } = React;
const { _ } = require('lib/locale.js');
const { themeStyle } = require('../theme.js');
const DialogButtonRow = require('./DialogButtonRow.min');
const Note = require('lib/models/Note');

function ShareNoteDialog(props) {
	const [notes, setNotes] = useState({});
	const [fetchingNoteStatus, setFetchingNoteStatus] = useState('idle');

	const theme = themeStyle(props.theme);

	useEffect(() => {
		if (fetchingNoteStatus !== 'idle') return;
		setFetchingNoteStatus('started');

		async function fetchNotes() {
			const result = [];
			for (let noteId of props.noteIds) {
				result.push(await Note.load(noteId));
			}
			setFetchingNoteStatus('done');
			setNotes(result);
		}
		fetchNotes();
	});

	const buttonRow_click = () => {

	};

	const renderNote = (note) => {
		return (
			<div>
				{note.title}
			</div>
		);
	};

	const renderNoteList = (notes) => {
		const noteComps = [];
		for (let noteId of Object.keys(notes)) {
			noteComps.push(renderNote(notes[noteId]));
		}
		return <div>{noteComps}</div>;
	};

	return (
		<div style={theme.dialogModalLayer}>
			<div style={theme.dialogBox}>
				<div style={theme.dialogTitle}>{_('Share Notes')}</div>
				{renderNoteList(notes)}
				<DialogButtonRow theme={props.theme} onClick={buttonRow_click}/>
			</div>
		</div>
	);
}

module.exports = ShareNoteDialog;
