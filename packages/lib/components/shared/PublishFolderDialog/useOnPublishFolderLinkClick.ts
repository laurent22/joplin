import Logger from '@joplin/utils/Logger';
import JoplinServerApi from '../../../JoplinServerApi';
import { reg } from '../../../registry';
import ShareService from '../../../services/share/ShareService';
import { StateShare } from '../../../services/share/reducer';
import shim from '../../../shim';
import { SharingStatus } from '../ShareNoteDialog/types';
import Folder from '../../../models/Folder';
const { useCallback, useEffect, useRef } = shim.react();

const logger = Logger.create('PublishFolderDialog/useOnPublishFolderLinkClick');

interface Props {
	folderId: string;
	publishedShare: StateShare | null;
	setPublishFolderStatus(state: SharingStatus): void;
	onShareUrlReady(url: string): void;
}

const useOnPublishFolderLinkClick = ({
	folderId,
	publishedShare,
	setPublishFolderStatus,
	onShareUrlReady,
}: Props) => {
	const isMountedRef = useRef(true);

	useEffect(() => {
		isMountedRef.current = true;
		return () => {
			isMountedRef.current = false;
		};
	}, []);

	return useCallback(async () => {
		const service = ShareService.instance();

		const loadExistingShare = async () => {
			const folder = await Folder.load(folderId);
			if (!folder) return null;

			// Handle the case where the share was created on the server, but the item wasn't marked as shared locally
			// (e.g. because of a crash just after publishing).
			const existingShare = folder.is_shared ? publishedShare : null;
			return existingShare;
		};

		let hasSynced = false;
		let tryToSync = false;
		while (true) {
			try {
				if (publishedShare && !await loadExistingShare()) {
					// The folder may have been shared on another device
					logger.info('Share found for folder', folderId, 'but folder is not marked as published. Trying to sync.');
					tryToSync = true;
				}

				if (tryToSync) {
					if (!isMountedRef.current) return;
					setPublishFolderStatus(SharingStatus.Synchronizing);
					await reg.waitForSyncFinishedThenSync();
					if (!isMountedRef.current) return;
					tryToSync = false;
					hasSynced = true;
				}

				if (!isMountedRef.current) return;
				setPublishFolderStatus(SharingStatus.Creating);

				const existingShare = await loadExistingShare();
				const share = existingShare || await service.publishFolder(folderId);
				if (!isMountedRef.current) return;

				if (!existingShare) {
					setPublishFolderStatus(SharingStatus.Synchronizing);
					await reg.waitForSyncFinishedThenSync();
					if (!isMountedRef.current) return;
					setPublishFolderStatus(SharingStatus.Creating);
				}

				onShareUrlReady(service.shareUrl(service.userId, share));

				setPublishFolderStatus(SharingStatus.Created);

				await ShareService.instance().refreshShares();
			} catch (error) {
				if (!isMountedRef.current) return;

				if ((error as { code?: number }).code === 404 && !hasSynced) {
					logger.info('PublishFolderDialog: Notebook does not exist on server - trying to sync it.', error);
					tryToSync = true;
					continue;
				}

				console.error(error);
				logger.error('PublishFolderDialog: Cannot publish notebook:', error);

				setPublishFolderStatus(SharingStatus.Idle);
				void shim.showErrorDialog(JoplinServerApi.connectionErrorMessage(error as Error));
			}

			break;
		}
	}, [folderId, onShareUrlReady, publishedShare, setPublishFolderStatus]);
};

export default useOnPublishFolderLinkClick;
