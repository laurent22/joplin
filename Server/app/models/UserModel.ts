import BaseModel, { SaveOptions, ValidateOptions } from './BaseModel';
import { User } from '../db';
import FileModel from './FileModel';
import * as auth from '../utils/auth';
import { ErrorUnprocessableEntity, ErrorForbidden } from '../utils/errors';

export default class UserModel extends BaseModel {

	get tableName():string {
		return 'users';
	}

	async loadByEmail(email:string):Promise<User> {
		const user:User = { email: email };
		return this.db<User>(this.tableName).where(user).first();
	}

	async fromApiInput(object:User):Promise<User> {
		const user:User = {};

		if ('id' in object) user.id = object.id;
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

	async validate(object:User, options:ValidateOptions = {}):Promise<User> {
		const user:User = await super.validate(object, options);

		const owner:User = await this.load(this.userId);

		if (options.isNew) {
			if (!owner.is_admin) throw new ErrorForbidden('non-admin user cannot create a new user');
			if (!user.email) throw new ErrorUnprocessableEntity('email must be set');
			if (!user.password) throw new ErrorUnprocessableEntity('password must be set');
		} else {
			if (!owner.is_admin && user.id !== owner.id) throw new ErrorForbidden('non-admin user cannot modify another user');
			if ('email' in user && !user.email) throw new ErrorUnprocessableEntity('email must be set');
			if ('password' in user && !user.password) throw new ErrorUnprocessableEntity('password must be set');
			if (!owner.is_admin && 'is_admin' in user) throw new ErrorForbidden('non-admin user cannot make a user an admin');
			if (owner.is_admin && owner.id === user.id && 'is_admin' in user && !user.is_admin) throw new ErrorUnprocessableEntity('non-admin user cannot remove admin bit from themselves');
		}

		if ('email' in user) {
			const existingUser = await this.loadByEmail(user.email);
			if (existingUser && existingUser.id !== user.id) throw new ErrorUnprocessableEntity(`there is already a user with this email: ${user.email}`);
		}

		return user;
	}

	async checkIsOwnerOrAdmin(userId:string):Promise<void> {
		if (!this.userId) throw new ErrorForbidden('no user is active');

		if (userId === this.userId) return;

		const owner = await this.load(this.userId);
		if (!owner.is_admin) throw new ErrorForbidden();
	}

	async load(id:string):Promise<User> {
		await this.checkIsOwnerOrAdmin(id);
		return super.load(id);
	}

	async delete(id:string):Promise<void> {
		await this.checkIsOwnerOrAdmin(id);

		const txIndex = await this.startTransaction();

		try {
			const fileModel = new FileModel({ userId: this.userId });
			const rootFile = await fileModel.userRootFile();
			await fileModel.delete(rootFile.id);
			await super.delete(id);
		} catch (error) {
			await this.rollbackTransaction(txIndex);
			throw error;
		}

		await this.commitTransaction(txIndex);
	}

	async save(object:User, options:SaveOptions = {}):Promise<User> {
		const txIndex = await this.startTransaction();

		const isNew = await this.isNew(object, options);

		let newUser = {...object};

		if (isNew && newUser.password) newUser.password = auth.hashPassword(newUser.password);

		try {
			newUser = await super.save(newUser, options);

			if (isNew) {
				const fileModel = new FileModel({ userId: newUser.id });
				await fileModel.createRootFile();
			}
		} catch (error) {
			await this.rollbackTransaction(txIndex);
			throw error;
		}

		await this.commitTransaction(txIndex);

		return newUser;
	}

}
