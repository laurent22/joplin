import { User, File, Permission, ItemType } from '../db';
import { ErrorForbidden } from '../utils/errors';
import FileModel from '../models/FileModel';
import PermissionModel from '../models/PermissionModel';
import BaseController from './BaseController';

export default class FileController extends BaseController {

	async createFile(sessionId:string, file:File):Promise<File> {
		const user:User = await this.initSession(sessionId);

		const invalidParentError = new ErrorForbidden('Invalid parent ID or no permission to write to it: ' + file.parent_id);

		let parentFile:File;
		try {
			parentFile = await FileModel.load(file.parent_id);
			if (!parentFile) throw invalidParentError;
		} catch (error) {
			throw invalidParentError;
		}

		const canWrite:boolean = await PermissionModel.canWrite(user.id, parentFile.id);
		if (!canWrite) throw invalidParentError;

		// TODO: in a transaction

		const newFile:File = await FileModel.save(file);

		const permission:Permission = {
			user_id: user.id,
			is_owner: 1,
			item_type: ItemType.File,
			item_id: newFile.id,
		};

		await PermissionModel.save(permission);

		return newFile;
	}

}
