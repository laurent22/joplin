import { File } from '../../db';
import BaseController from '../BaseController';
import { ErrorNotFound } from '../../utils/errors';
import { Pagination } from '../../models/utils/pagination';
import { PaginatedFiles } from '../../models/FileModel';
import { ChangePagination, PaginatedChanges } from '../../models/ChangeModel';

export default class FileController extends BaseController {

	// Note: this is only used in tests. To create files with no content
	// or directories, use postChild()
	public async postFile_(sessionId: string, file: File): Promise<File> {
		const user = await this.initSession(sessionId);
		const fileModel = this.models.file({ userId: user.id });
		let newFile = fileModel.fromApiInput(file);
		newFile = await fileModel.save(file);
		return fileModel.toApiOutput(newFile);
	}

	public async getFile(sessionId: string, fileId: string): Promise<File> {
		const user = await this.initSession(sessionId);
		const fileModel = this.models.file({ userId: user.id });
		const file: File = await fileModel.entityFromItemId(fileId);
		const loadedFile = await fileModel.load(file.id);
		if (!loadedFile) throw new ErrorNotFound();
		return fileModel.toApiOutput(loadedFile);
	}

	public async getFileContent(sessionId: string, fileId: string): Promise<File> {
		const user = await this.initSession(sessionId);
		const fileModel = this.models.file({ userId: user.id });
		let file: File = await fileModel.entityFromItemId(fileId);
		file = await fileModel.loadWithContent(file.id);
		if (!file) throw new ErrorNotFound();
		return file;
	}

	public async patchFile(sessionId: string, fileId: string, file: File): Promise<File> {
		const user = await this.initSession(sessionId);
		const fileModel = this.models.file({ userId: user.id });
		const existingFile: File = await fileModel.entityFromItemId(fileId);
		const newFile = fileModel.fromApiInput(file);
		newFile.id = existingFile.id;
		return fileModel.toApiOutput(await fileModel.save(newFile));
	}

	public async putFileContent(sessionId: string, fileId: string, content: Buffer): Promise<any> {
		if (!content) content = Buffer.alloc(0);

		const user = await this.initSession(sessionId);
		const fileModel = this.models.file({ userId: user.id });
		const file: File = await fileModel.entityFromItemId(fileId, { mustExist: false });
		file.content = content;
		return fileModel.toApiOutput(await fileModel.save(file, { validationRules: { mustBeFile: true } }));
	}

	public async deleteFileContent(sessionId: string, fileId: string): Promise<any> {
		await this.putFileContent(sessionId, fileId, null);
	}

	public async getChildren(sessionId: string, fileId: string, pagination: Pagination): Promise<PaginatedFiles> {
		const user = await this.initSession(sessionId);
		const fileModel = this.models.file({ userId: user.id });
		const parent: File = await fileModel.entityFromItemId(fileId);
		return fileModel.toApiOutput(await fileModel.childrens(parent.id, pagination));
	}

	public async postChild(sessionId: string, fileId: string, child: File): Promise<File> {
		const user = await this.initSession(sessionId);
		const fileModel = this.models.file({ userId: user.id });
		const parent: File = await fileModel.entityFromItemId(fileId);
		child = fileModel.fromApiInput(child);
		child.parent_id = parent.id;
		return fileModel.toApiOutput(await fileModel.save(child));
	}

	public async deleteFile(sessionId: string, fileId: string): Promise<void> {
		const user = await this.initSession(sessionId);
		const fileModel = this.models.file({ userId: user.id });
		try {
			const file: File = await fileModel.entityFromItemId(fileId, { mustExist: false });
			if (!file.id) return;
			await fileModel.delete(file.id);
		} catch (error) {
			if (error instanceof ErrorNotFound) {
				// That's ok - a no-op
			} else {
				throw error;
			}
		}
	}

	public async getDelta(sessionId: string, dirId: string, pagination: ChangePagination): Promise<PaginatedChanges> {
		const user = await this.initSession(sessionId);
		const fileModel = this.models.file({ userId: user.id });
		const dir: File = await fileModel.entityFromItemId(dirId, { mustExist: true });
		const changeModel = this.models.change({ userId: user.id });
		return changeModel.byDirectoryId(dir.id, pagination);
	}

}
