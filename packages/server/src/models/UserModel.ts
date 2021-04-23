import BaseModel, { AclAction, SaveOptions, ValidateOptions } from './BaseModel';
import { User } from '../db';
import * as auth from '../utils/auth';
import { ErrorUnprocessableEntity, ErrorForbidden } from '../utils/errors';

export default class UserModel extends BaseModel<User> {

	public get tableName(): string {
		return 'users';
	}

	public async loadByEmail(email: string): Promise<User> {
		const user: User = { email: email };
		return this.db<User>(this.tableName).where(user).first();
	}

	public async login(email: string, password: string): Promise<User> {
		const user = await this.loadByEmail(email);
		if (!user) return null;
		if (!auth.checkPassword(password, user.password)) return null;
		return user;
	}

	public fromApiInput(object: User): User {
		const user: User = {};

		if ('id' in object) user.id = object.id;
		if ('email' in object) user.email = object.email;
		if ('password' in object) user.password = object.password;
		if ('is_admin' in object) user.is_admin = object.is_admin;
		if ('full_name' in object) user.full_name = object.full_name;

		return user;
	}

	protected objectToApiOutput(object: User): User {
		const output: User = { ...object };
		delete output.password;
		return output;
	}

	public async checkIfAllowed(user: User, action: AclAction, resource: User = null): Promise<void> {
		if (action === AclAction.Create) {
			if (!user.is_admin) throw new ErrorForbidden('non-admin user cannot create a new user');
		}

		if (action === AclAction.Read) {
			if (user.is_admin) return;
			if (user.id !== resource.id) throw new ErrorForbidden('cannot view other users');
		}

		if (action === AclAction.Update) {
			if (!user.is_admin && resource.id !== user.id) throw new ErrorForbidden('non-admin user cannot modify another user');
			if (!user.is_admin && 'is_admin' in resource) throw new ErrorForbidden('non-admin user cannot make themselves an admin');
			if (user.is_admin && user.id === resource.id && 'is_admin' in resource && !resource.is_admin) throw new ErrorForbidden('admin user cannot make themselves a non-admin');
		}

		if (action === AclAction.Delete) {
			if (!user.is_admin) throw new ErrorForbidden('only admins can delete users');
			if (user.id === resource.id) throw new ErrorForbidden('cannot delete own user');
		}

		if (action === AclAction.List) {
			if (!user.is_admin) throw new ErrorForbidden('non-admin cannot list users');
		}
	}

	protected async validate(object: User, options: ValidateOptions = {}): Promise<User> {
		const user: User = await super.validate(object, options);

		if (options.isNew) {
			if (!user.email) throw new ErrorUnprocessableEntity('email must be set');
			if (!user.password) throw new ErrorUnprocessableEntity('password must be set');
		} else {
			if ('email' in user && !user.email) throw new ErrorUnprocessableEntity('email must be set');
			if ('password' in user && !user.password) throw new ErrorUnprocessableEntity('password must be set');
		}

		if ('email' in user) {
			const existingUser = await this.loadByEmail(user.email);
			if (existingUser && existingUser.id !== user.id) throw new ErrorUnprocessableEntity(`there is already a user with this email: ${user.email}`);
			if (!this.validateEmail(user.email)) throw new ErrorUnprocessableEntity(`Invalid email: ${user.email}`);
		}

		return super.validate(user, options);
	}

	private validateEmail(email: string): boolean {
		const s = email.split('@');
		if (s.length !== 2) return false;
		return !!s[0].length && !!s[1].length;
	}

	public async profileUrl(): Promise<string> {
		return `${this.baseUrl}/users/me`;
	}

	public async delete(id: string): Promise<void> {
		const shares = await this.models().share().sharesByUser(id);

		await this.withTransaction(async () => {
			await this.models().item().deleteExclusivelyOwnedItems(id);
			await this.models().share().delete(shares.map(s => s.id));
			await this.models().userItem().deleteByUserId(id);
			await this.models().session().deleteByUserId(id);
			await this.models().notification().deleteByUserId(id);
			await super.delete(id);
		}, 'UserModel::delete');
	}

	// Note that when the "password" property is provided, it is going to be
	// hashed automatically. It means that it is not safe to do:
	//
	//     const user = await model.load(id);
	//     await model.save(user);
	//
	// Because the password would be hashed twice.
	public async save(object: User, options: SaveOptions = {}): Promise<User> {
		const user = { ...object };
		if (user.password) user.password = auth.hashPassword(user.password);
		return super.save(user, options);
	}

}
