import { File, ItemId } from '../db';
import FileModel from '../models/FileModel';
import BaseController from './BaseController';
import { removeFilePathPrefix } from '../utils/routeUtils';

export default class FileController extends BaseController {

	async createFile(sessionId:string, file:File):Promise<File> {
		const user = await this.initSession(sessionId);
		const fileModel = new FileModel({ userId: user.id });
		let newFile = await fileModel.fromApiInput(file);
		newFile = await fileModel.save(file);
		return fileModel.toApiOutput(newFile);
	}

	async getFile(sessionId:string, fileId:string | ItemId):Promise<File> {
		const user = await this.initSession(sessionId);
		const fileModel = new FileModel({ userId: user.id });
		return fileModel.toApiOutput(await fileModel.load(fileId));
	}

	async getFileContent(sessionId:string, fileId:string | ItemId):Promise<File> {
		const user = await this.initSession(sessionId);
		const fileModel = new FileModel({ userId: user.id });
		const file:File = await fileModel.loadWithContent(fileId);
		return file;
	}

	async getAll(sessionId:string, parentId:string = ''):Promise<File[]> {
		const user = await this.initSession(sessionId);
		const fileModel = new FileModel({ userId: user.id });
		return fileModel.allByParent(parentId);
	}

	async updateFile(sessionId:string, file:File):Promise<void> {
		const user = await this.initSession(sessionId);
		const fileModel = new FileModel({ userId: user.id });
		const newFile = await fileModel.fromApiInput(file);
		await fileModel.save(newFile);
	}

	async updateFileContent(sessionId:string, fileId:string | ItemId, content:any):Promise<any> {
		const user = await this.initSession(sessionId);
		const fileModel = new FileModel({ userId: user.id });
		const file:File = await fileModel.entityFromItemId(fileId);
		return fileModel.save(file);
	}

	async deleteFile(sessionId:string, fileId:string | ItemId):Promise<void> {
		const user = await this.initSession(sessionId);
		const fileModel = new FileModel({ userId: user.id });
		await fileModel.delete(fileId);
	}

}
