import { Item, Share, ShareType, ShareUser, Uuid } from '../db';
import { ErrorNotFound } from '../utils/errors';
import BaseModel from './BaseModel';

export default class ShareUserModel extends BaseModel<ShareUser> {

	public get tableName(): string {
		return 'share_users';
	}

	public async loadByFileId(fileId: Uuid): Promise<ShareUser[]> {
		const shares = await this.models().share().sharesByFileId(fileId);
		const shareIds = shares.map(s => s.id);
		return this.db(this.tableName).select(...this.defaultFields).whereIn('share_id', shareIds);
	}

	public async byShareId(shareId: Uuid): Promise<ShareUser[]> {
		return this.db(this.tableName).select(this.defaultFields).where('share_id', '=', shareId);
	}

	public async byShareIds(shareIds: Uuid[]): Promise<Record<Uuid, ShareUser[]>> {
		const rows: ShareUser[] = await this.db(this.tableName).select(this.defaultFields).whereIn('share_id', shareIds);
		const output: Record<Uuid, ShareUser[]> = {};

		for (const row of rows) {
			if (!(row.share_id in output)) output[row.share_id] = [];
			output[row.share_id].push(row);
		}

		return output;
	}

	public async loadByShareIdAndUser(shareId: Uuid, userId: Uuid): Promise<ShareUser> {
		const link: ShareUser = {
			share_id: shareId,
			user_id: userId,
		};

		return this.db(this.tableName).where(link).first();
	}

	public async shareWithUserAndAccept(share: Share, shareeId: Uuid) {
		// if (await this.fileIsShared(share.type, share.file_id, shareeId)) return; // Already shared with user

		await this.models().shareUser().addById(share.id, shareeId);
		await this.models().shareUser().accept(share.id, shareeId, true);
	}

	public async fileIsShared(shareType: ShareType, fileId: Uuid, userId: Uuid, isAccepted: boolean = null): Promise<boolean> {
		const query = this
			.db('share_users')
			.select('share_users.id')
			.leftJoin('shares', 'share_users.share_id', 'shares.id')
			.where('shares.file_id', '=', fileId)
			.andWhere('shares.type', '=', shareType)
			.andWhere('share_users.user_id', '=', userId);

		if (isAccepted !== null) {
			void query.andWhere('share_users.is_accepted', '=', isAccepted ? 1 : 0);
		}

		return !!(await query.first());
	}

	public async addById(shareId: Uuid, userId: Uuid): Promise<ShareUser> {
		const user = await this.models().user().load(userId);
		return this.addByEmail(shareId, user.email);
	}

	public async addByEmail(shareId: Uuid, userEmail: string): Promise<ShareUser> {
		// TODO: check that user can access this share
		const share = await this.models().share().load(shareId);
		if (!share) throw new ErrorNotFound(`No such share: ${shareId}`);

		const user = await this.models().user().loadByEmail(userEmail);
		if (!user) throw new ErrorNotFound(`No such user: ${userEmail}`);

		return this.save({
			share_id: shareId,
			user_id: user.id,
		});
	}

	public async accept(shareId: Uuid, userId: Uuid, accept: boolean = true): Promise<Item> {
		const shareUser = await this.loadByShareIdAndUser(shareId, userId);
		if (!shareUser) throw new ErrorNotFound(`Item has not been shared with this user: ${shareId} / ${userId}`);

		const share = await this.models().share().load(shareId);
		if (!share) throw new ErrorNotFound(`No such share: ${shareId}`);

		const item = await this.models().item().load(share.item_id);

		return this.withTransaction<Item>(async () => {
			await this.save({ ...shareUser, is_accepted: accept ? 1 : 0 });

			if (share.type === ShareType.JoplinRootFolder) {
				await this.models().item().shareJoplinFolderAndContent(share.id, share.owner_id, userId, item.jop_id);
			} else if (share.type === ShareType.App) {
				await this.models().userItem().add(userId, share.item_id, share.id);
			}
		});
	}

	public async reject(shareId: Uuid, userId: Uuid) {
		await this.accept(shareId, userId, false);
	}

	public async deleteByShare(share: Share): Promise<void> {
		const shareUsers = await this.byShareId(share.id);

		await this.withTransaction(async () => {
			await this.delete(shareUsers.map(s => s.id));
		}, 'ShareUserModel::delete');
	}

	// Returns the users who have shared files with the current user
	// public async linkedUserIds(userId:Uuid): Promise<Uuid[]> {
	// 	const fileSubQuery = this
	// 		.db('files')
	// 		.select('source_file_id')
	// 		.where('source_file_id', '!=', '')
	// 		.andWhere('owner_id', '=', userId);

	// 	return this
	// 		.db('files')
	// 		.distinct('owner_id')
	// 		.whereIn('files.id', fileSubQuery)
	// 		.pluck('owner_id');
	// }

}
