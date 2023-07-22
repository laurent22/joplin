import { Store } from 'redux';
import JoplinServerApi from '../../JoplinServerApi';
import { _ } from '../../locale';
import Logger from '../../Logger';
import Folder from '../../models/Folder';
import MasterKey from '../../models/MasterKey';
import Note from '../../models/Note';
import Setting from '../../models/Setting';
import { FolderEntity } from '../database/types';
import EncryptionService from '../e2ee/EncryptionService';
import { PublicPrivateKeyPair, mkReencryptFromPasswordToPublicKey, mkReencryptFromPublicKeyToPassword } from '../e2ee/ppk';
import { MasterKeyEntity } from '../e2ee/types';
import { getMasterPassword } from '../e2ee/utils';
import ResourceService from '../ResourceService';
import { addMasterKey, getEncryptionEnabled, localSyncInfo } from '../synchronizer/syncInfoUtils';
import { ShareInvitation, SharePermissions, State, stateRootKey, StateShare } from './reducer';

const logger = Logger.create('ShareService');

export interface ApiShare {
	id: string;
	master_key_id: string;
}

function formatShareInvitations(invitations: any[]): ShareInvitation[] {
	return invitations.map(inv => {
		return {
			...inv,
			master_key: inv.master_key ? JSON.parse(inv.master_key) : null,
		};
	});
}

export default class ShareService {

	private static instance_: ShareService;
	private api_: JoplinServerApi = null;
	private store_: Store<any> = null;
	private encryptionService_: EncryptionService = null;
	private initialized_ = false;

	public static instance(): ShareService {
		if (this.instance_) return this.instance_;
		this.instance_ = new ShareService();
		return this.instance_;
	}

	public initialize(store: Store<any>, encryptionService: EncryptionService, api: JoplinServerApi = null) {
		this.initialized_ = true;
		this.store_ = store;
		this.encryptionService_ = encryptionService;
		this.api_ = api;
	}

	public get enabled(): boolean {
		if (!this.initialized_) return false;
		return [9, 10].includes(Setting.value('sync.target')); // Joplin Server, Joplin Cloud targets
	}

	private get store(): Store<any> {
		return this.store_;
	}

	public get state(): State {
		return this.store.getState()[stateRootKey] as State;
	}

	public get userId(): string {
		return this.api() ? this.api().userId : '';
	}

	private api(): JoplinServerApi {
		if (this.api_) return this.api_;

		const syncTargetId = Setting.value('sync.target');

		this.api_ = new JoplinServerApi({
			baseUrl: () => Setting.value(`sync.${syncTargetId}.path`),
			userContentBaseUrl: () => Setting.value(`sync.${syncTargetId}.userContentPath`),
			username: () => Setting.value(`sync.${syncTargetId}.username`),
			password: () => Setting.value(`sync.${syncTargetId}.password`),
		});

		return this.api_;
	}

	public async shareFolder(folderId: string): Promise<ApiShare> {
		const folder = await Folder.load(folderId);
		if (!folder) throw new Error(`No such folder: ${folderId}`);

		let folderMasterKey: MasterKeyEntity = null;

		if (getEncryptionEnabled()) {
			const syncInfo = localSyncInfo();

			// Shouldn't happen
			if (!syncInfo.ppk) throw new Error('Cannot share notebook because E2EE is enabled and no Public Private Key pair exists.');

			// TODO: handle "undefinedMasterPassword" error - show master password dialog
			folderMasterKey = await this.encryptionService_.generateMasterKey(getMasterPassword());
			folderMasterKey = await MasterKey.save(folderMasterKey);

			addMasterKey(syncInfo, folderMasterKey);
		}

		const newFolderProps: FolderEntity = {};

		if (folder.parent_id) newFolderProps.parent_id = '';
		if (folderMasterKey) newFolderProps.master_key_id = folderMasterKey.id;

		if (Object.keys(newFolderProps).length) {
			await Folder.save({
				id: folder.id,
				...newFolderProps,
			});
		}

		const share = await this.api().exec('POST', 'api/shares', {}, {
			folder_id: folderId,
			master_key_id: folderMasterKey ? folderMasterKey.id : '',
		});

		// Note: race condition if the share is created but the app crashes
		// before setting share_id on the folder. See unshareFolder() for info.
		await Folder.save({ id: folder.id, share_id: share.id });
		await Folder.updateAllShareIds(ResourceService.instance());

		return share;
	}

