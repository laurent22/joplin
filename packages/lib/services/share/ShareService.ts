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
import { getPpkPassword, ppkGenerateMasterKey, ppkReencryptMasterKey, PublicPrivateKeyPair } from '../e2ee/ppk';
import { MasterKeyEntity } from '../e2ee/types';
import { addMasterKey, getEncryptionEnabled, localSyncInfo } from '../synchronizer/syncInfoUtils';
import { State, stateRootKey, StateShare } from './reducer';

const logger = Logger.create('ShareService');

export interface ApiShare {
	id: string;
	master_key_id: string;
}

export default class ShareService {

	private static instance_: ShareService;
	private api_: JoplinServerApi = null;
	private store_: Store<any> = null;
	private encryptionService_: EncryptionService = null;

	public static instance(): ShareService {
		if (this.instance_) return this.instance_;
		this.instance_ = new ShareService();
		return this.instance_;
	}

	public initialize(store: Store<any>, encryptionService: EncryptionService, api: JoplinServerApi = null) {
		this.store_ = store;
		this.encryptionService_ = encryptionService;
		this.api_ = api;
	}

	public get enabled(): boolean {
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

			const password = getPpkPassword(syncInfo.ppk);

			folderMasterKey = await ppkGenerateMasterKey(this.encryptionService_, syncInfo.ppk, password);
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
		await Folder.updateAllShareIds();

		return share;
	}

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
		await Folder.updateAllShareIds();
	}

	public async shareNote(noteId: string): Promise<StateShare> {
		const note = await Note.load(noteId);
		if (!note) throw new Error(`No such note: ${noteId}`);

		const share = await this.api().exec('POST', 'api/shares', {}, { note_id: noteId });

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

	public async addShareRecipient(shareId: string, masterKeyId: string, recipientEmail: string) {
		let recipientMasterKey: MasterKeyEntity = null;

		if (getEncryptionEnabled()) {
			const syncInfo = localSyncInfo();
			const masterKey = syncInfo.masterKeys.find(m => m.id === masterKeyId);
			if (!masterKey) throw new Error(`Cannot find master key with ID "${masterKeyId}"`);

			const recipientPublicKey: PublicPrivateKeyPair = await this.userPublicKey(recipientEmail);
			if (!recipientPublicKey) throw new Error(_('Cannot share notebook with recipient %s because they do not have a public key. Ask them to create one from the menu "%s"', recipientEmail, 'Tools > Generate Public-Private Key pair'));

			logger.info('Reencrypting master key with recipient public key', recipientPublicKey);

			recipientMasterKey = await ppkReencryptMasterKey(
				this.encryptionService_,
				masterKey,
				syncInfo.ppk,
				getPpkPassword(syncInfo.ppk),
				recipientPublicKey
			);
		}

		return this.api().exec('POST', `api/shares/${shareId}/users`, {}, {
			email: recipientEmail,
			master_key: JSON.stringify(recipientMasterKey),
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

	public async respondInvitation(shareUserId: string, accept: boolean) {
		if (accept) {
			await this.api().exec('PATCH', `api/share_users/${shareUserId}`, null, { status: 1 });
		} else {
			await this.api().exec('PATCH', `api/share_users/${shareUserId}`, null, { status: 2 });
		}
	}

	public async refreshShareInvitations() {
		const result = await this.loadShareInvitations();

		this.store.dispatch({
			type: 'SHARE_INVITATION_SET',
			shareInvitations: result.items,
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

		this.store.dispatch({
			type: 'SHARE_SET',
			shares: result.items,
		});

		return result.items;
	}

	public async refreshShareUsers(shareId: string) {
		const result = await this.loadShareUsers(shareId);

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
