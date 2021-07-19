import BaseModel, { AclAction, SaveOptions, ValidateOptions } from './BaseModel';
import { EmailSender, Item, User, Uuid } from '../db';
import * as auth from '../utils/auth';
import { ErrorUnprocessableEntity, ErrorForbidden, ErrorPayloadTooLarge, ErrorNotFound } from '../utils/errors';
import { ModelType } from '@joplin/lib/BaseModel';
import { _ } from '@joplin/lib/locale';
import { formatBytes, GB, MB } from '../utils/bytes';
import { itemIsEncrypted } from '../utils/joplinUtils';
import { getMaxItemSize, getMaxTotalItemSize } from './utils/user';
import * as zxcvbn from 'zxcvbn';
import { confirmUrl, resetPasswordUrl } from '../utils/urlUtils';
import { checkRepeatPassword, CheckRepeatPasswordInput } from '../routes/index/users';
import accountConfirmationTemplate from '../views/emails/accountConfirmationTemplate';
import resetPasswordTemplate from '../views/emails/resetPasswordTemplate';

export enum AccountType {
	Default = 0,
	Basic = 1,
	Pro = 2,
}

export interface Account {
	account_type: number;
	can_share_folder: number;
	max_item_size: number;
	max_total_item_size: number;
}

interface AccountTypeSelectOptions {
	value: number;
	label: string;
}

export function accountByType(accountType: AccountType): Account {
	const types: Account[] = [
		{
			account_type: AccountType.Default,
			can_share_folder: 1,
			max_item_size: 0,
			max_total_item_size: 0,
		},
		{
			account_type: AccountType.Basic,
			can_share_folder: 0,
			max_item_size: 10 * MB,
			max_total_item_size: 1 * GB,
		},
		{
			account_type: AccountType.Pro,
			can_share_folder: 1,
			max_item_size: 200 * MB,
			max_total_item_size: 10 * GB,
		},
	];

	const type = types.find(a => a.account_type === accountType);
	if (!type) throw new Error(`Invalid account type: ${accountType}`);
	return type;
}

export function accountTypeOptions(): AccountTypeSelectOptions[] {
	return [
		{
			value: AccountType.Default,
			label: accountTypeToString(AccountType.Default),
		},
		{
			value: AccountType.Basic,
			label: accountTypeToString(AccountType.Basic),
		},
		{
			value: AccountType.Pro,
			label: accountTypeToString(AccountType.Pro),
		},
	];
}

export function accountTypeToString(accountType: AccountType): string {
	if (accountType === AccountType.Default) return 'Default';
	if (accountType === AccountType.Basic) return 'Basic';
	if (accountType === AccountType.Pro) return 'Pro';
	throw new Error(`Invalid type: ${accountType}`);
}

export default class UserModel extends BaseModel<User> {

	public get tableName(): string {
		return 'users';
	}

	public async loadByEmail(email: string): Promise<User> {
		const user: User = this.formatValues({ email: email });
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
		if ('max_total_item_size' in object) user.max_total_item_size = object.max_total_item_size;
		if ('can_share_folder' in object) user.can_share_folder = object.can_share_folder;
		if ('account_type' in object) user.account_type = object.account_type;
		if ('must_set_password' in object) user.must_set_password = object.must_set_password;

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
			if (user.is_admin && user.id === resource.id && 'is_admin' in resource && !resource.is_admin) throw new ErrorForbidden('admin user cannot make themselves a non-admin');

			const canBeChangedByNonAdmin = [
				'full_name',
				'password',
			];

			for (const key of Object.keys(resource)) {
				if (!user.is_admin && !canBeChangedByNonAdmin.includes(key) && (resource as any)[key] !== (previousResource as any)[key]) {
					throw new ErrorForbidden(`non-admin user cannot change "${key}"`);
				}
			}
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

		const itemSize = buffer.byteLength;
		const itemTitle = joplinItem ? joplinItem.title || '' : '';
		const isNote = joplinItem && joplinItem.type_ === ModelType.Note;

		const maxItemSize = getMaxItemSize(user);
		const maxSize = maxItemSize * (itemIsEncrypted(item) ? 2.2 : 1);
		if (maxSize && itemSize > maxSize) {
			throw new ErrorPayloadTooLarge(_('Cannot save %s "%s" because it is larger than than the allowed limit (%s)',
				isNote ? _('note') : _('attachment'),
				itemTitle ? itemTitle : item.name,
				formatBytes(maxItemSize)
			));
		}

		// Also apply a multiplier to take into account E2EE overhead
		const maxTotalItemSize = getMaxTotalItemSize(user) * 1.5;
		if (maxTotalItemSize && user.total_item_size + itemSize >= maxTotalItemSize) {
			throw new ErrorPayloadTooLarge(_('Cannot save %s "%s" because it would go over the total allowed size (%s) for this account',
				isNote ? _('note') : _('attachment'),
				itemTitle ? itemTitle : item.name,
				formatBytes(maxTotalItemSize)
			));
		}
	}

