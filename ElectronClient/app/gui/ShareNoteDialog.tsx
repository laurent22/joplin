const React = require('react');
const { useState, useEffect } = React;
const { _ } = require('lib/locale.js');
const { themeStyle } = require('../theme.js');
const DialogButtonRow = require('./DialogButtonRow.min');
const Note = require('lib/models/Note');
const Setting = require('lib/models/Setting');
const { reg } = require('lib/registry.js');

import JoplinServerApi from '../lib/JoplinServerApi';

interface ShareNoteDialogProps {
	theme: number,
	noteIds: Array<string>,
	onClose: Function,
}

export default function ShareNoteDialog(props:ShareNoteDialogProps) {
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

	const appApi = async () => {
		return reg.syncTargetNextcloud().appApi();
	};

	const buttonRow_click = () => {
		props.onClose();
	};

	const shareLinkButton_click = async () => {
		try {
			const api = await appApi();
			const result = await api.exec('POST', 'shares', {
				syncTargetId: api.syncTargetId(Setting.toPlainObject()),
				noteId: notes[0].id,
			});
			console.info(result);
		} catch (error) {
			console.error(error);
			alert(JoplinServerApi.connectionErrorMessage(error));
		}
	};

	const removeNoteButton_click = (event:any) => {
		console.info(event);
	};

	const renderNote = (note:any) => {
		const removeButton = <button onClick={() => removeNoteButton_click({ noteId: note.id })}><i style={theme.icon} className={'fa fa-times'}></i></button>;
		return (
			<div key={note.id}>
				{note.title} {removeButton}
			</div>
		);
	};

	const renderNoteList = (notes:any) => {
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
				<DialogButtonRow theme={props.theme} onClick={buttonRow_click} okButtonShow={false} cancelButtonLabel={_('Close')}/>
			</div>
		</div>
	);
}