	// This allows the notebook owner to stop sharing it. For a recipient to
	// leave the shared notebook, see the leaveSharedFolder command.
	public async unshareFolder(folderId: string) {
		const folder = await Folder.load(folderId);
		if (!folder) throw new Error(`No such folder: ${folderId}`);

		const share = this.shares.find(s => s.folder_id === folderId);
		if (!share) throw new Error(`No share for folder: ${folderId}`);

		// First, delete the share - which in turns is going to remove the items
		// for all users, except the owner.
		await this.deleteShare(share.id);

		// Then reset the "share_id" field for the folder and all sub-items.
		// This could potentially be done server-side, when deleting the share,
		// but since clients are normally responsible for maintaining the
		// share_id property, we do it here for consistency. It will also avoid
		// conflicts because changes will come only from the clients.
		//
		// Note that there could be a race condition here if the share is
		// deleted, but the app crashes just before setting share_id to "". It's
		// very unlikely to happen so we leave like this for now.
		//
		// We could potentially have a clean up process at some point:
		//
		// - It would download all share objects
		// - Then look for all items where the share_id is not in any of these
		//   shares objects
		// - And set those to ""
		//
		// Likewise, it could apply the share_id to folders based on
		// share.folder_id
		//
		// Setting the share_id is not critical - what matters is that when the
		// share is deleted, other users no longer have access to the item, so
		// can't change or read them.
		await Folder.save({ id: folder.id, share_id: '' });

		// It's ok if updateAllShareIds() doesn't run because it's executed on
		// each sync too.
		await Folder.updateAllShareIds(ResourceService.instance());
	}

	// This is when a share recipient decides to leave the shared folder.
	//
	// In that case, we should only delete the folder but none of its children.
	// Deleting the folder tells the server that we want to leave the share. The
	// server will then proceed to delete all associated user_items. So
	// eventually all the notebook content will also be deleted for the current
	// user.
	//
	// We don't delete the children here because that would delete them for the
	// other share participants too.
	//
	// If `folderShareUserId` is provided, the function will check that the user
	// does not own the share. It would be an error to leave such a folder
	// (instead "unshareFolder" should be called).
	public async leaveSharedFolder(folderId: string, folderShareUserId: string = null): Promise<void> {
		if (folderShareUserId !== null) {
			const userId = Setting.value('sync.userId');
			if (folderShareUserId === userId) throw new Error('Cannot leave own notebook');
		}

		await Folder.delete(folderId, { deleteChildren: false, disableReadOnlyCheck: true });
	}

	// Finds any folder that is associated with a share, but the user no longer
	// has access to the share, and remove these folders. This check is
	// necessary otherwise sync will try to update items that are not longer
	// accessible and will throw the error "Could not find share with ID: xxxx")
	public async checkShareConsistency() {
		const rootSharedFolders = await Folder.rootSharedFolders();
		let hasRefreshedShares = false;
		let shares = this.shares;

		for (const folder of rootSharedFolders) {
			let share = shares.find(s => s.id === folder.share_id);

			if (!share && !hasRefreshedShares) {
				shares = await this.refreshShares();
				share = shares.find(s => s.id === folder.share_id);
				hasRefreshedShares = true;
			}

			if (!share) {
				// This folder is a associated with a share, but the user no
				// longer has access to this share. It can happen for two
				// reasons:
				//
				// - It no longer exists
				// - Or the user rejected that share from a different device,
				//   and the folder was not deleted as it should have been.
				//
				// In that case we need to leave the notebook.
				logger.warn(`Found a folder that was associated with a share, but the user not longer has access to the share - leaving the folder. Folder: ${folder.title} (${folder.id}). Share: ${folder.share_id}`);
				await this.leaveSharedFolder(folder.id);
			}
		}
	}

