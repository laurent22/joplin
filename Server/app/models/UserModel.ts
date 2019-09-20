import BaseModel from './BaseModel';
import { User } from '../db';
import FileModel from './FileModel';
import * as auth from '../utils/auth';

export default class UserModel extends BaseModel {

	tableName():string {
		return 'users';
	}

	async loadByEmail(email:string):Promise<User> {
		const user:User = { email: email };
		return this.db<User>(this.tableName()).where(user).first();
	}

	async createUser(email:string, password:string, options:User = {}):Promise<User> {
		const txIndex = await this.startTransaction();

		let user:User = {
			email: email,
			password: auth.hashPassword(password),
		};

		if ('is_admin' in options) user.is_admin = options.is_admin;

		try {
			const userModel = new UserModel();
			user = await userModel.save(user);

			const fileModel = new FileModel();
			await fileModel.createRootFile(user.id);
		} catch (error) {
			await this.rollbackTransaction(txIndex);
			throw error;
		}

		await this.commitTransaction(txIndex);

		return user;
	}

}
