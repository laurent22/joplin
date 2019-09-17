import BaseModel from './BaseModel';
import db, { User } from '../db';
import FileModel from './FileModel';
import * as auth from '../utils/auth';

export default class UserModel extends BaseModel {

	static tableName():string {
		return 'users';
	}

	static async loadByEmail(email:string):Promise<User> {
		const user:User = { email: email };
		return db<User>(this.tableName()).where(user).first();
	}

	static async createUser(email:string, password:string):Promise<User> {
		let user:User = {
			email: email,
			password: auth.hashPassword(password),
		};

		user = await UserModel.save(user);

		await FileModel.createFile(user.id, {
			is_directory: 1,
			name: '',
		});

		return user;
	}

}