	public async shareNote(noteId: string, recursive: boolean): Promise<StateShare> {
		const note = await Note.load(noteId);
		if (!note) throw new Error(`No such note: ${noteId}`);

		const share = await this.api().exec('POST', 'api/shares', {}, {
			note_id: noteId,
			recursive: recursive ? 1 : 0,
		});

		await Note.save({
			id: note.id,
			parent_id: note.parent_id,
			is_shared: 1,
			updated_time: Date.now(),
		}, {
			autoTimestamp: false,
		});

		return share;
	}

	public async unshareNote(noteId: string) {
		const note = await Note.load(noteId);
		if (!note) throw new Error(`No such note: ${noteId}`);

		const shares = await this.refreshShares();
		const noteShares = shares.filter(s => s.note_id === noteId);

		const promises: Promise<void>[] = [];

		for (const share of noteShares) {
			promises.push(this.deleteShare(share.id));
		}

		await Promise.all(promises);

		await Note.save({
			id: note.id,
			parent_id: note.parent_id,
			is_shared: 0,
			updated_time: Date.now(),
		}, {
			autoTimestamp: false,
		});
	}

	public shareUrl(userId: string, share: StateShare): string {
		return `${this.api().personalizedUserContentBaseUrl(userId)}/shares/${share.id}`;
	}

	public folderShare(folderId: string): StateShare {
		return this.shares.find(s => s.folder_id === folderId);
	}

	public isSharedFolderOwner(folderId: string, userId: string = null): boolean {
		if (userId === null) userId = this.userId;

		const share = this.folderShare(folderId);
		if (!share) throw new Error(`Cannot find share associated with folder: ${folderId}`);
		return share.user.id === userId;
	}

	public get shares() {
		return this.state.shares;
	}

	public get shareLinkNoteIds(): string[] {
		return this.shares.filter(s => !!s.note_id).map(s => s.note_id);
	}

	public get shareInvitations() {
		return this.state.shareInvitations;
	}

	private async userPublicKey(userEmail: string): Promise<PublicPrivateKeyPair> {
		return this.api().exec('GET', `api/users/${encodeURIComponent(userEmail)}/public_key`);
	}

	public async addShareRecipient(shareId: string, masterKeyId: string, recipientEmail: string, permissions: SharePermissions) {
		let recipientMasterKey: MasterKeyEntity = null;

		if (getEncryptionEnabled()) {
			const syncInfo = localSyncInfo();
			const masterKey = syncInfo.masterKeys.find(m => m.id === masterKeyId);
			if (!masterKey) throw new Error(`Cannot find master key with ID "${masterKeyId}"`);

			const recipientPublicKey: PublicPrivateKeyPair = await this.userPublicKey(recipientEmail);
			if (!recipientPublicKey) throw new Error(_('Cannot share encrypted notebook with recipient %s because they have not enabled end-to-end encryption. They may do so from the screen Configuration > Encryption.', recipientEmail));

			logger.info('Reencrypting master key with recipient public key', recipientPublicKey);

			recipientMasterKey = await mkReencryptFromPasswordToPublicKey(
				this.encryptionService_,
				masterKey,
				getMasterPassword(),
				recipientPublicKey
			);
		}

		return this.api().exec('POST', `api/shares/${shareId}/users`, {}, {
			email: recipientEmail,
			master_key: JSON.stringify(recipientMasterKey),
			...permissions,
		});
	}

	public async deleteShareRecipient(shareUserId: string) {
		await this.api().exec('DELETE', `api/share_users/${shareUserId}`);
	}

	public async deleteShare(shareId: string) {
		await this.api().exec('DELETE', `api/shares/${shareId}`);
	}

	private async loadShares() {
		return this.api().exec('GET', 'api/shares');
	}

	private async loadShareUsers(shareId: string) {
		return this.api().exec('GET', `api/shares/${shareId}/users`);
	}

	private async loadShareInvitations() {
		return this.api().exec('GET', 'api/share_users');
	}

	public setProcessingShareInvitationResponse(v: boolean) {
		this.store.dispatch({
			type: 'SHARE_INVITATION_RESPONSE_PROCESSING',
			value: v,
		});
	}

