import * as React from 'react';
import { useState, useEffect } from 'react';
import JoplinServerApi from '@joplin/lib/JoplinServerApi';
import { _, _n } from '@joplin/lib/locale';
import Note from '@joplin/lib/models/Note';
import Setting from '@joplin/lib/models/Setting';
import DialogButtonRow from './DialogButtonRow';
import { themeStyle, buildStyle } from '@joplin/lib/theme';
import { reg } from '@joplin/lib/registry';
import Dialog from './Dialog';
import DialogTitle from './DialogTitle';
import ShareService from '@joplin/lib/services/share/ShareService';
import { StateShare } from '@joplin/lib/services/share/reducer';
import { NoteEntity } from '@joplin/lib/services/database/types';
import Button from './Button/Button';
import { connect } from 'react-redux';
import { AppState } from '../app';
const { clipboard } = require('electron');

interface Props {
	themeId: number;
	noteIds: Array<string>;
	onClose: Function;
	shares: StateShare[];
}

function styles_(props: Props) {
	return buildStyle('ShareNoteDialog', props.themeId, (theme: any) => {
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

export function ShareNoteDialog(props: Props) {
	console.info('Render ShareNoteDialog');

	const [notes, setNotes] = useState<NoteEntity[]>([]);
	const [sharesState, setSharesState] = useState<string>('unknown');
	// const [shares, setShares] = useState<SharesMap>({});

	const noteCount = notes.length;
	const theme = themeStyle(props.themeId);
	const styles = styles_(props);

	useEffect(() => {
		void ShareService.instance().refreshShares();
	}, []);

	useEffect(() => {
		async function fetchNotes() {
			const result = [];
			for (const noteId of props.noteIds) {
				result.push(await Note.load(noteId));
			}
			setNotes(result);
		}

		void fetchNotes();
	}, [props.noteIds]);

	const buttonRow_click = () => {
		props.onClose();
	};

	const copyLinksToClipboard = (shares: StateShare[]) => {
		const links = [];
		for (const share of shares) links.push(ShareService.instance().shareUrl(ShareService.instance().userId, share));
		clipboard.writeText(links.join('\n'));
	};

	const shareLinkButton_click = async () => {
		const service = ShareService.instance();

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

				const newShares: StateShare[] = [];

				for (const note of notes) {
					const share = await service.shareNote(note.id);
					newShares.push(share);
				}

				setSharesState('synchronizing');
				await reg.waitForSyncFinishedThenSync();
				setSharesState('creating');

				copyLinksToClipboard(newShares);

				setSharesState('created');

				await ShareService.instance().refreshShares();
			} catch (error) {
				if (error.code === 404 && !hasSynced) {
					reg.logger().info('ShareNoteDialog: Note does not exist on server - trying to sync it.', error);
					tryToSync = true;
					continue;
				}

				reg.logger().error('ShareNoteDialog: Cannot publish note:', error);

				setSharesState('idle');
				alert(JoplinServerApi.connectionErrorMessage(error));
			}

			break;
		}
	};

	// const removeNoteButton_click = (event: any) => {
	// 	const newNotes = [];
	// 	for (let i = 0; i < notes.length; i++) {
	// 		const n = notes[i];
	// 		if (n.id === event.noteId) continue;
	// 		newNotes.push(n);
	// 	}
	// 	setNotes(newNotes);
	// };

	const unshareNoteButton_click = async (event: any) => {
		await ShareService.instance().unshareNote(event.noteId);
		await ShareService.instance().refreshShares();
	};

	const renderNote = (note: NoteEntity) => {
		const unshareButton = !props.shares.find(s => s.note_id === note.id) ? null : (
			<Button tooltip={_('Unpublish note')} iconName="fas fa-share-alt" onClick={() => unshareNoteButton_click({ noteId: note.id })}/>
		);

		// const removeButton = notes.length <= 1 ? null : (
		// 	<Button iconName="fa fa-times" onClick={() => removeNoteButton_click({ noteId: note.id })}/>
		// );

		// const unshareButton = !shares[note.id] ? null : (
		// 	<button onClick={() => unshareNoteButton_click({ noteId: note.id })} style={styles.noteRemoveButton}>
		// 		<i style={styles.noteRemoveButtonIcon} className={'fas fa-share-alt'}></i>
		// 	</button>
		// );

		// const removeButton = notes.length <= 1 ? null : (
		// 	<button onClick={() => removeNoteButton_click({ noteId: note.id })} style={styles.noteRemoveButton}>
		// 		<i style={styles.noteRemoveButtonIcon} className={'fa fa-times'}></i>
		// 	</button>
		// );

		return (
			<div key={note.id} style={styles.note}>
				<span style={styles.noteTitle}>{note.title}</span>{unshareButton}
			</div>
		);
	};

	const renderNoteList = (notes: any) => {
		const noteComps = [];
		for (const note of notes) {
			noteComps.push(renderNote(note));
		}
		return <div style={styles.noteList}>{noteComps}</div>;
	};

	const statusMessage = (sharesState: string): string => {
		if (sharesState === 'synchronizing') return _('Synchronising...');
		if (sharesState === 'creating') return _n('Generating link...', 'Generating links...', noteCount);
		if (sharesState === 'created') return _n('Link has been copied to clipboard!', 'Links have been copied to clipboard!', noteCount);
		return '';
	};

	function renderEncryptionWarningMessage() {
		if (!Setting.value('encryption.enabled')) return null;
		return <div style={theme.textStyle}>{_('Note: When a note is shared, it will no longer be encrypted on the server.')}<hr/></div>;
	}

	function renderContent() {
		return (
			<div>
				<DialogTitle title={_('Publish Notes')}/>
				{renderNoteList(notes)}
				<button disabled={['creating', 'synchronizing'].indexOf(sharesState) >= 0} style={styles.copyShareLinkButton} onClick={shareLinkButton_click}>{_n('Copy Shareable Link', 'Copy Shareable Links', noteCount)}</button>
				<div style={theme.textStyle}>{statusMessage(sharesState)}</div>
				{renderEncryptionWarningMessage()}
				<DialogButtonRow
					themeId={props.themeId}
					onClick={buttonRow_click}
					okButtonShow={false}
					cancelButtonLabel={_('Close')}
				/>
			</div>
		);
	}

	return (
		<Dialog renderContent={renderContent}/>
	);
}

const mapStateToProps = (state: AppState) => {
	return {
		shares: state.shareService.shares.filter(s => !!s.note_id),
	};
};

export default connect(mapStateToProps)(ShareNoteDialog as any);
