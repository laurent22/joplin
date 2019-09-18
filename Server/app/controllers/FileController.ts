import { File } from '../db';
import FileModel from '../models/FileModel';
import BaseController from './BaseController';

export default class FileController extends BaseController {

	async createFile(sessionId:string, file:File):Promise<File> {
		const fileModel = new FileModel();
		const user = await this.initSession(sessionId);
		return fileModel.createFile(user.id, file);
	}

}
