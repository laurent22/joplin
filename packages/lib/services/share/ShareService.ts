import { Store } from 'redux';
import { ModelType } from '../../BaseModel';
import JoplinServerApi from '../../JoplinServerApi';
import { _ } from '../../locale';
import Logger from '@joplin/utils/Logger';
import Folder from '../../models/Folder';
import MasterKey from '../../models/MasterKey';
import Note from '../../models/Note';
import Setting from '../../models/Setting';
import { FolderEntity, NoteEntity } from '../database/types';
import EncryptionService from '../e2ee/EncryptionService';
import { PublicPrivateKeyPair, mkReencryptFromPasswordToPublicKey, mkReencryptFromPublicKeyToPassword, ppkPublicKeyFingerprint, supportsPpkAlgorithm } from '../e2ee/ppk/ppk';
import { MasterKeyEntity } from '../e2ee/types';
import { getMasterPassword } from '../e2ee/utils';
import ResourceService from '../ResourceService';
import { addMasterKey, getEncryptionEnabled, localSyncInfo } from '../synchronizer/syncInfoUtils';
import { ShareInvitation, SharePermissions, ShareType, State, stateRootKey, StateShare } from './reducer';
import PerformanceLogger from '../../PerformanceLogger';
import KvStore from '../KvStore';

const logger = Logger.create('ShareService');
const perfLogger = PerformanceLogger.create();

export interface ApiShare {
	id: string;
	master_key_id: string;
	folder_id?: string;
	note_id?: string;
	type?: number;
}

export interface ApiTeamUsers {
	items: { email: string }[];
	has_more: boolean;
}

interface AddShareRecipientOptions {
	shareId: string;
	masterKeyId: string;
	recipientEmail: string;
	permissions: SharePermissions;
	// undefined => fetch from server
	publicKey: PublicPrivateKeyPair|''|undefined;
}

export type UserPublicKeyResponse = PublicPrivateKeyPair|'';

// Local only (not synced). Keys are identified by fingerprint.
interface RecipientKeyHistory {
	// Fingerprint of the key used for the last share invitation to this recipient
	lastShared: string;
	// Fingerprint of the key the user last checked with the recipient. Kept after a key change.
	confirmed: string;
}

// .toLowerCase: Match Joplin Server's email case insensitivity for shares
const recipientKeyHistoryKey = (email: string) => `ShareService::recipientKeyHistory::${email.toLowerCase()}`;
const hasKeyHistory = (history: RecipientKeyHistory) => !!history.lastShared || !!history.confirmed;

export enum PublicKeyStatus {
	// No key, or no earlier key to compare against
	Unknown,
	// Same key as the last share invitation sent to this recipient
	Seen,
	// The user checked this key's fingerprint with the recipient
	Confirmed,
	// Matches neither the last shared nor the confirmed key
	Changed,
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
function formatShareInvitations(invitations: (Omit<ShareInvitation, 'master_key'> & { master_key: string | MasterKeyEntity | null })[]): ShareInvitation[] {
	return invitations.map(inv => {
		return {
			...inv,
			master_key: inv.master_key && typeof inv.master_key === 'string' ? JSON.parse(inv.master_key) : inv.master_key,
		};
	});
}

// Intentionally tolerant regex to allow ID format changes in the future.
const isShareIdValid = (id: string) => typeof id === 'string' && !!id.match(/^[a-z0-9_-]{1,72}$/i);
const isMasterKeyIdValid = (id: string) => id === '' || isShareIdValid(id);

export default class ShareService {

	private static instance_: ShareService;
	private api_: JoplinServerApi = null;
	private store_: Store<unknown> = null;
	private encryptionService_: EncryptionService = null;
	private initialized_ = false;

	public static instance(): ShareService {
		if (this.instance_) return this.instance_;
		this.instance_ = new ShareService();
		return this.instance_;
	}

	public initialize(store: Store<unknown>, encryptionService: EncryptionService, api: JoplinServerApi = null) {
		this.initialized_ = true;
		this.store_ = store;
		this.encryptionService_ = encryptionService;
		this.api_ = api;
	}

