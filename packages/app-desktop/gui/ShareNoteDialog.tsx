import * as React from 'react';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { _, _n } from '@joplin/lib/locale';
import Note from '@joplin/lib/models/Note';
import DialogButtonRow from './DialogButtonRow';
import Dialog from '@joplin/lib/components/Dialog';
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
import { clipboard } from 'electron';
import useAsyncEffect from '@joplin/lib/hooks/useAsyncEffect';

interface Props {
	themeId: number;
	noteIds: string[];
	onClose: ()=> void;
	shares: StateShare[];
	syncTargetId: number;
}

export function ShareNoteDialog(props: Props) {
	const [notes, setNotes] = useState<NoteEntity[]>([]);
	const [recursiveShare, setRecursiveShare] = useState<boolean>(false);
	const [sharesState, setSharesState] = useState<SharingStatus>(SharingStatus.Unknown);

	const syncTargetInfo = useMemo(() => SyncTargetRegistry.infoById(props.syncTargetId), [props.syncTargetId]);
	const noteCount = notes.length;

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

	const renderNoteList = (notes: NoteEntity[]) => {
		const noteComps = [];
		for (const note of notes) {
			noteComps.push(<NoteItem key={note.id} note={note} shares={props.shares}/>);
		}
		return <div className="notes">{noteComps}</div>;
	};

	const statusMessage = useShareStatusMessage({ sharesState, noteCount });
	const encryptionWarning = useEncryptionWarningMessage();

	function renderEncryptionWarningMessage() {
		if (!encryptionWarning) return null;
		return <div className="message">{encryptionWarning}<hr/></div>;
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
			<div className="form share-note-dialog">
				<DialogTitle title={_('Publish Notes')}/>
				{renderNoteList(notes)}
				{renderRecursiveShareCheckbox()}
				<button
					disabled={[SharingStatus.Creating, SharingStatus.Synchronizing].indexOf(sharesState) >= 0}
					className="share"
					onClick={shareLinkButton_click}
				>{_n('Copy Shareable Link', 'Copy Shareable Links', noteCount)}</button>
				<div className="message">{statusMessage}</div>
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

interface NoteItemProps {
	note: NoteEntity;
	shares: StateShare[];
}

const NoteItem: React.FC<NoteItemProps> = ({ note, shares }) => {
	const [isShared, setIsShared] = useState(false);

	useAsyncEffect(async (event) => {
		const shared = await ShareService.instance().isPublished(note, shares);

		if (!event.cancelled) {
			setIsShared(shared);
		}
	}, [shares, note]);

	const unshareButton = isShared && (
		<Button tooltip={_('Unpublish note')} iconName="fas fa-share-alt" onClick={() => onUnshareNoteClick({ noteId: note.id })}/>
	);

	return (
		<div key={note.id} className='shared-note-list-item'>
			<span className='title'>{note.title}</span>{unshareButton}
		</div>
	);
};

const mapStateToProps = (state: AppState) => {
	return {
		shares: state.shareService.shares.filter(s => !!s.note_id),
		syncTargetId: state.settings['sync.target'],
	};
};

export default connect(mapStateToProps)(ShareNoteDialog);
