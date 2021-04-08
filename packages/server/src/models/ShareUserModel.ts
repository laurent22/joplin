import { File, Share, ShareType, ShareUser, Uuid } from '../db';
import { ErrorNotFound } from '../utils/errors';
import BaseModel from './BaseModel';
import { Models } from './factory';

export interface ShareAcceptedHandlerEvent {
	linkedFile: File;
	share: Share;
	models: Models;
}

export type ShareAcceptedHandler = (event: ShareAcceptedHandlerEvent)=> void;

export default class ShareUserModel extends BaseModel<ShareUser> {

	private static shareAcceptedHandlers_: ShareAcceptedHandler[] = [];

	public get tableName(): string {
		return 'share_users';
	}

	public async loadByFileId(fileId: Uuid): Promise<ShareUser[]> {
		const shares = await this.models().share({ userId: this.userId }).sharesByFileId(fileId);
		const shareIds = shares.map(s => s.id);
		return this.db(this.tableName).select(...this.defaultFields).whereIn('share_id', shareIds);
	}

	public static registerShareAcceptedHandler(handler: ShareAcceptedHandler) {
		this.shareAcceptedHandlers_.push(handler);
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

		await this.models().shareUser({ userId: share.owner_id }).addById(share.id, shareeId);
		await this.models().shareUser({ userId: shareeId }).accept(share.id, shareeId, true);
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
		const user = await this.models().user({ userId }).load(userId);
		return this.addByEmail(shareId, user.email);
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

	private static async processShareAcceptedHandlers(event: ShareAcceptedHandlerEvent) {
		for (const handler of this.shareAcceptedHandlers_) {
			await handler(event);
		}
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

			const savedFile = await this.models().file({ userId }).save(file);

			await ShareUserModel.processShareAcceptedHandlers({
				linkedFile: savedFile,
				share: share,
				models: this.models(),
			});

			return savedFile;
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
