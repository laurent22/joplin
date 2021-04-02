import { File, FileContentType, JoplinFileContent } from '../../db';
import BaseModel, { SaveOptions } from '../../models/BaseModel';

export default class JoplinFileContentModel extends BaseModel<JoplinFileContent> {

	public get tableName(): string {
		return 'joplin_file_contents';
	}

	protected autoTimestampEnabled(): boolean {
		return false;
	}

	public async saveFileAndContent(file: File, joplinFileContent: JoplinFileContent, options: SaveOptions): Promise<File> {
		let modFile: File = { ...file };

		await this.withTransaction(async () => {
			joplinFileContent = await this.save(joplinFileContent);
			delete modFile.content;
			modFile.content_id = joplinFileContent.id;
			modFile.content_type = FileContentType.JoplinItem;
			modFile = await this.models().file({ userId: this.userId }).save(modFile, options);
		}, 'saveJoplinFileContent');

		return modFile;
	}

	public async fileIdFromItemId(ownerId: string, itemId: string): Promise<string> {
		const f = await this.db('files')
			.leftJoin(this.tableName, 'files.content_id', 'joplin_file_contents.id')
			.select('files.id')
			.where('joplin_file_contents.item_id', '=', itemId)
			.andWhere('files.owner_id', '=', ownerId)
			.first();

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
