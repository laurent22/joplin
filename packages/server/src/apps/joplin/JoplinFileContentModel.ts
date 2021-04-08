import { ModelType } from '@joplin/lib/BaseModel';
import { FolderEntity, NoteEntity } from '@joplin/lib/services/database/types';
import { File, FileContentType, JoplinFileContent } from '../../db';
import BaseModel, { SaveOptions } from '../../models/BaseModel';

type FolderTreeEntity = NoteEntity | FolderEntity;

// interface FolderTreeElement {
// 	item: NoteEntity | FolderEntity,
// 	children?: FolderTreeElement[],
// }

export default class JoplinFileContentModel extends BaseModel<JoplinFileContent> {

	public get tableName(): string {
		return 'joplin_file_contents';
	}

	protected autoTimestampEnabled(): boolean {
		return false;
	}

	// private async shareWithUserAndAccept(sharerId:Uuid, shareeId:Uuid, fileId:Uuid) {
	// 	const newShare = await this.models().share({ userId: modFile.owner_id }).createShare(ShareType.App, modFile.id, true);
	// 	for (const userShare of userShares) {
	// 		await this.models().shareUser({ userId: modFile.owner_id }).addById(newShare.id, userShare.user_id);
	// 		await this.models().shareUser({ userId: userShare.user_id }).accept(newShare.id, userShare.user_id, true);
	// 	}
	// }

	public async saveFileAndContent(file: File, joplinFileContent: JoplinFileContent, options: SaveOptions): Promise<File> {
		let modFile: File = { ...file };

		await this.withTransaction(async () => {
			joplinFileContent = await this.save(joplinFileContent);
			delete modFile.content;
			modFile.content_id = joplinFileContent.id;
			modFile.content_type = FileContentType.JoplinItem;
			modFile = await this.models().file({ userId: modFile.owner_id }).save(modFile, options);

			// if (fileIsNew && joplinFileContent.parent_id) {
			// 	const parentItemFile = await this.fileFromItemId(modFile.owner_id, joplinFileContent.parent_id);
			// 	const userShares = await this.models().shareUser({ userId: this.userId }).loadByFileId(parentItemFile.id);

			// 	if (userShares.length) {
			// 		const newShare = await this.models().share({ userId: modFile.owner_id }).createShare(ShareType.App, modFile.id, true);
			// 		for (const userShare of userShares) {
			// 			await this.models().shareUser({ userId: modFile.owner_id }).addById(newShare.id, userShare.user_id);
			// 			await this.models().shareUser({ userId: userShare.user_id }).accept(newShare.id, userShare.user_id, true);
			// 		}
			// 	}
			// }
		}, 'saveJoplinFileContent');

		return modFile;
	}

	// public async shareFolderContent(file:File) {
	// 	const content:JoplinFileContent = await this.models().file({ userId: file.owner_id }).content(file, false);
	// 	if (!content || content.parent_id || content.type !== ModelType.Folder) throw new Error('Can only share a root folder');

	// 	const userShares = await this.models().shareUser({ userId: file.owner_id }).loadByFileId(file.id);

	// 	const children = await this.allChildren(content.owner_id, content.item_id);

	// 	await this.withTransaction(() => {
	// 		for (const child of children) {

	// 		}
	// 	});
	// }

	public async allChildren(ownerId: string, folderId: string): Promise<FolderTreeEntity[]> {
		const children = await this.db(this.tableName)
			.select(['id', 'owner_id', 'item_id', 'parent_id', 'type'])
			.where('parent_id', '=', folderId)
			.andWhere('owner_id', '=', ownerId);

		let output: FolderTreeEntity[] = [];

		for (const child of children) {
			output.push(child);

			if (child.type === ModelType.Folder) {
				const subChildren = await this.allChildren(ownerId, child.id);
				output = output.concat(subChildren);
			}
		}

		return output;
	}

	// private async folderTree(ownerId:string, folderId:string):Promise<FolderTreeElement[]> {
	// 	const children = await this.db(this.tableName)
	// 		.select(['id', 'owner_id', 'item_id', 'parent_id', 'type'])
	// 		.where('parent_id', '=', folderId)
	// 		.andWhere('owner_id', '=', ownerId);

	// 	const output = [];

	// 	for (const child of children) {
	// 		const element:FolderTreeElement = {
	// 			item: child,
	// 		};

	// 		if (child.type === ModelType.Folder) {
	// 			element.children = await this.folderTree(ownerId, child.id);
	// 		}

	// 		output.push(element);
	// 	}

	// 	return output;
	// }

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
