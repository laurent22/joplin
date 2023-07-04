import { Item, Share, ShareType, ShareUser, ShareUserStatus, User, Uuid } from '../services/database/types';
import { ErrorBadRequest, ErrorForbidden, ErrorNotFound } from '../utils/errors';
import BaseModel, { AclAction, DeleteOptions } from './BaseModel';
import { getCanShareFolder } from './utils/user';

export default class ShareUserModel extends BaseModel<ShareUser> {

	public get tableName(): string {
		return 'share_users';
	}

	public async checkIfAllowed(user: User, action: AclAction, resource: ShareUser = null): Promise<void> {
		if (action === AclAction.Create) {
			const recipient = await this.models().user().load(resource.user_id, { fields: ['account_type', 'can_share_folder', 'enabled'] });
			if (!recipient.enabled) throw new ErrorForbidden('the recipient account is disabled');
			if (!getCanShareFolder(recipient)) throw new ErrorForbidden('The sharing feature is not enabled for the recipient account');

			const share = await this.models().share().load(resource.share_id);
			if (share.owner_id !== user.id) throw new ErrorForbidden('no access to the share object');
			if (share.owner_id === resource.user_id) throw new ErrorForbidden('cannot share an item with yourself');

			const existingShareUser = await this.byShareAndUserId(share.id, resource.user_id);
			if (existingShareUser) throw new ErrorForbidden('already shared with this user');
		}

		if (action === AclAction.Update) {
			if (user.id !== resource.user_id) throw new ErrorForbidden('cannot change share user');
		}

		if (action === AclAction.Delete) {
			const share = await this.models().share().load(resource.share_id);
			// Recipient can accept or reject a share, but only the owner can
			// actually delete the invitation.
			if (share.owner_id !== user.id) throw new ErrorForbidden('only the owner of a share can add or remove recipients');
		}
	}

	public async byUserId(userId: Uuid): Promise<ShareUser[]> {
		return this.db(this.tableName).select(this.defaultFields).where('user_id', '=', userId);
	}

	public async byShareId(shareId: Uuid, status: ShareUserStatus): Promise<ShareUser[]> {
		const r = await this.byShareIds([shareId], status);
		return Object.keys(r).length > 0 ? r[shareId] : [];
	}

	public async byShareIds(shareIds: Uuid[], status: ShareUserStatus): Promise<Record<Uuid, ShareUser[]>> {
		const query = this
			.db(this.tableName)
			.select(this.defaultFields)
			.whereIn('share_id', shareIds);

		if (status !== null) void query.where('status', status);

		const rows: ShareUser[] = await query;

		const output: Record<Uuid, ShareUser[]> = {};

		for (const row of rows) {
			if (!(row.share_id in output)) output[row.share_id] = [];
			output[row.share_id].push(row);
		}

		return output;
	}

	public async isShareParticipant(shareId: Uuid, userId: Uuid): Promise<boolean> {
		const r = await this.byShareAndUserId(shareId, userId);
		if (r) return true;
		const share = await this.models().share().load(shareId, { fields: ['owner_id'] });
		return share && share.owner_id === userId;
	}

	public async byShareAndUserId(shareId: Uuid, userId: Uuid): Promise<ShareUser> {
		const link: ShareUser = {
			share_id: shareId,
			user_id: userId,
		};

		return this.db(this.tableName).where(link).first();
	}

	public async shareWithUserAndAccept(share: Share, shareeId: Uuid, masterKey = '') {
		await this.models().shareUser().addById(share.id, shareeId, masterKey);
		await this.models().shareUser().setStatus(share.id, shareeId, ShareUserStatus.Accepted);
	}

	public async addById(shareId: Uuid, userId: Uuid, masterKey: string): Promise<ShareUser> {
		const user = await this.models().user().load(userId);
		return this.addByEmail(shareId, user.email, masterKey);
	}

	public async byShareAndEmail(shareId: Uuid, userEmail: string): Promise<ShareUser> {
		const user = await this.models().user().loadByEmail(userEmail);
		if (!user) throw new ErrorNotFound(`No such user: ${userEmail}`);

		return this.db(this.tableName).select(this.defaultFields)
			.where('share_id', '=', shareId)
			.where('user_id', '=', user.id)
			.first();
	}

	public async addByEmail(shareId: Uuid, userEmail: string, masterKey: string): Promise<ShareUser> {
		const share = await this.models().share().load(shareId);
		if (!share) throw new ErrorNotFound(`No such share: ${shareId}`);

		const user = await this.models().user().loadByEmail(userEmail);
		if (!user) throw new ErrorNotFound(`No such user: ${userEmail}`);

		return this.save({
			share_id: shareId,
			user_id: user.id,
			master_key: masterKey,
		});
	}

	public async setStatus(shareId: Uuid, userId: Uuid, status: ShareUserStatus): Promise<Item> {
		const shareUser = await this.byShareAndUserId(shareId, userId);
		if (!shareUser) throw new ErrorNotFound(`Item has not been shared with this user: ${shareId} / ${userId}`);

		if (shareUser.status === status) throw new ErrorBadRequest(`Share ${shareId} status is already ${status}`);

		const share = await this.models().share().load(shareId);
		if (!share) throw new ErrorNotFound(`No such share: ${shareId}`);

		return this.withTransaction<Item>(async () => {
			if (status === ShareUserStatus.Accepted) {
				await this.models().share().createSharedFolderUserItems(shareId, userId);
			}

			return this.save({ ...shareUser, status });
		}, 'ShareUserModel::setStatus');
	}

	public async deleteByShare(share: Share): Promise<void> {
		// Notes that are shared by link do not have associated ShareUser items,
		// so there's nothing to do.
		if (share.type !== ShareType.Folder) return;

		const shareUsers = await this.byShareId(share.id, null);
		if (!shareUsers.length) return;

		await this.withTransaction(async () => {
			await this.delete(shareUsers.map(s => s.id));
		}, 'ShareUserModel::deleteByShare');
	}

	public async deleteByUserId(userId: Uuid) {
		const shareUsers = await this.byUserId(userId);

		await this.withTransaction(async () => {
			for (const shareUser of shareUsers) {
				await this.delete(shareUser.id);
			}
		}, 'UserShareModel::deleteByUserId');
	}

	public async delete(id: string | string[], _options: DeleteOptions = {}): Promise<void> {
		const ids = typeof id === 'string' ? [id] : id;
		if (!ids.length) throw new Error('no id provided');

		const shareUsers = await this.loadByIds(ids, { fields: ['user_id', 'share_id'] });

		await this.withTransaction(async () => {
			for (const shareUser of shareUsers) {
				await this.models().userItem().deleteByShareAndUserId(shareUser.share_id, shareUser.user_id);
			}

			await this.db(this.tableName).whereIn('id', ids).delete();
		}, 'ShareUserModel::delete');
	}

}
