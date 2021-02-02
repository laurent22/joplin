import { File, ShareUser, Uuid } from '../db';
import { ErrorNotFound } from '../utils/errors';
import BaseModel from './BaseModel';

export default class ShareUserModel extends BaseModel<ShareUser> {

	public get tableName(): string {
		return 'share_users';
	}

	public async loadByShareIdAndUser(shareId: Uuid, userId: Uuid): Promise<ShareUser> {
		const link: ShareUser = {
			share_id: shareId,
			user_id: userId,
		};

		return this.db(this.tableName).where(link).first();
	}

	public async addByEmail(shareId: Uuid, userEmail: string): Promise<ShareUser> {
		// TODO: check that user can access this share
		const share = await this.models().share({ userId: this.userId }).load(shareId);
		if (!share) throw new ErrorNotFound(`No such share: ${shareId}`);

		const user = await this.models().user().loadByEmail(userEmail);
		if (!user) throw new ErrorNotFound(`No such user: ${userEmail}`);

		return this.save({
			share_id: shareId,
			user_id: user.id,
		});
	}

	public async accept(shareId: Uuid, userId: Uuid, accept: boolean = true) {
		const link = await this.loadByShareIdAndUser(shareId, userId);
		if (!link) throw new ErrorNotFound(`File has not been shared with this user: ${shareId} / ${userId}`);

		const share = await this.models().share().load(shareId);
		if (!share) throw new ErrorNotFound(`No such share: ${shareId}`);

		const rootId = await this.models().file({ userId: this.userId }).userRootFileId();

		await this.withTransaction(async () => {
			await this.save({ ...link, is_accepted: accept ? 1 : 0 });

			const file: File = {
				owner_id: userId,
				linked_file_id: share.file_id,
				parent_id: rootId,
				name: '',
			};

			await this.models().file({ userId }).save(file);
		});
	}

	public async reject(shareId: Uuid, userId: Uuid) {
		await this.accept(shareId, userId, false);
	}

}
