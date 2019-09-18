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
		const transactionHandler = await this.transactionHandler(this.dbOptions);

		let user:User = {
			email: email,
			password: auth.hashPassword(password),
		};

		if ('is_admin' in options) user.is_admin = options.is_admin;

		try {
			const userModel = new UserModel(transactionHandler.dbOptions);
			user = await userModel.save(user);

			const fileModel = new FileModel(transactionHandler.dbOptions);
			await fileModel.createRootFile(user.id);
		} catch (error) {
			transactionHandler.onError(error);
		}

		transactionHandler.onSuccess();

		return user;
	}

}
