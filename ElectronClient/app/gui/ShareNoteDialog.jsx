const React = require('react');
const { useState, useEffect } = React;
const { _ } = require('lib/locale.js');
const { themeStyle } = require('../theme.js');
const DialogButtonRow = require('./DialogButtonRow.min');
const Note = require('lib/models/Note');
const { reg } = require('lib/registry.js');

function ShareNoteDialog(props) {
	console.info('Render ShareNoteDialog');

	const [notes, setNotes] = useState({});

	const theme = themeStyle(props.theme);

	useEffect(() => {
		async function fetchNotes() {
			const result = [];
			for (let noteId of props.noteIds) {
				result.push(await Note.load(noteId));
			}
			setNotes(result);
		}

		fetchNotes();
	}, [props.noteIds]);

	const buttonRow_click = () => {

	};

	const shareLinkButton_click = async () => {
		const result = await reg.joplinServerApi().exec('POST', 'shares', { syncTargetId: '0123456789012345678922', noteId: notes[0].id });
		console.info(result);
	};

	const removeNoteButton_click = () => {

	};

	const renderNote = (note) => {
		const removeButton = <button onClick={() => removeNoteButton_click({ noteId: note.id })}><i style={theme.icon} className={'fa fa-times'}></i></button>;
		return (
			<div key={note.id}>
				{note.title} {removeButton}
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
				<button style={theme.buttonStyle} onClick={shareLinkButton_click}>{_('Share Link to Note(s)')}</button>
				<DialogButtonRow theme={props.theme} onClick={buttonRow_click}/>
			</div>
		</div>
	);
}

module.exports = ShareNoteDialog;