	public get enabled(): boolean {
		if (!this.initialized_) return false;
		return [9, 10, 11].includes(Setting.value('sync.target')); // Joplin Server, Joplin Cloud targets
	}

	private get store(): Store<unknown> {
		return this.store_;
	}

	public get state(): State {
		return (this.store.getState() as Record<string, unknown>)[stateRootKey] as State;
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
			apiKey: () => Setting.value(`sync.${syncTargetId}.apiKey`),
			session: () => {
				if (syncTargetId === 11) {
					return {
						id: Setting.value('sync.11.id'),
						user_id: Setting.value('sync.11.userId'),
					};
				} else {
					return null;
				}
			},
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

			// This can happen if using an outdated Joplin client, where the PPK
			// was generated on a different device with a newer PPK implementation.
			if (!supportsPpkAlgorithm(syncInfo.ppk)) {
				throw new Error('The local public private key pair uses an unsupported algorithm. It may be necessary to upgrade Joplin or share from a different device.');
			}

			if (folder.master_key_id) {
				logger.info(`Folder ${folderId}'s already has a master key. Not creating a new one.`);
			} else {
				// TODO: handle "undefinedMasterPassword" error - show master password dialog
				folderMasterKey = await this.encryptionService_.generateMasterKey(getMasterPassword());
				folderMasterKey = await MasterKey.save(folderMasterKey);

				addMasterKey(syncInfo, folderMasterKey);
			}
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

		const masterKeyId = folderMasterKey?.id ?? folder.master_key_id ?? '';
		const share = await this.api().exec('POST', 'api/shares', {}, {
			folder_id: folderId,
			master_key_id: masterKeyId,
		});

		if ((share.master_key_id ?? '') !== masterKeyId) {
			throw new Error(
				`Failed to share folder: Error: Updated master key ${JSON.stringify(masterKeyId)} was not successfully applied. Please try unsharing and re-sharing the folder.`,
			);
		}
		await this.shareMasterKeyIdCache_.update({ ...share, master_key_id: masterKeyId });

		// Note: race condition if the share is created but the app crashes
		// before setting share_id on the folder. See unshareFolder() for info.
		await Folder.save({ id: folder.id, share_id: share.id });
		await Folder.updateAllShareIds(ResourceService.instance(), this.shares);

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

		// Clear the master_key_id so that the folder uses a new master key if
		// shared again.
		// TODO: Remove the now-unused master key from local sync info.
		await Folder.save({ id: folderId, master_key_id: '' });

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
		await Folder.updateAllShareIds(ResourceService.instance(), this.shares);
	}

	// This is when a share recipient decides to leave the shared folder.
	//
	// In that case we delete the root folder. Deleting the folder tells the
	// server that we want to leave the share.
	//
	// We also immediately delete the children, but we do not sync the changes
	// otherwise it would delete the items for other users too.
	//
	// If we do not delete them now it would also cause all kind of issues with
	// read-only shares, because the read-only status will be lost after the
	// deletion of the root folder, which means various services may modify the
	// data. The changes will then be rejected by the sync target and cause
	// conflicts.
	//
	// We do not need to sync the children deletion, because the server will
	// take care of deleting all associated user_items. So eventually all the
	// notebook content will also be deleted for the current user.
	//
	// If `folderShareUserId` is provided, the function will check that the user
	// does not own the share. It would be an error to leave such a folder
	// (instead "unshareFolder" should be called).
	public async leaveSharedFolder(folderId: string, folderShareUserId: string = null): Promise<void> {
		if (folderShareUserId !== null) {
			const userId = Setting.value('sync.userId');
			if (folderShareUserId === userId) throw new Error('Cannot leave own notebook');
		}

		const folder = await Folder.load(folderId);

		// We call this to make sure all items are correctly linked before we
		// call deleteAllByShareId()
		await Folder.updateAllShareIds(ResourceService.instance(), this.shares);

		const source = 'ShareService.leaveSharedFolder';
		await Folder.delete(folderId, { deleteChildren: false, disableReadOnlyCheck: true, sourceDescription: source });
		await Folder.deleteAllByShareId(folder.share_id, { disableReadOnlyCheck: true, trackDeleted: false, sourceDescription: source });
	}

