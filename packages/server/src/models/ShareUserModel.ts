import { Item, Share, ShareType, ShareUser, ShareUserStatus, User, Uuid } from '../services/database/types';
import { ErrorBadRequest, ErrorConflict, ErrorForbidden, ErrorNotFound } from '../utils/errors';
import BaseModel, { AclAction, DeleteOptions } from './BaseModel';
import { getCanReceiveFolder } from './utils/user';
import config from '../config';

// Without a mailer, which self-hosted servers often do not set up, an address cannot be confirmed
export const needsEmailConfirmation = (user: User) => config().mailer.enabled && !user.email_confirmed;

export const confirmEmailMessage = (action: string) => `Please confirm your email address before ${action}. A confirmation link was sent to your email address, and you can send it again from your profile page.`;

export default class ShareUserModel extends BaseModel<ShareUser> {

	public get tableName(): string {
		return 'share_users';
	}

	// The checks that do not depend on the recipient. They must be done before the recipient's email is looked up, so
	// that an invitation that cannot be sent anyway does not reveal whether an address has an account.
	public async checkCanInvite(user: User, resource: ShareUser) {
		// Otherwise anyone could share notebooks under an address they do not own, such as one typed in at checkout
		if (needsEmailConfirmation(user)) throw new ErrorForbidden(confirmEmailMessage('sharing a notebook'));

		const share = await this.models().share().load(resource.share_id);
		if (!share || share.owner_id !== user.id) throw new ErrorForbidden('no access to the share object');
	}

	public async checkIfAllowed(user: User, action: AclAction, resource: ShareUser = null): Promise<void> {
		if (action === AclAction.Create) {
			await this.checkCanInvite(user, resource);

			const recipient = await this.models().user().load(resource.user_id, { fields: ['account_type', 'can_receive_folder', 'enabled'] });
			if (!recipient.enabled) throw new ErrorForbidden('the recipient account is disabled');
			if (!getCanReceiveFolder(recipient)) throw new ErrorForbidden('The sharing feature is not enabled for the recipient account');

			const share = await this.models().share().load(resource.share_id);
			if (share.owner_id === resource.user_id) throw new ErrorForbidden('cannot share an item with yourself');

			const existingShareUser = await this.byShareAndUserId(share.id, resource.user_id);
			if (existingShareUser) throw new ErrorForbidden('already shared with this user');
		}

		if (action === AclAction.Update) {
			if (user.id === resource.user_id) {
				// OK - a share recipient can modify its own object
			} else {
				// Otherwise check if the user owns the share
				const share = await this.models().share().load(resource.share_id);
				if (!share) throw new ErrorBadRequest(`No such share: ${resource.share_id}`);
				if (share.owner_id !== user.id) throw new ErrorForbidden('cannot change someone else\'s share');
			}
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
		// The checks below compare it with the status values, which a string would get past
		if (typeof status !== 'number') throw new ErrorBadRequest(`Invalid status: ${status}`);

		const shareUser = await this.byShareAndUserId(shareId, userId);
		if (!shareUser) throw new ErrorNotFound(`Item has not been shared with this user: ${shareId} / ${userId}`);

		if (shareUser.status === status) throw new ErrorBadRequest(`Share ${shareId} status is already ${status}`);

		const share = await this.models().share().load(shareId);
		if (!share) throw new ErrorNotFound(`No such share: ${shareId}`);

		return this.withTransaction<Item>(async () => {
			if (status === ShareUserStatus.Accepted) {
				// The items that a disabled account planted in its share would otherwise still be delivered
				const shareOwner = await this.models().user().load(share.owner_id, { fields: ['enabled'] });
				if (!shareOwner?.enabled) throw new ErrorForbidden('This invitation can no longer be accepted, because the account that sent it is disabled.');

				// Items with the same name as one of the user's own are not added (see UserItemModel.addMulti), so they would
				// silently diverge from the shared ones. Refuse instead, so that the user knows.
				const shareItems = await this.models().item().byShareId(shareId, { fields: ['id', 'name'] });
				const userItemIdsByName = await this.models().userItem().itemIdsByName(userId, shareItems.map(i => i.name));
				if (shareItems.some(i => userItemIdsByName.has(i.name) && userItemIdsByName.get(i.name) !== i.id)) {
					throw new ErrorConflict('This notebook cannot be accepted because your account already contains a copy of it, or of some of its notes. This can happen if it was previously synchronised with your account. To accept it, first permanently delete that copy (delete it, then empty the trash) and synchronise.');
				}

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
