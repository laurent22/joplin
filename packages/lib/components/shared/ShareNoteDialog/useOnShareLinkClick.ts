import Logger from '@joplin/utils/Logger';
import JoplinServerApi from '../../../JoplinServerApi';
import { reg } from '../../../registry';
import { NoteEntity } from '../../../services/database/types';
import ShareService from '../../../services/share/ShareService';
import { StateShare } from '../../../services/share/reducer';
import shim from '../../../shim';
import { SharingStatus } from './types';
const { useCallback } = shim.react();

const logger = Logger.create('useOnShareLinkClick');

interface Props {
	notes: NoteEntity[];
	recursiveShare: boolean;
	setSharesState(state: SharingStatus): void;
	onShareUrlsReady(urls: string[]): void;
}

const getShareLinks = (shares: StateShare[]) => {
	const links = [];
	for (const share of shares) {
		if (!share) {
			throw new Error('Error: Empty share.');
		}

		links.push(ShareService.instance().shareUrl(ShareService.instance().userId, share));
	}

	return links;
};

const useOnShareLinkClick = ({
	setSharesState, onShareUrlsReady, notes, recursiveShare,
}: Props) => {

	return useCallback(async () => {
		const service = ShareService.instance();

		let hasSynced = false;
		let tryToSync = false;
		while (true) {
			try {
				if (tryToSync) {
					setSharesState(SharingStatus.Synchronizing);
					await reg.waitForSyncFinishedThenSync();
					tryToSync = false;
					hasSynced = true;
				}

				setSharesState(SharingStatus.Creating);

				const newShares: StateShare[] = [];

				for (const note of notes) {
					const share = await service.shareNote(note.id, recursiveShare);
					newShares.push(share);
				}

				setSharesState(SharingStatus.Synchronizing);
				await reg.waitForSyncFinishedThenSync();
				setSharesState(SharingStatus.Creating);

				onShareUrlsReady(getShareLinks(newShares));

				setSharesState(SharingStatus.Created);

				await ShareService.instance().refreshShares();
			} catch (error) {
				if (error.code === 404 && !hasSynced) {
					logger.info('ShareNoteDialog: Note does not exist on server - trying to sync it.', error);
					tryToSync = true;
					continue;
				}

				console.error(error);
				logger.error('ShareNoteDialog: Cannot publish note:', error);

				setSharesState(SharingStatus.Idle);
				void shim.showErrorDialog(JoplinServerApi.connectionErrorMessage(error));
			}

			break;
		}
	}, [recursiveShare, notes, onShareUrlsReady, setSharesState]);
};

export default useOnShareLinkClick;
