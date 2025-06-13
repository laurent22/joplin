import * as React from 'react';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { _, _n } from '@joplin/lib/locale';
import Note from '@joplin/lib/models/Note';
import DialogButtonRow from './DialogButtonRow';
import { themeStyle, buildStyle } from '@joplin/lib/theme';
import Dialog from './Dialog';
import DialogTitle from './DialogTitle';
import ShareService from '@joplin/lib/services/share/ShareService';
import { StateShare } from '@joplin/lib/services/share/reducer';
import { NoteEntity } from '@joplin/lib/services/database/types';
import Button from './Button/Button';
import { connect } from 'react-redux';
import { AppState } from '../app.reducer';
import SyncTargetRegistry from '@joplin/lib/SyncTargetRegistry';
import useOnShareLinkClick from '@joplin/lib/components/shared/ShareNoteDialog/useOnShareLinkClick';
import onUnshareNoteClick from '@joplin/lib/components/shared/ShareNoteDialog/onUnshareNoteClick';
import useShareStatusMessage from '@joplin/lib/components/shared/ShareNoteDialog/useShareStatusMessage';
import useEncryptionWarningMessage from '@joplin/lib/components/shared/ShareNoteDialog/useEncryptionWarningMessage';
import { SharingStatus } from '@joplin/lib/components/shared/ShareNoteDialog/types';
const { clipboard } = require('electron');

interface Props {
	themeId: number;
	noteIds: string[];
	// eslint-disable-next-line @typescript-eslint/ban-types -- Old code before rule was applied
	onClose: Function;
	shares: StateShare[];
	syncTargetId: number;
}

function styles_(props: Props) {
	return buildStyle('ShareNoteDialog', props.themeId, theme => {
		return {
			root: {
				minWidth: 500,
			},
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
	const [notes, setNotes] = useState<NoteEntity[]>([]);
	const [recursiveShare, setRecursiveShare] = useState<boolean>(false);
	const [sharesState, setSharesState] = useState<SharingStatus>(SharingStatus.Unknown);

	const syncTargetInfo = useMemo(() => SyncTargetRegistry.infoById(props.syncTargetId), [props.syncTargetId]);
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

	const onCopyLinks = useCallback((links: string[]) => {
		clipboard.writeText(links.join('\n'));
	}, []);

	const shareLinkButton_click = useOnShareLinkClick({
		setSharesState,
		onShareUrlsReady: onCopyLinks,
		notes,
		recursiveShare,
	});

	const renderNote = (note: NoteEntity) => {
		const unshareButton = !props.shares.find(s => s.note_id === note.id) ? null : (
			<Button tooltip={_('Unpublish note')} iconName="fas fa-share-alt" onClick={() => onUnshareNoteClick({ noteId: note.id })}/>
		);

		return (
			<div key={note.id} style={styles.note}>
				<span style={styles.noteTitle}>{note.title}</span>{unshareButton}
			</div>
		);
	};

	const renderNoteList = (notes: NoteEntity[]) => {
		const noteComps = [];
		for (const note of notes) {
			noteComps.push(renderNote(note));
		}
		return <div style={styles.noteList}>{noteComps}</div>;
	};

	const statusMessage = useShareStatusMessage({ sharesState, noteCount });
	const encryptionWarning = useEncryptionWarningMessage();

	function renderEncryptionWarningMessage() {
		if (!encryptionWarning) return null;
		return <div style={theme.textStyle}>{encryptionWarning}<hr/></div>;
	}

	const onRecursiveShareChange = useCallback(() => {
		setRecursiveShare(v => !v);
	}, []);

	const renderRecursiveShareCheckbox = () => {
		if (!syncTargetInfo.supportsRecursiveLinkedNotes) return null;

		return (
			<div className="form-input-group form-input-group-checkbox">
				<input id="recursiveShare" name="recursiveShare" type="checkbox" checked={!!recursiveShare} onChange={onRecursiveShareChange} /> <label htmlFor="recursiveShare">{_('Also publish linked notes')}</label>
			</div>
		);
	};

	const renderContent = () => {
		return (
			<div style={styles.root} className="form">
				<DialogTitle title={_('Publish Notes')}/>
				{renderNoteList(notes)}
				{renderRecursiveShareCheckbox()}
				<button disabled={[SharingStatus.Creating, SharingStatus.Synchronizing].indexOf(sharesState) >= 0} style={styles.copyShareLinkButton} onClick={shareLinkButton_click}>{_n('Copy Shareable Link', 'Copy Shareable Links', noteCount)}</button>
				<div style={theme.textStyle}>{statusMessage}</div>
				{renderEncryptionWarningMessage()}
				<DialogButtonRow
					themeId={props.themeId}
					onClick={buttonRow_click}
					okButtonShow={false}
					cancelButtonLabel={_('Close')}
				/>
			</div>
		);
	};

	return (
		<Dialog>{renderContent()}</Dialog>
	);
}

const mapStateToProps = (state: AppState) => {
	return {
		shares: state.shareService.shares.filter(s => !!s.note_id),
		syncTargetId: state.settings['sync.target'],
	};
};

export default connect(mapStateToProps)(ShareNoteDialog);
