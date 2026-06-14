import * as React from 'react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { _, _n } from '@joplin/lib/locale';
import Folder from '@joplin/lib/models/Folder';
import DialogButtonRow, { ClickEvent } from './DialogButtonRow';
import Dialog from '@joplin/lib/components/Dialog';
import DialogTitle from './DialogTitle';
import { FolderEntity } from '@joplin/lib/services/database/types';
import ShareService from '@joplin/lib/services/share/ShareService';
import { ShareType, StateShare } from '@joplin/lib/services/share/reducer';
import { connect } from 'react-redux';
import { AppState } from '../app.reducer';
import useEncryptionWarningMessage from '@joplin/lib/components/shared/ShareNoteDialog/useEncryptionWarningMessage';
import { clipboard } from 'electron';
import useOnPublishFolderLinkClick from '@joplin/lib/components/shared/PublishFolderDialog/useOnPublishFolderLinkClick';
import useShareStatusMessage from '@joplin/lib/components/shared/ShareNoteDialog/useShareStatusMessage';
import { SharingStatus } from '@joplin/lib/components/shared/ShareNoteDialog/types';

interface Props {
	themeId: number;
	folderId: string;
	onClose: ()=> void;
	shares: StateShare[];
	folders: FolderEntity[];
}

export function PublishFolderDialog(props: Props) {
	const [folder, setFolder] = useState<FolderEntity>(null);
	const [noteCount, setNoteCount] = useState<number>(0);
	const [publishFolderStatus, setPublishFolderStatus] = useState<SharingStatus>(SharingStatus.Unknown);

	const encryptionWarning = useEncryptionWarningMessage();
	const publishedShare = useMemo(() => {
		return props.shares.find(share => share.type === ShareType.PublishedFolder && share.folder_id === props.folderId) || null;
	}, [props.folderId, props.shares]);

	const loadData = useCallback(async () => {
		const loadedFolder = await Folder.load(props.folderId);
		const childFolderIds = await Folder.childrenIds(props.folderId);
		const allFolderIds = [props.folderId, ...childFolderIds];

		let loadedNoteCount = 0;
		for (const folderId of allFolderIds) {
			loadedNoteCount += (await Folder.noteIds(folderId)).length;
		}

		setFolder(loadedFolder);
		setNoteCount(loadedNoteCount);
	}, [props.folderId]);

	useEffect(() => {
		void ShareService.instance().refreshShares();
		void loadData();
	}, [loadData]);

	const onShareUrlReady = useCallback((url: string) => {
		clipboard.writeText(url);
	}, []);

	const publishFolderLinkButton_click = useOnPublishFolderLinkClick({
		folderId: props.folderId,
		publishedShare,
		setPublishFolderStatus,
		onShareUrlReady,
	});

	const onDialogButtonClick = useCallback((_event: ClickEvent) => {
		props.onClose();
	}, [props]);

	const statusMessage = useShareStatusMessage({ sharesState: publishFolderStatus, noteCount: 1 });

	return (
		<Dialog>
			<div className="form share-note-dialog">
				<DialogTitle title={_('Publish Notebook')}/>
				<div className="folder-info">
					<p>{_('Notebook: %s', folder ? folder.title : '...')}</p>
					<p>{_('Status: %s', publishedShare ? _('Published') : _('Not published'))}</p>
					<p>{_n('%d note in notebook', '%d notes in notebook', noteCount, noteCount)}</p>
				</div>
				<button
					disabled={!folder || [SharingStatus.Creating, SharingStatus.Synchronizing].indexOf(publishFolderStatus) >= 0}
					className="share"
					onClick={publishFolderLinkButton_click}
				>{publishedShare ? _('Copy Shareable Link') : _('Publish notebook')}</button>
				<div className="message">{statusMessage}</div>
				{encryptionWarning && <div className="message">{encryptionWarning}<hr/></div>}
				<DialogButtonRow
					themeId={props.themeId}
					onClick={onDialogButtonClick}
					okButtonShow={false}
					cancelButtonLabel={_('Close')}
				/>
			</div>
		</Dialog>
	);
}

const mapStateToProps = (state: AppState) => {
	return {
		shares: state.shareService.shares,
		folders: state.folders,
	};
};

export default connect(mapStateToProps)(PublishFolderDialog);