	private validatePassword(password: string) {
		const result = zxcvbn(password);
		if (result.score < 3) {
			let msg: string[] = [result.feedback.warning];
			if (result.feedback.suggestions) {
				msg = msg.concat(result.feedback.suggestions);
			}
			throw new ErrorUnprocessableEntity(msg.join(' '));
		}
	}

	protected async validate(object: User, options: ValidateOptions = {}): Promise<User> {
		const user: User = await super.validate(object, options);

		// Note that we don't validate the password here because it's already
		// been hashed by then.
		if (options.isNew) {
			if (!user.email) throw new ErrorUnprocessableEntity('email must be set');
			if (!user.password && !user.must_set_password) throw new ErrorUnprocessableEntity('password must be set');
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

	public async sendAccountConfirmationEmail(user: User) {
		const validationToken = await this.models().token().generate(user.id);
		const url = encodeURI(confirmUrl(user.id, validationToken));

		await this.models().email().push({
			...accountConfirmationTemplate({ url }),
			sender_id: EmailSender.NoReply,
			recipient_id: user.id,
			recipient_email: user.email,
			recipient_name: user.full_name || '',
		});
	}

	public async sendResetPasswordEmail(email: string) {
		const user = await this.loadByEmail(email);
		if (!user) throw new ErrorNotFound(`No such user: ${email}`);

		const validationToken = await this.models().token().generate(user.id);
		const url = resetPasswordUrl(validationToken);

		await this.models().email().push({
			...resetPasswordTemplate({ url }),
			sender_id: EmailSender.NoReply,
			recipient_id: user.id,
			recipient_email: user.email,
			recipient_name: user.full_name || '',
		});
	}

	public async resetPassword(token: string, fields: CheckRepeatPasswordInput) {
		checkRepeatPassword(fields, true);
		const user = await this.models().token().userFromToken(token);
		await this.models().user().save({ id: user.id, password: fields.password });
		await this.models().token().deleteByValue(user.id, token);
	}

	private formatValues(user: User): User {
		const output: User = { ...user };
		if ('email' in output) output.email = user.email.trim().toLowerCase();
		return output;
	}

	// Note that when the "password" property is provided, it is going to be
	// hashed automatically. It means that it is not safe to do:
	//
	//     const user = await model.load(id);
	//     await model.save(user);
	//
	// Because the password would be hashed twice.
	public async save(object: User, options: SaveOptions = {}): Promise<User> {
		const user = this.formatValues(object);

		if (user.password) {
			if (!options.skipValidation) this.validatePassword(user.password);
			user.password = auth.hashPassword(user.password);
		}

		const isNew = await this.isNew(object, options);

		return this.withTransaction(async () => {
			const savedUser = await super.save(user, options);

			if (isNew) {
				await this.sendAccountConfirmationEmail(savedUser);
			}

			if (isNew) UserModel.eventEmitter.emit('created');

			return savedUser;
		});
	}

}
