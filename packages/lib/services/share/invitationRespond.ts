import ShareService from './ShareService';
import Logger from '@joplin/utils/Logger';
import Folder from '../../models/Folder';
import { reg } from '../../registry';
import { _ } from '../../locale';
import { MasterKeyEntity } from '../e2ee/types';

const logger = Logger.create('invitationRespond');

export default async function(shareUserId: string, folderId: string, masterKey: MasterKeyEntity, accept: boolean) {
	// The below functions can take a bit of time to complete so in the
	// meantime we hide the notification so that the user doesn't click
	// multiple times on the Accept link.
	ShareService.instance().setProcessingShareInvitationResponse(true);

	try {
		await ShareService.instance().respondInvitation(shareUserId, masterKey, accept);
	} catch (error) {
		logger.error(error);
		alert(_('Could not respond to the invitation. Please try again, or check with the notebook owner if they are still sharing it.\n\nThe error was: "%s"', error.message));
	}

	// This is to handle an edge case that can happen if:
	//
	// - The user is a recipient of a share.
	// - The sender removes the recipient from the share, then add him again.
	// - The recipient gets the invitation, but reply "Reject" to it.
	//
	// If we don't handle this case, it would kind of work but would create
	// conflicts because the shared notes would be converted to local ones, then
	// during sync the synchronizer would try to delete them. Since they've been
	// changed, they'll all be marked as conflicts.
	//
	// So the simplest thing to do is to leave the folder, which is most likely
	// what the user wants. And if not, it's always possible to ask the sender
	// to share again.
	//
	// NOTE: DOESN'T WORK. Because Folder.updateAllShareIds() would still run
	// and change the notes share_id property, thus creating conflicts again.
	// Leaving it as it is for now, as it's an unlikely scenario and it won't
	// cause any data loss.

	if (!accept) {
		const existingFolder = await Folder.load(folderId);
		if (existingFolder) {
			logger.warn('Rejected an invitation, but the folder was already there. Conflicts are likely to happen. ShareUserId:', shareUserId, 'Folder ID:', folderId);
			// await ShareService.instance().leaveSharedFolder(folderId);
		}
	}

	try {
		await ShareService.instance().refreshShareInvitations();
	} finally {
		ShareService.instance().setProcessingShareInvitationResponse(false);
	}

	void reg.scheduleSync(1000);
}