	public async setPermissions(shareId: string, shareUserId: string, permissions: SharePermissions) {
		logger.info('setPermissions: ', shareUserId, permissions);

		await this.api().exec('PATCH', `api/share_users/${shareUserId}`, null, {
			can_read: 1,
			can_write: permissions.can_write,
		});

		this.store.dispatch({
			type: 'SHARE_USER_UPDATE_ONE',
			shareId: shareId,
			shareUser: {
				id: shareUserId,
				...permissions,
			},
		});
	}


	public async respondInvitation(shareUserId: string, masterKey: MasterKeyEntity, accept: boolean) {
		logger.info('respondInvitation: ', shareUserId, accept);

		if (accept) {
			if (masterKey) {
				const reencryptedMasterKey = await mkReencryptFromPublicKeyToPassword(
					this.encryptionService_,
					masterKey,
					localSyncInfo().ppk,
					getMasterPassword(),
					getMasterPassword()
				);

				logger.info('respondInvitation: Key has been reencrypted using master password', reencryptedMasterKey);

				await MasterKey.save(reencryptedMasterKey);
			}

			await this.api().exec('PATCH', `api/share_users/${shareUserId}`, null, { status: 1 });
		} else {
			await this.api().exec('PATCH', `api/share_users/${shareUserId}`, null, { status: 2 });
		}
	}

	public async refreshShareInvitations() {
		const result = await this.loadShareInvitations();

		const invitations = formatShareInvitations(result.items);
		logger.info('Refresh share invitations:', invitations);

		this.store.dispatch({
			type: 'SHARE_INVITATION_SET',
			shareInvitations: invitations,
		});
	}

	public async shareById(id: string) {
		const stateShare = this.state.shares.find(s => s.id === id);
		if (stateShare) return stateShare;

		const refreshedShares = await this.refreshShares();
		const refreshedShare = refreshedShares.find(s => s.id === id);
		if (!refreshedShare) throw new Error(`Could not find share with ID: ${id}`);
		return refreshedShare;
	}

	// In most cases the share objects will already be part of the state, so
	// this function checks there first. If the required share objects are not
	// present, it refreshes them from the API.
	public async sharesByIds(ids: string[]) {
		const buildOutput = async (shares: StateShare[]) => {
			const output: Record<string, StateShare> = {};
			for (const share of shares) {
				if (ids.includes(share.id)) output[share.id] = share;
			}
			return output;
		};

		let output = await buildOutput(this.state.shares);
		if (Object.keys(output).length === ids.length) return output;

		const refreshedShares = await this.refreshShares();
		output = await buildOutput(refreshedShares);

		if (Object.keys(output).length !== ids.length) {
			logger.error('sharesByIds: Need:', ids);
			logger.error('sharesByIds: Got:', Object.keys(refreshedShares));
			throw new Error('Could not retrieve required share objects');
		}

		return output;
	}

	public async refreshShares(): Promise<StateShare[]> {
		const result = await this.loadShares();

		logger.info('Refreshed shares:', result);

		this.store.dispatch({
			type: 'SHARE_SET',
			shares: result.items,
		});

		return result.items;
	}

	public async refreshShareUsers(shareId: string) {
		const result = await this.loadShareUsers(shareId);

		logger.info('Refreshed share users:', result);

		this.store.dispatch({
			type: 'SHARE_USER_SET',
			shareId: shareId,
			shareUsers: result.items,
		});
	}

	private async updateNoLongerSharedItems() {
		const shareIds = this.shares.map(share => share.id).concat(this.shareInvitations.map(si => si.share.id));
		await Folder.updateNoLongerSharedItems(shareIds);
	}

	public async maintenance() {
		if (this.enabled) {
			let hasError = false;
			try {
				await this.refreshShareInvitations();
				await this.refreshShares();
				Setting.setValue('sync.userId', this.api().userId);
			} catch (error) {
				hasError = true;
				logger.error('Failed to run maintenance:', error);
			}

			// If there was no errors, it means we have all the share objects,
			// so we can run the clean up function.
			if (!hasError) await this.updateNoLongerSharedItems();
		}
	}

}