	// Finds any folder that is associated with a share, but the user no longer
	// has access to the share, and remove these folders. This check is
	// necessary otherwise sync will try to update items that are not longer
	// accessible and will throw the error "Could not find share with ID: xxxx")
	public async checkShareConsistency() {
		// Sharing is only supported on Joplin Server/Cloud. If the user is
		// using a different sync target, there is no share API to query and
		// any share_id values on folders are stale leftovers from a previous
		// sync target configuration.
		if (!this.enabled) return;

		const rootSharedFolders = await Folder.rootSharedFolders(this.shares);
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

		// Re-saving bumps the updated_time, which can prompt the user to confirm plaintext
		// upload of an otherwise unchanged note. Avoid re-saving if already shared:
		if (!note.is_shared) {
			await Note.save({
				id: note.id,
				parent_id: note.parent_id,
				is_shared: 1,
				updated_time: Date.now(),
			}, {
				autoTimestamp: false,
			});
		}

		return share;
	}

	public async publishFolder(folderId: string): Promise<StateShare> {
		const folder = await Folder.load(folderId);
		if (!folder) throw new Error(`No such folder: ${folderId}`);

		const share = await this.api().exec('POST', 'api/shares', {}, {
			folder_id: folderId,
			type: ShareType.PublishedFolder,
		});

		// Update updated_time to ensure that the folder gets is_shared=1, even if
		// another client recently set is_shared=0.
		await Folder.save({
			id: folderId,
			is_shared: 1,
			updated_time: Date.now(),
		}, {
			autoTimestamp: false,
		});
		await this.refreshShares();

		return share;
	}

	public async unpublishFolder(folderId: string): Promise<void> {
		const folder = await Folder.load(folderId);
		if (!folder) throw new Error(`No such folder: ${folderId}`);

		const share = this.shares.find(s => s.type === ShareType.PublishedFolder && s.folder_id === folderId);
		if (!share) throw new Error(`No published share for folder: ${folderId}`);

		const remainingShares = this.shares.filter(s => s.id !== share.id);
		const folderIds = [folderId, ...(await Folder.allChildrenFolders(folderId)).map(f => f.id)];
		const folders = await Folder.loadItemsByIds(folderIds) as FolderEntity[];
		const noteIds = (await Promise.all(folderIds.map(id => Folder.noteIds(id, { includeConflicts: true, includeDeleted: true })))).flat();
		const notes = await Note.loadItemsByIds(noteIds) as NoteEntity[];
		const directlyPublishedNoteIds = new Set(remainingShares
			.filter(s => s.type === ShareType.Note && !!s.note_id)
			.map(s => s.note_id));
		const directlyPublishedFolderIds = new Set(remainingShares
			.filter(s => s.type === ShareType.PublishedFolder && !!s.folder_id)
			.map(s => s.folder_id),
		);

		for (const folderItem of folders) {
			if (!folderItem.is_shared) continue;
			await Folder.updateShareStatus({ ...folderItem, type_: ModelType.Folder }, directlyPublishedFolderIds.has(folderItem.id));
		}

		for (const note of notes) {
			if (!note.is_shared) continue;
			await Note.updateShareStatus({ ...note, type_: ModelType.Note }, directlyPublishedNoteIds.has(note.id));
		}

		await Folder.updateAllShareIds(ResourceService.instance(), remainingShares);

		// Clean local state first so next sync can recover if deletion stops midway
		await this.deleteShare(share.id);
		await this.refreshShares();
	}

