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

	public async saveFileAndContent(file: File, joplinFileContent: JoplinFileContent, options: SaveOptions): Promise<File> {
		let modFile: File = { ...file };
		joplinFileContent = { ...joplinFileContent };
		delete joplinFileContent.id;

		await this.withTransaction(async () => {
			if (!('content_id' in file)) throw new Error('content_id is required');

			if (file.content_id) await this.delete(file.content_id);

			joplinFileContent = await this.save(joplinFileContent);
			delete modFile.content;
			modFile.content_id = joplinFileContent.id;
			modFile.content_type = FileContentType.JoplinItem;
			modFile = await this.models().file({ userId: modFile.owner_id }).save(modFile, options);

		}, 'saveJoplinFileContent');

		return modFile;
	}

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

	public async fileContentToItem(fileContent: JoplinFileContent): Promise<any> {
		const item = JSON.parse(fileContent.content);
		item.id = fileContent.item_id;
		item.type_ = fileContent.type;
		item.parent_id = fileContent.parent_id;
		item.encryption_applied = fileContent.encryption_applied;
		item.updated_time = fileContent.updated_time;
		item.created_time = fileContent.created_time;
		return item;
	}

}
