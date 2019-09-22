import BaseModel, { SaveOptions } from './BaseModel';
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

	async fromApiInput(object:User):Promise<User> {
		const user:User = {};

		if ('email' in object) user.email = object.email;
		if ('password' in object) user.password = object.password;
		if ('is_admin' in object) user.is_admin = object.is_admin;

		return user;
	}

	toApiOutput(object:User):User {
		const output:User = { ...object };
		delete output.password;
		return output;
	}

	async save(object:User, options:SaveOptions = {}):Promise<User> {
		const txIndex = await this.startTransaction();

		const isNew = this.isNew(object, options);

		let newUser = {...object};

		if (isNew) newUser.password = auth.hashPassword(newUser.password);

		// TODO: password can't be empty
		// TODO: email can't be empty

		try {
			newUser = await super.save(newUser);

			const fileModel = new FileModel({ userId: newUser.id });
			await fileModel.createRootFile();
		} catch (error) {
			await this.rollbackTransaction(txIndex);
			throw error;
		}

		await this.commitTransaction(txIndex);

		return newUser;
	}

}