	public async unshareNote(noteId: string) {
		const note = await Note.load(noteId);
		if (!note) throw new Error(`No such note: ${noteId}`);

		const noteShares = (await this.loadSharesByItem(noteId))
			.filter(s => s.type === ShareType.Note);

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
		return this.shares.find(s => s.type === ShareType.Folder && s.folder_id === folderId);
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

	public async userPublicKey(userEmail: string): Promise<UserPublicKeyResponse> {
		// The server's empty "no public key" response is parsed as null, but elsewhere, '' usually means
		// "no public key pair".
		return await this.api().exec('GET', `api/users/${encodeURIComponent(userEmail)}/public_key`) ?? '';
	}

	private async loadRecipientKeyHistory_(email: string): Promise<RecipientKeyHistory> {
		const value = await KvStore.instance().value(recipientKeyHistoryKey(email));
		return typeof value === 'string' ? JSON.parse(value) : { lastShared: '', confirmed: '' };
	}

	private async saveRecipientKeyHistory_(email: string, history: RecipientKeyHistory) {
		await KvStore.instance().setValue(recipientKeyHistoryKey(email), JSON.stringify(history));
	}

	// Whether a key for this recipient has been seen or confirmed before, and so could have changed.
	public async hasPreviousPublicKey(email: string) {
		return hasKeyHistory(await this.loadRecipientKeyHistory_(email));
	}

	// Public for testing
	public async markPublicKeyAsSeen_(email: string, ppk: PublicPrivateKeyPair) {
		const history = await this.loadRecipientKeyHistory_(email);
		await this.saveRecipientKeyHistory_(email, { ...history, lastShared: await ppkPublicKeyFingerprint(ppk) });
	}

	public async markPublicKeyAsConfirmed(email: string, ppk: PublicPrivateKeyPair) {
		const history = await this.loadRecipientKeyHistory_(email);
		await this.saveRecipientKeyHistory_(email, { ...history, confirmed: await ppkPublicKeyFingerprint(ppk) });
	}

	public async publicKeyStatus(email: string, ppk: UserPublicKeyResponse) {
		if (!ppk) return PublicKeyStatus.Unknown;

		const history = await this.loadRecipientKeyHistory_(email);
		const fingerprint = await ppkPublicKeyFingerprint(ppk);
		if (history.confirmed === fingerprint) return PublicKeyStatus.Confirmed;
		if (history.lastShared === fingerprint) return PublicKeyStatus.Seen;
		if (hasKeyHistory(history)) return PublicKeyStatus.Changed;
		return PublicKeyStatus.Unknown;
	}

	public async addShareRecipient({ shareId, masterKeyId, recipientEmail, permissions, publicKey }: AddShareRecipientOptions) {
		let recipientMasterKey: MasterKeyEntity = null;

		if (getEncryptionEnabled()) {
			if (!recipientEmail) throw new Error(_('Please provide the recipient email'));
			const syncInfo = localSyncInfo();
			const masterKey = syncInfo.masterKeys.find(m => m.id === masterKeyId);
			if (!masterKey) throw new Error(`Cannot find master key with ID "${masterKeyId}"`);

			const share = await this.shareById(shareId);
			if (!share.folder_id) throw new Error(`Corrupt share: No folder_id is present for share ${JSON.stringify(shareId)}`);
			const shareFolder = await Folder.load(share.folder_id);
			if (!shareFolder) throw new Error(_('Notebook not found with ID "%s". Please check that the notebook still exists locally.', share.folder_id));
			if (shareFolder.share_id !== shareId) throw new Error(`Corrupt share: Share's folder has the wrong share ID. ${JSON.stringify({ was: shareFolder.share_id, expected: shareId })}`);
			if (shareFolder.master_key_id !== masterKey.id) throw new Error(`Corrupt share: Share's folder had an incorrect master key ID: ${JSON.stringify({ was: shareFolder.master_key_id, expected: masterKey.id })}`);

			const recipientPublicKey = publicKey === undefined ? await this.userPublicKey(recipientEmail) : publicKey;
			if (!recipientPublicKey) throw new Error(_('Cannot share encrypted notebook with recipient %s because they have not enabled end-to-end encryption. They may do so from the screen Configuration > Encryption.', recipientEmail));

			logger.info('Reencrypting master key with recipient public key', recipientPublicKey);

			recipientMasterKey = await mkReencryptFromPasswordToPublicKey(
				this.encryptionService_,
				masterKey,
				getMasterPassword(),
				recipientPublicKey,
			);

			// Mark the public key as seen *before* the POST, since the public-key-encrypted share key may still have been sent
			// to the server even if the POST fails.
			await this.markPublicKeyAsSeen_(recipientEmail, recipientPublicKey);
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

	public async isPublished(item: NoteEntity|FolderEntity, shares: StateShare[]) {
		// Try to determine whether the item is published without doing a network request:
		const isPublishedItemShare = (s: StateShare) => s.type === ShareType.Note || s.type === ShareType.PublishedFolder;
		if (shares.some(s => (
			isPublishedItemShare(s) &&
			(s.folder_id === item.id || s.note_id === item.id)
		))) {
			return true;
		}

		// In some cases, an item can have is_shared = 1, but no share in `shares`. In this case,
		// either the item has been unpublished remotely and not yet synced, or the item was published
		// by another user. Send a network request to determine whether the item is actually published:
		if (item.is_shared) {
			const shares = (await this.loadSharesByItem(item.id))
				.filter(isPublishedItemShare);
			return shares.length > 0;
		}

		return false;
	}

	private async loadSharesByItem(itemId: string) {
		const shares = await this.api().exec('GET', 'api/shares', { item: itemId });
		if (!Array.isArray(shares?.items)) throw new Error(`Invalid response: Shares list is not an array. Was ${typeof shares?.items}.`);

		const items: StateShare[] = shares.items.filter(
			// For compatibility with older server versions that don't support search
			(i: StateShare) => (
				(i.type === ShareType.Note && i.note_id === itemId)
				|| (i.type === ShareType.PublishedFolder && i.folder_id === itemId)
				|| (i.type === ShareType.Folder && i.folder_id === itemId)
			),
		);
		return items;
	}

	private shareMasterKeyIdCache_ = (() => {
		const shareToKey = (share: StateShare) => {
			if (!isShareIdValid(share.id)) {
				throw new Error(`Invalid share ID: ${JSON.stringify(share.id)}`);
			}

			return `ShareService::share_master_key_cache::${share.id}`;
		};

		return {
			get: async (share: StateShare) => {
				const value = await KvStore.instance().value(shareToKey(share));
				if (!value) return null;

				const masterKeyId: string = JSON.parse(value as string).masterKeyId;
				return masterKeyId;
			},
			update: (share: StateShare) => {
				const masterKeyId = share.master_key_id ?? '';
				if (!isMasterKeyIdValid(masterKeyId)) {
					throw new Error(`Invalid master key ID: ${JSON.stringify(masterKeyId)}`);
				}

				logger.info('Associating master key', masterKeyId, 'with share', share.id);

				// Save as JSON to allow storing empty master key IDs: KvStore treats empty strings and null as equivalent
				const data = JSON.stringify({ masterKeyId });
				return KvStore.instance().setValue(shareToKey(share), data);
			},
		};
	})();

	private async loadShares() {
		const rawShares: StateShare[] = (await this.api().exec('GET', 'api/shares')).items;
		const shares: StateShare[] = [];

		for (const share of rawShares) {
			if (!isShareIdValid(share.id)) {
				throw new Error(`Share has invalid ID: ${JSON.stringify(share.id)}`);
			}
			const shareMasterKeyId = share.master_key_id ?? '';
			if (!isMasterKeyIdValid(shareMasterKeyId)) {
				throw new Error(`Share has invalid master key ID: ${JSON.stringify(share.master_key_id)}`);
			}

			const lastMasterKeyId = await this.shareMasterKeyIdCache_.get(share);
			// A share with a master_key_id can have a cached key id of '' if the sharer disabled E2EE before sending the invitation,
			// but had E2EE enabled when the share was first created:
			const hadCachedMasterKeyId = lastMasterKeyId !== null && lastMasterKeyId !== '';
			if (hadCachedMasterKeyId && shareMasterKeyId !== lastMasterKeyId) {
				throw new Error(`Share has invalid master key ID (expected ${JSON.stringify(lastMasterKeyId)}, but was ${JSON.stringify(share.master_key_id)})`);
			}
			if (!hadCachedMasterKeyId) {
				await this.shareMasterKeyIdCache_.update(share);
			}

			shares.push(share);
		}

		return { items: shares };
	}

	private async loadShareUsers(shareId: string) {
		return this.api().exec('GET', `api/shares/${shareId}/users`);
	}

	// Team member email autocomplete when sharing a notebook (Joplin Cloud / Teams).
	public async loadTeamUsers(teamId: string, userEmailSearch: string): Promise<ApiTeamUsers> {
		return this.api().exec('GET', `api/teams/${encodeURIComponent(teamId)}/users`, {
			user_email_search: userEmailSearch,
		});
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


	public async respondInvitation(shareUserId: string, share: StateShare, masterKey: MasterKeyEntity, accept: boolean) {
		logger.info('respondInvitation: ', shareUserId, accept);

		if (accept) {
			const cachedMasterKeyId = await this.shareMasterKeyIdCache_.get(share);

			if (masterKey) {
				// Defend against an attacker attempting to replace the key for an existing share via a new invitation.
				// This check is safe because changing a share's master key ID requires unsharing and re-sharing,
				// which generates a new share ID.
				if (cachedMasterKeyId && cachedMasterKeyId !== masterKey.id) {
					throw new Error('Refusing to accept invitation: This share was previously accepted with a different master key.');
				}

				// Shares from the API don't have a master_key_id until *after* the user accepts the share.
				// Add the master_key_id here so that the share is cached properly.
				share = { ...share, master_key_id: masterKey.id };

				const getReEncryptedKey = async (ppkCandidates: PublicPrivateKeyPair[]) => {
					let lastError: Error = null;
					for (const ppk of ppkCandidates) {
						lastError = null;
						try {
							return await mkReencryptFromPublicKeyToPassword(
								this.encryptionService_,
								masterKey,
								ppk,
								getMasterPassword(),
								getMasterPassword(),
							);
						} catch (error) {
							logger.warn('Failed to decrypt master key. Has the public key been migrated since the item was shared? Error:', error);
							lastError = error;
						}
					}

					throw lastError;
				};

				// The invitation's masterKey may be encrypted with either the current PPK or a PPK from
				// before a recent migration. Check the old PPK to prevent the sharer from having to
				// create a new invitation just after the recipient runs a migration.
				const ppkCandidates = [localSyncInfo().ppk];

				const cachedPpk = Setting.value('encryption.cachedPpk');
				if ('ppk' in cachedPpk) {
					ppkCandidates.push(cachedPpk.ppk);
				}

				const reencryptedMasterKey = await getReEncryptedKey(ppkCandidates);
				logger.info('respondInvitation: Key has been reencrypted using master password', reencryptedMasterKey);

				const existingKey = await MasterKey.load(masterKey.id);
				if (existingKey) {
					logger.info('respondInvitation: Local master key already exists for the share. Checking for match... Key ID:', masterKey.id);

					const newPlaintext = await this.encryptionService_.decryptMasterKeyContent(reencryptedMasterKey, getMasterPassword());
					const oldPlaintext = await this.encryptionService_.decryptMasterKeyContent(existingKey, getMasterPassword());
					if (oldPlaintext !== newPlaintext) {
						throw new Error(`Cannot accept share. A master key with ${JSON.stringify(masterKey.id)} already exists and is different.`);
					}
				}

				await MasterKey.save(reencryptedMasterKey);
			} else if (cachedMasterKeyId) {
				throw new Error('Refusing to accept invitation for unencrypted share: A previous invitation for the same share was previously accepted, and was encrypted.');
			}

			await this.shareMasterKeyIdCache_.update(share);
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
		await Folder.updateNoLongerPublishedFolders(this.shares);
		await Note.updateNoLongerPublishedNotes(this.shares);
	}

	public async maintenance() {
		const task = perfLogger.taskStart('ShareService/maintenance');
		if (this.enabled) {
			let hasError = false;

			try {
				await this.refreshShareInvitations();
			} catch (error) {
				hasError = true;
				logger.error('Maintenance: Failed to update share invitations:', error);
			}

			try {
				await this.refreshShares();
			} catch (error) {
				hasError = true;
				logger.error('Maintenance: Failed to refresh shares:', error);
			}

			Setting.setValue('sync.userId', this.api().userId);

			// If there was no errors, it means we have all the share objects,
			// so we can run the clean up function.
			if (!hasError) await this.updateNoLongerSharedItems();
		}
		task.onEnd();
	}

}
