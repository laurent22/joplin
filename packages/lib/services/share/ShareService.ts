import JoplinServerApi from '../../JoplinServerApi';
import Folder from '../../models/Folder';
import Setting from '../../models/Setting';
import SyncTargetJoplinServer from '../../SyncTargetJoplinServer';

// const logger = Logger.create('ShareService');

export default class ShareService {

	private static instance_: ShareService;
	private api_: JoplinServerApi = null;
	private dispatch_: Function = null;
	// private applyingShareId_:boolean = false;

	public static instance(): ShareService {
		if (this.instance_) return this.instance_;
		this.instance_ = new ShareService();
		return this.instance_;
	}

	public initialize(dispatch: Function) {
		this.dispatch_ = dispatch;
	}

	public get enabled(): boolean {
		return Setting.value('sync.target') === SyncTargetJoplinServer.id();
	}

	private get dispatch(): Function {
		return this.dispatch_;
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

		await Folder.setShareStatus(folderId, share.id);

		return share;
	}

	public async addShareRecipient(shareId: string, recipientEmail: string) {
		return this.api().exec('POST', `api/shares/${shareId}/users`, {}, {
			email: recipientEmail,
		});
	}

	public async deleteShareRecipient(shareUserId: string) {
		await this.api().exec('DELETE', `api/share_users/${shareUserId}`);
	}

	public async shares() {
		return this.api().exec('GET', 'api/shares');
	}

	public async shareUsers(shareId: string) {
		return this.api().exec('GET', `api/shares/${shareId}/users`);
	}

	public async shareInvitations() {
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
		const result = await this.shareInvitations();

		this.dispatch({
			type: 'SHARE_INVITATION_SET',
			shareInvitations: result.items,
		});
	}

	public async refreshShares() {
		const result = await this.shares();

		this.dispatch({
			type: 'SHARE_SET',
			shares: result.items,
		});
	}

	public async refreshShareUsers(shareId: string) {
		const result = await this.shareUsers(shareId);

		this.dispatch({
			type: 'SHARE_USER_SET',
			shareId: shareId,
			shareUsers: result.items,
		});
	}

	// public async applyShareIds() {
	// 	if (this.applyingShareId_) {
	// 		logger.info('Already indexing - waiting for it to finish');
	// 		await time.waitTillCondition(() => !this.applyingShareId_);
	// 		return;
	// 	}

	// 	this.applyingShareId_ = true;

	// 	try {
	// 		await ItemChange.waitForAllSaved();

	// 		while (true) {
	// 			const changes:ItemChangeEntity[] = await ItemChange.modelSelectAll(`
	// 				SELECT id, item_id, type, share_id
	// 				FROM item_changes
	// 				WHERE (item_type = ? OR item_type = ?)
	// 				AND id > ?
	// 				ORDER BY id ASC
	// 				LIMIT 10
	// 				`, [
	// 					ModelType.Note,
	// 					ModelType.Folder,
	// 					Setting.value('shareService.lastProcessedChangeId')
	// 			]);

	// 			if (!changes.length) break;

	// 			const itemIds = changes.map((a: any) => a.item_id);
	// 			const notes:NoteEntity[] = await BaseModel.db().selectAll(`SELECT id, parent_id, share_id FROM notes WHERE id IN ("${itemIds.join('","')}")`);
	// 			const folders:FolderEntity[] = await BaseModel.db().selectAll(`SELECT id, parent_id, share_id FROM folders WHERE id IN ("${itemIds.join('","')}")`);
	// 			const parentIds:string[] = notes.map(n => n.parent_id).concat(folders.map(f => f.parent_id));
	// 			const parentFolders:FolderEntity[] = await BaseModel.db().selectAll(`SELECT id, share_id FROM folders WHERE id IN ("${parentIds.join('","')}")`);
	// 			const allItems = notes.concat(folders);

	// 			const itemById = (items:any[], itemId: string) => {
	// 				for (const item of items) {
	// 					if (item.id === itemId) return item;
	// 				}

	// 				// The note may have been deleted since the change was recorded. For example in this case:
	// 				// - Note created (Some Change object is recorded)
	// 				// - Note is deleted
	// 				// - ResourceService indexer runs.
	// 				// In that case, there will be a change for the note, but the note will be gone.
	// 				return null;
	// 			};

	// 			for (const change of changes) {
	// 				const itemType:ModelType = change.type;
	// 				const item = itemById(allItems, change.item_id);
	// 				if (!item) continue;

	// 				const parentFolder = itemById(parentFolders, item.parent_id);
	// 				if (!parentFolder) continue;

	// 				let newItem = null;

	// 				if (change.type === ItemChange.TYPE_CREATE) {
	// 					if (item.share_id !== parentFolder.share_id) {
	// 						newItem = { id: item.id, share_id: parentFolder.share_id };
	// 					}
	// 				} else if (change.type === ItemChange.TYPE_UPDATE) {
	// 					if (item.share_id !== parentFolder.share_id) {
	// 						newItem = { id: item.id, share_id: parentFolder.share_id };
	// 					}
	// 				} else if (change.type === ItemChange.TYPE_DELETE) {

	// 				} else {
	// 					throw new Error(`Invalid change type: ${change.type}`);
	// 				}

	// 				Setting.setValue('shareService.lastProcessedChangeId', change.id);
	// 			}
	// 		}

	// 		await Setting.saveAll();
	// 	} catch (error) {
	// 		logger.error(error);
	// 	}

	// 	this.applyingShareId_ = false;
	// }

	public async maintenance() {
		if (this.enabled) {
			await this.refreshShareInvitations();
			await this.refreshShares();
		}
	}

}
