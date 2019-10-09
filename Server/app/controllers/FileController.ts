import { File } from '../db';
import FileModel from '../models/FileModel';
import BaseController from './BaseController';
import { ErrorNotFound } from '../utils/errors';

export default class FileController extends BaseController {


	// Note: this is only used in tests. To create files with no content
	// or directories, use postChild()
	async postFile_(sessionId:string, file:File):Promise<File> {
		const user = await this.initSession(sessionId);
		const fileModel = new FileModel({ userId: user.id });
		let newFile = await fileModel.fromApiInput(file);
		newFile = await fileModel.save(file);
		return fileModel.toApiOutput(newFile);
	}

	async getFile(sessionId:string, fileId:string):Promise<File> {
		const user = await this.initSession(sessionId);
		const fileModel = new FileModel({ userId: user.id });
		const file:File = await fileModel.entityFromItemId(fileId);
		const loadedFile = await fileModel.load(file.id);
		if (!loadedFile) throw new ErrorNotFound();
		return fileModel.toApiOutput(loadedFile);
	}

	async getFileContent(sessionId:string, fileId:string):Promise<File> {
		const user = await this.initSession(sessionId);
		const fileModel = new FileModel({ userId: user.id });
		let file:File = await fileModel.entityFromItemId(fileId);
		file = await fileModel.loadWithContent(file.id);
		if (!file) throw new ErrorNotFound();
		return file;
	}

	async getAll(sessionId:string, parentId:string = ''):Promise<File[]> {
		const user = await this.initSession(sessionId);
		const fileModel = new FileModel({ userId: user.id });
		return fileModel.allByParent(parentId);
	}

	async patchFile(sessionId:string, fileId:string, file:File):Promise<void> {
		const user = await this.initSession(sessionId);
		const fileModel = new FileModel({ userId: user.id });
		const existingFile:File = await fileModel.entityFromItemId(fileId);
		const newFile = await fileModel.fromApiInput(file);
		newFile.id = existingFile.id;
		await fileModel.toApiOutput(await fileModel.save(newFile));
	}

	async putFileContent(sessionId:string, fileId:string, content:Buffer):Promise<any> {
		if (!content) content = Buffer.alloc(0);

		const user = await this.initSession(sessionId);
		const fileModel = new FileModel({ userId: user.id });
		const file:File = await fileModel.entityFromItemId(fileId, { mustExist: false });
		file.content = content;
		return fileModel.toApiOutput(await fileModel.save(file, { validationRules: { mustBeFile: true } }));
	}

	async getChildren(sessionId:string, fileId:string):Promise<File[]> {
		const user = await this.initSession(sessionId);
		const fileModel = new FileModel({ userId: user.id });
		const parent:File = await fileModel.entityFromItemId(fileId);
		return fileModel.toApiOutput(await fileModel.childrens(parent.id));
	}

	async postChild(sessionId:string, fileId:string, child:File):Promise<File> {
		const user = await this.initSession(sessionId);
		const fileModel = new FileModel({ userId: user.id });
		const parent:File = await fileModel.entityFromItemId(fileId);
		child = await fileModel.fromApiInput(child);
		child.parent_id = parent.id;
		return fileModel.toApiOutput(await fileModel.save(child));
	}

	async deleteFile(sessionId:string, fileId:string):Promise<void> {
		const user = await this.initSession(sessionId);
		const fileModel = new FileModel({ userId: user.id });
		try {
			const file:File = await fileModel.entityFromItemId(fileId, { mustExist: false });
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

}
