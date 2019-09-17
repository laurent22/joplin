import BaseModel from './BaseModel';
import db, { File } from '../db';

export default class FileModel extends BaseModel {

	static tableName():string {
		return 'files';
	}

	static async userRootFile(userId:string):Promise<File> {
		// TODO: create multiple users
		// TODO: create function to create user, root file and permissions

		const r = await db(this.tableName()).select('*').from(this.tableName()).leftJoin('permissions', 'permissions.file_id', 'files.id').where({
			'parent_id': '',
			'user_id': userId,
		});

		console.info('xxxxx',r);

		const f:File = {};
		return f;
		//return db<File>(this.tableName()).where({ user_id: userId, parent_id: '' }).first();
	}

}
