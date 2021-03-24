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
			// For now will always overwrite the complete content with the new one
			await this.delete(joplinFileContent.id, { allowNoOp: true });
			await this.save(joplinFileContent, { isNew: true });
			delete modFile.content;
			modFile.content_id = joplinFileContent.id;
			modFile.content_type = FileContentType.JoplinItem;
			modFile = await this.models().file({ userId: this.userId }).save(modFile, options);
		}, 'saveJoplinFileContent');

		return modFile;
	}

}
