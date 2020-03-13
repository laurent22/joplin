import * as React from 'react';
import { useState, useEffect } from 'react';
import JoplinServerApi from '../lib/JoplinServerApi';

const { _, _n } = require('lib/locale.js');
const { themeStyle, buildStyle } = require('../theme.js');
const DialogButtonRow = require('./DialogButtonRow.min');
const Note = require('lib/models/Note');
const Setting = require('lib/models/Setting');
const BaseItem = require('lib/models/BaseItem');
const { reg } = require('lib/registry.js');
const { clipboard } = require('electron');

interface ShareNoteDialogProps {
	theme: number,
	noteIds: Array<string>,
	onClose: Function,
}

interface SharesMap {
	[key: string]: any;
}

function styles_(props:ShareNoteDialogProps) {
	return buildStyle('ShareNoteDialog', props.theme, (theme:any) => {
		return {
			noteList: {
				marginBottom: 10,
			},
			note: {
				flex: 1,
				flexDirection: 'row',
				display: 'flex',
				alignItems: 'center',
				border: '1px solid',
				borderColor: theme.dividerColor,
				padding: '0.5em',
				marginBottom: 5,
			},
			noteTitle: {
				...theme.textStyle,
				flex: 1,
				display: 'flex',
				color: theme.color,
			},
			noteRemoveButton: {
				background: 'none',
				border: 'none',
			},
			noteRemoveButtonIcon: {
				color: theme.color,
				fontSize: '1.4em',
			},
			copyShareLinkButton: {
				...theme.buttonStyle,
				marginBottom: 10,
			},
		};
	});
}

export default function ShareNoteDialog(props:ShareNoteDialogProps) {
	console.info('Render ShareNoteDialog');

	const [notes, setNotes] = useState<any[]>([]);
	const [sharesState, setSharesState] = useState<string>('unknown');
	const [shares, setShares] = useState<SharesMap>({});

	const noteCount = notes.length;
	const theme = themeStyle(props.theme);
	const styles = styles_(props);

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

	const copyLinksToClipboard = (shares:SharesMap) => {
		const links = [];
		for (const n in shares) links.push(shares[n]._url);
		clipboard.writeText(links.join('\n'));
	};

	const shareLinkButton_click = async () => {
		let hasSynced = false;
		let tryToSync = false;
		while (true) {
			try {
				if (tryToSync) {
					setSharesState('synchronizing');
					await reg.waitForSyncFinishedThenSync();
					tryToSync = false;
					hasSynced = true;
				}

				setSharesState('creating');

				const api = await appApi();
				const syncTargetId = api.syncTargetId(Setting.toPlainObject());
				const newShares = Object.assign({}, shares);
				let sharedStatusChanged = false;

				for (const note of notes) {
					const result = await api.exec('POST', 'shares', {
						syncTargetId: syncTargetId,
						noteId: note.id,
					});
					newShares[note.id] = result;

					const changed = await BaseItem.updateShareStatus(note, true);
					if (changed) sharedStatusChanged = true;
				}

				setShares(newShares);

				if (sharedStatusChanged) {
					setSharesState('synchronizing');
					await reg.waitForSyncFinishedThenSync();
					setSharesState('creating');
				}

				copyLinksToClipboard(newShares);

				setSharesState('created');
			} catch (error) {
				if (error.code === 404 && !hasSynced) {
					reg.logger().info('ShareNoteDialog: Note does not exist on server - trying to sync it.', error);
					tryToSync = true;
					continue;
				}

				reg.logger().error('ShareNoteDialog: Cannot share note:', error);

				setSharesState('idle');
				alert(JoplinServerApi.connectionErrorMessage(error));
			}

			break;
		}
	};

	const removeNoteButton_click = (event:any) => {
		const newNotes = [];
		for (let i = 0; i < notes.length; i++) {
			const n = notes[i];
			if (n.id === event.noteId) continue;
			newNotes.push(n);
		}
		setNotes(newNotes);
	};

	const renderNote = (note:any) => {
		const removeButton = notes.length <= 1 ? null : (
			<button onClick={() => removeNoteButton_click({ noteId: note.id })} style={styles.noteRemoveButton}>
				<i style={styles.noteRemoveButtonIcon} className={'fa fa-times'}></i>
			</button>
		);

		return (
			<div key={note.id} style={styles.note}>
				<span style={styles.noteTitle}>{note.title}</span>{removeButton}
			</div>
		);
	};

	const renderNoteList = (notes:any) => {
		const noteComps = [];
		for (let noteId of Object.keys(notes)) {
			noteComps.push(renderNote(notes[noteId]));
		}
		return <div style={styles.noteList}>{noteComps}</div>;
	};

	const statusMessage = (sharesState:string):string => {
		if (sharesState === 'synchronizing') return _('Synchronising...');
		if (sharesState === 'creating') return _n('Generating link...', 'Generating links...', noteCount);
		if (sharesState === 'created') return _n('Link has been copied to clipboard!', 'Links have been copied to clipboard!', noteCount);
		return '';
	};

	const encryptionWarningMessage = !Setting.value('encryption.enabled') ? null : <div style={theme.textStyle}>{_('Note: When a note is shared, it will no longer be encrypted on the server.')}</div>;

	const rootStyle = Object.assign({}, theme.dialogBox);
	rootStyle.width = '50%';

	return (
		<div style={theme.dialogModalLayer}>
			<div style={rootStyle}>
				<div style={theme.dialogTitle}>{_('Share Notes')}</div>
				{renderNoteList(notes)}
				<button disabled={['creating', 'synchronizing'].indexOf(sharesState) >= 0} style={styles.copyShareLinkButton} onClick={shareLinkButton_click}>{_n('Copy Shareable Link', 'Copy Shareable Links', noteCount)}</button>
				<div style={theme.textStyle}>{statusMessage(sharesState)}</div>
				{encryptionWarningMessage}
				<DialogButtonRow theme={props.theme} onClick={buttonRow_click} okButtonShow={false} cancelButtonLabel={_('Close')}/>
			</div>
		</div>
	);
}
