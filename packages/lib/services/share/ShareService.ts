import { Store } from 'redux';
import JoplinServerApi from '../../JoplinServerApi';
import Folder from '../../models/Folder';
import Note from '../../models/Note';
import Setting from '../../models/Setting';
import SyncTargetJoplinServer from '../../SyncTargetJoplinServer';
import { State, stateRootKey, StateShare } from './reducer';

export default class ShareService {

	private static instance_: ShareService;
	private api_: JoplinServerApi = null;
	private store_: Store<any> = null;

	public static instance(): ShareService {
		if (this.instance_) return this.instance_;
		this.instance_ = new ShareService();
		return this.instance_;
	}

	public initialize(store: Store<any>) {
		this.store_ = store;
	}

	public get enabled(): boolean {
		return Setting.value('sync.target') === SyncTargetJoplinServer.id();
	}

	private get store(): Store<any> {
		return this.store_;
	}

	private get state(): State {
		return this.store.getState()[stateRootKey] as State;
	}

	private api(): JoplinServerApi {
		if (this.api_) return this.api_;

		this.api_ = new JoplinServerApi({
			baseUrl: () => Setting.value('sync.9.path'),
			username: () => Setting.value('sync.9.username'),
			password: () => Setting.value('sync.9.password'),
		});

		return this.api_;
	}

	public async shareFolder(folderId: string) {
		const folder = await Folder.load(folderId);
		if (!folder) throw new Error(`No such folder: ${folderId}`);

		if (folder.parent_id) {
			await Folder.save({ id: folder.id, parent_id: '' });
		}

		const share = await this.api().exec('POST', 'api/shares', {}, { folder_id: folderId });

		await Folder.save({ id: folder.id, share_id: share.id });
		await Folder.updateAllShareIds();

		return share;
	}

	public async shareNote(noteId: string) {
		const note = await Note.load(noteId);
		if (!note) throw new Error(`No such note: ${noteId}`);

		const share = await this.api().exec('POST', 'api/shares', {}, { note_id: noteId });

		await Note.save({ id: note.id, is_shared: 1 });

		return share;
	}

	public shareUrl(share: StateShare): string {
		return `${this.api().baseUrl()}/shares/${share.id}`;
	}

	public get shares() {
		return this.state.shares;
	}

	public get shareLinkNoteIds(): string[] {
		return this.shares.filter(s => !!s.note_id).map(s => s.note_id);
	}

	public async addShareRecipient(shareId: string, recipientEmail: string) {
		return this.api().exec('POST', `api/shares/${shareId}/users`, {}, {
			email: recipientEmail,
		});
	}

	public async deleteShareRecipient(shareUserId: string) {
		await this.api().exec('DELETE', `api/share_users/${shareUserId}`);
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

	public async refreshShares() {
		const result = await this.loadShares();

		this.store.dispatch({
			type: 'SHARE_SET',
			shares: result.items,
		});
	}

	public async refreshShareUsers(shareId: string) {
		const result = await this.loadShareUsers(shareId);

		this.store.dispatch({
			type: 'SHARE_USER_SET',
			shareId: shareId,
			shareUsers: result.items,
		});
	}

	public async maintenance() {
		if (this.enabled) {
			await this.refreshShareInvitations();
			await this.refreshShares();
		}
	}

}
