import BaseModel from './BaseModel';
import db, { User } from '../db';

export default class UserModel extends BaseModel {

	static tableName():string {
		return 'users';
	}

	static async loadByName(name:string):Promise<User> {
		const user:User = { name: name };
		return db<User>(this.tableName()).where(user).first();
	}

}
