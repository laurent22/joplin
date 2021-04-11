import { File, JoplinFileContent, Share, ShareType, ShareUser, Uuid } from '../db';
import { ErrorBadRequest } from '../utils/errors';
import { setQueryParameters } from '../utils/urlUtils';
import BaseModel, { ValidateOptions } from './BaseModel';

export default class ShareModel extends BaseModel<Share> {

	public get tableName(): string {
		return 'shares';
	}

	protected async validate(share: Share, _options: ValidateOptions = {}): Promise<Share> {
		if ('type' in share && ![ShareType.Link, ShareType.App, ShareType.JoplinRootFolder].includes(share.type)) throw new ErrorBadRequest(`Invalid share type: ${share.type}`);

		return share;
	}

	public async createShare(shareType: ShareType, path: string, isAuto: boolean = false): Promise<Share> {
		const file: File = await this.models().file({ userId: this.userId }).pathToFile(path);

		if (file.source_file_id) throw new ErrorBadRequest('A shared file cannot be shared again');

		const toSave: Share = {
			type: shareType,
			file_id: file.id,
			owner_id: this.userId,
			is_auto: isAuto ? 1 : 0,
		};

		return this.save(toSave);
	}

	public async createJoplinFolderShare(folderId: string): Promise<Share> {
		const toSave: Share = {
			type: ShareType.JoplinRootFolder,
			folder_id: folderId,
			file_id: '',
			owner_id: this.userId,
		};

		return this.save(toSave);
	}

	public shareUrl(id: Uuid, query: any = null): string {
		return setQueryParameters(`${this.baseUrl}/shares/${id}`, query);
	}

	public async sharesByFileId(fileId: string): Promise<Share[]> {
		return this.db(this.tableName).select(this.defaultFields).where('file_id', '=', fileId);
	}

	public async sharesByUser(userId: Uuid, type: ShareType): Promise<Share[]> {
		return this.db(this.tableName)
			.select(this.defaultFields)
			.where('owner_id', '=', userId)
			.andWhere('type', '=', type);
	}

	public async updateSharedJoplinFolderChildren(userId: Uuid) {
		const shares = await this.models().share().sharesByUser(userId, ShareType.JoplinRootFolder);
		const rootShareUsers = await this.models().shareUser().byShareIds(shares.map(s => s.id));

		await this.withTransaction(async () => {
			// ===================================================================
			// First, loop through all the folders that have been shared by this
			// user (represented by a "share" object), then loop through all the
			// children (notes and folders) of the folder. Then for each of
			// these, for each sharee, create a link for the associated file.
			// ===================================================================

			let allChildrenFileIds: Uuid[] = [];
			for (const share of shares) {
				const shareUsers: ShareUser[] = rootShareUsers[share.id];
				if (!shareUsers) {
					// User has created a new share but it has not been accepted
					// or sent to any other user.
					continue;
				}

				allChildrenFileIds.push(share.file_id);

				const folderContent: JoplinFileContent = await this.models().file().content(share.file_id, false);
				const children = await this.models().joplinFileContent().allChildren(userId, folderContent.item_id);
				const files = await this.models().file().fileIdsByContentIds(children.map(c => c.id));
				const childrenFileIds = files.map(f => f.id);
				const linkedFiles: File[] = await this.db('files').select(['id', 'source_file_id', 'owner_id']).whereIn('source_file_id', childrenFileIds);

				allChildrenFileIds = allChildrenFileIds.concat(childrenFileIds);

				for (const child of children) {
					const file = files.find(f => f.content_id === child.id);
					if (!file) {
						throw new Error(`No file for content: ${child.id}`);
					}

					for (const shareUser of shareUsers) {
						const existingLinkedFile = linkedFiles.find(f => f.source_file_id === file.id && f.owner_id === shareUser.user_id);
						if (existingLinkedFile) continue; // Already linked

						await this.models().file({ userId: shareUser.user_id }).createLink(file);
					}
				}
			}

			// ===================================================================
			// Now that all shared folders and children have been shared, delete
			// the orphaned links. Those can happen for example if the sharer
			// moves a note outside a shared folder. In that case, existing
			// links point to a note that is no longer part of the shared
			// folder.
			//
			// These orphaned links are:
			// - All the links that point to files owned by userId (source_files)
			// - Excluding the source_files we've just processed
			// ===================================================================

			const orphanedFileLinks: File[] = await this
				.db('files AS dest_files')
				.select(['dest_files.id', 'dest_files.owner_id'])
				.leftJoin('files AS source_files', 'dest_files.source_file_id', 'source_files.id')
				.where('dest_files.source_file_id', '!=', '')
				.where('source_files.owner_id', '=', userId)
				.whereNotIn('source_files.id', allChildrenFileIds);

			for (const orphanedFileLink of orphanedFileLinks) {
				await this.models().file({ userId: orphanedFileLink.owner_id }).delete(orphanedFileLink.id);
			}
		});
	}

}
