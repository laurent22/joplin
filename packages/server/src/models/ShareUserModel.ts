import { File, ShareUser, Uuid } from '../db';
import { ErrorNotFound } from '../utils/errors';
import BaseModel from './BaseModel';

export default class ShareUserModel extends BaseModel<ShareUser> {

	public get tableName(): string {
		return 'share_users';
	}

	public async loadByFileId(fileId: Uuid): Promise<ShareUser[]> {
		const shares = await this.models().share({ userId: this.userId }).sharesByFileId(fileId);
		const shareIds = shares.map(s => s.id);
		return this.db(this.tableName).select(...this.defaultFields).whereIn('share_id', shareIds);
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

	public async accept(shareId: Uuid, userId: Uuid, accept: boolean = true): Promise<File> {
		const shareUser = await this.loadByShareIdAndUser(shareId, userId);
		if (!shareUser) throw new ErrorNotFound(`File has not been shared with this user: ${shareId} / ${userId}`);

		const share = await this.models().share().load(shareId);
		if (!share) throw new ErrorNotFound(`No such share: ${shareId}`);

		const sourceFile = await this.models().file({ userId: share.owner_id }).load(share.file_id);
		const rootId = await this.models().file({ userId: this.userId }).userRootFileId();

		return this.withTransaction<File>(async () => {
			await this.save({ ...shareUser, is_accepted: accept ? 1 : 0 });

			const file: File = {
				owner_id: userId,
				source_file_id: share.file_id,
				parent_id: rootId,
				name: sourceFile.name,
			};

			return this.models().file({ userId }).save(file);
		});
	}

	public async reject(shareId: Uuid, userId: Uuid) {
		await this.accept(shareId, userId, false);
	}

	// Returns the users who have shared files with the current user
	public async linkedUserIds(): Promise<Uuid[]> {
		const fileSubQuery = this
			.db('files')
			.select('source_file_id')
			.where('source_file_id', '!=', '')
			.andWhere('owner_id', '=', this.userId);

		return this
			.db('files')
			.distinct('owner_id')
			.whereIn('files.id', fileSubQuery)
			.pluck('owner_id');
	}

}
