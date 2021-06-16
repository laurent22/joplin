import BaseModel, { AclAction, SaveOptions, ValidateOptions } from './BaseModel';
import { EmailSender, Item, User, Uuid } from '../db';
import * as auth from '../utils/auth';
import { ErrorUnprocessableEntity, ErrorForbidden, ErrorPayloadTooLarge, ErrorNotFound } from '../utils/errors';
import { ModelType } from '@joplin/lib/BaseModel';
import { _ } from '@joplin/lib/locale';
import { formatBytes, MB } from '../utils/bytes';

export enum AccountType {
	Default = 0,
	Free = 1,
	Pro = 2,
}

interface AccountTypeProperties {
	account_type: number;
	can_share: number;
	max_item_size: number;
}

export function accountTypeProperties(accountType: AccountType): AccountTypeProperties {
	const types: AccountTypeProperties[] = [
		{
			account_type: AccountType.Default,
			can_share: 1,
			max_item_size: 0,
		},
		{
			account_type: AccountType.Free,
			can_share: 0,
			max_item_size: 10 * MB,
		},
		{
			account_type: AccountType.Pro,
			can_share: 1,
			max_item_size: 200 * MB,
		},
	];

	return types.find(a => a.account_type === accountType);
}

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
		if ('max_item_size' in object) user.max_item_size = object.max_item_size;
		if ('can_share' in object) user.can_share = object.can_share;

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
			const previousResource = await this.load(resource.id);

			if (!user.is_admin && resource.id !== user.id) throw new ErrorForbidden('non-admin user cannot modify another user');
			if (!user.is_admin && 'is_admin' in resource) throw new ErrorForbidden('non-admin user cannot make themselves an admin');
			if (user.is_admin && user.id === resource.id && 'is_admin' in resource && !resource.is_admin) throw new ErrorForbidden('admin user cannot make themselves a non-admin');
			if ('max_item_size' in resource && !user.is_admin && resource.max_item_size !== previousResource.max_item_size) throw new ErrorForbidden('non-admin user cannot change max_item_size');
			if ('can_share' in resource && !user.is_admin && resource.can_share !== previousResource.can_share) throw new ErrorForbidden('non-admin user cannot change can_share');
		}

		if (action === AclAction.Delete) {
			if (!user.is_admin) throw new ErrorForbidden('only admins can delete users');
			if (user.id === resource.id) throw new ErrorForbidden('cannot delete own user');
		}

		if (action === AclAction.List) {
			if (!user.is_admin) throw new ErrorForbidden('non-admin cannot list users');
		}
	}

	public async checkMaxItemSizeLimit(user: User, buffer: Buffer, item: Item, joplinItem: any) {
		// If the item is encrypted, we apply a multipler because encrypted
		// items can be much larger (seems to be up to twice the size but for
		// safety let's go with 2.2).
		const maxSize = user.max_item_size * (item.jop_encryption_applied ? 2.2 : 1);
		if (maxSize && buffer.byteLength > maxSize) {
			const itemTitle = joplinItem ? joplinItem.title || '' : '';
			const isNote = joplinItem && joplinItem.type_ === ModelType.Note;

			throw new ErrorPayloadTooLarge(_('Cannot save %s "%s" because it is larger than than the allowed limit (%s)',
				isNote ? _('note') : _('attachment'),
				itemTitle ? itemTitle : item.name,
				formatBytes(user.max_item_size)
			));
		}
	}

	// public async checkCanShare(share:Share) {

	// 	// const itemTitle = joplinItem ? joplinItem.title || '' : '';
	// 	// const isNote = joplinItem && joplinItem.type_ === ModelType.Note;

	// 	// // If the item is encrypted, we apply a multipler because encrypted
	// 	// // items can be much larger (seems to be up to twice the size but for
	// 	// // safety let's go with 2.2).
	// 	// const maxSize = user.max_item_size * (item.jop_encryption_applied ? 2.2 : 1);
	// 	// if (maxSize && buffer.byteLength > maxSize) {
	// 	// 	throw new ErrorPayloadTooLarge(_('Cannot save %s "%s" because it is larger than than the allowed limit (%s)',
	// 	// 		isNote ? _('note') : _('attachment'),
	// 	// 		itemTitle ? itemTitle : name,
	// 	// 		prettyBytes(user.max_item_size)
	// 	// 	));
	// 	// }
	// }

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

	public profileUrl(): string {
		return `${this.baseUrl}/users/me`;
	}

	public confirmUrl(userId: Uuid, validationToken: string): string {
		return `${this.baseUrl}/users/${userId}/confirm?token=${validationToken}`;
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

	public async confirmEmail(userId: Uuid, token: string) {
		await this.models().token().checkToken(userId, token);
		const user = await this.models().user().load(userId);
		if (!user) throw new ErrorNotFound('No such user');
		await this.save({ id: user.id, email_confirmed: 1 });
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

		const isNew = await this.isNew(object, options);

		return this.withTransaction(async () => {
			const savedUser = await super.save(user, options);

			if (isNew) {
				const validationToken = await this.models().token().generate(savedUser.id);
				const confirmUrl = encodeURI(this.confirmUrl(savedUser.id, validationToken));

				await this.models().email().push({
					sender_id: EmailSender.NoReply,
					recipient_id: savedUser.id,
					recipient_email: savedUser.email,
					recipient_name: savedUser.full_name || '',
					subject: `Please setup your ${this.appName} account`,
					body: `Your new ${this.appName} account has been created!\n\nPlease click on the following link to complete the creation of your account:\n\n[Complete your account](${confirmUrl})`,
				});
			}

			UserModel.eventEmitter.emit('created');

			return savedUser;
		});
	}

}
