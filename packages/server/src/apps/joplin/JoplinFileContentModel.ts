import { File, FileContentType, JoplinFileContent, ShareType } from '../../db';
import BaseModel, { SaveOptions } from '../../models/BaseModel';

export default class JoplinFileContentModel extends BaseModel<JoplinFileContent> {

	public get tableName(): string {
		return 'joplin_file_contents';
	}

	protected autoTimestampEnabled(): boolean {
		return false;
	}

	public async saveFileAndContent(file: File, joplinFileContent: JoplinFileContent, fileIsNew: boolean, options: SaveOptions): Promise<File> {
		let modFile: File = { ...file };

		await this.withTransaction(async () => {
			joplinFileContent = await this.save(joplinFileContent);
			delete modFile.content;
			modFile.content_id = joplinFileContent.id;
			modFile.content_type = FileContentType.JoplinItem;
			modFile = await this.models().file({ userId: modFile.owner_id }).save(modFile, options);

			if (fileIsNew && joplinFileContent.parent_id) {
				const parentItemFile = await this.fileFromItemId(modFile.owner_id, joplinFileContent.parent_id);
				const userShares = await this.models().shareUser({ userId: this.userId }).loadByFileId(parentItemFile.id);
				const newShare = await this.models().share({ userId: modFile.owner_id }).createShare(ShareType.App, modFile.id, true);

				for (const userShare of userShares) {
					await this.models().shareUser({ userId: modFile.owner_id }).addById(newShare.id, userShare.user_id);
					await this.models().shareUser({ userId: userShare.user_id }).accept(newShare.id, userShare.user_id, true);
				}
			}
		}, 'saveJoplinFileContent');

		return modFile;
	}

	// private async handleSharing(file: File, joplinFileContent: JoplinFileContent, fileIsNew:boolean) {

	// }

	public async fileIdFromItemId(ownerId: string, itemId: string): Promise<string> {
		// const typeInfo = await this.models().file().contentTypeInfo(

		// const query = this.db('files')
		// .leftJoin(this.tableName, 'files.content_id', 'joplin_file_contents.id')
		// .select('files.id')
		// .where('joplin_file_contents.item_id', '=', itemId)
		// .andWhere('files.owner_id', '=', ownerId)
		// .first();

		const f = await this.db('files')
			.leftJoin(this.tableName, 'files.content_id', 'joplin_file_contents.id')
			.select('files.id')
			.where('joplin_file_contents.item_id', '=', itemId)
			.andWhere('files.owner_id', '=', ownerId)
			.first();

		// TODO: also do a query to fetch files that are shared
		// OR shared files should have the same content ID as the source file?. In which case no additional check is needed

		return f && f.id ? f.id : null;
	}

	public async fileFromItemId(ownerId: string, itemId: string): Promise<File> {
		const fileId = await this.fileIdFromItemId(ownerId, itemId);
		return this.models().file({ userId: ownerId }).load(fileId);
	}

	// public async loadFromItemId(ownerId:string, itemId:string):Promise<JoplinFileContent> {

	// }

	// public async createLinkedFolder(sourceOwnerId:string, sourceFolderId:string):Promise<FolderEntity> {
	// 	const file = await this.fileFromItemId(sourceOwnerId, sourceFolderId);

	// 	const newFile:File = {...file};
	// 	delete newFile.id;
	// 	newFile.owner_id = this.userId;
	// 	// newFile.parent_id

	// 	const content = await this.load(file.content_id);

	// 	console.info('FILE', file);
	// 	console.info('CONTENT', content);

	// 	// Makje content table ID globally unique
	// 	// Add column item_id
	// }

}
