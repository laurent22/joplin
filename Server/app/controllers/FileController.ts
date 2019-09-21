import { File } from '../db';
import FileModel from '../models/FileModel';
import BaseController from './BaseController';

export default class FileController extends BaseController {

	async createFile(sessionId:string, file:File):Promise<File> {
		const fileModel = new FileModel();
		const user = await this.initSession(sessionId);
		const newFile = await fileModel.createFile(user.id, file);
		return fileModel.toApiOutput(newFile);
	}

	async getFile(sessionId:string, fileId:string):Promise<File> {
		await this.initSession(sessionId);
		const fileModel = new FileModel();
		return fileModel.toApiOutput(await fileModel.load(fileId));
	}

	async updateFile(sessionId:string, fileId:string, file:File):Promise<void> {
		await this.initSession(sessionId);
		const fileModel = new FileModel();
		const newFile = fileModel.objectToEntity(file);
		newFile.id = fileId;
		await fileModel.save(newFile);
	}

}
