import BaseModel, { AclAction, SaveOptions, ValidateOptions } from './BaseModel';
import { EmailSender, Item, NotificationLevel, Subscription, User, UserFlagType, Uuid } from '../services/database/types';
import * as auth from '../utils/auth';
import { ErrorUnprocessableEntity, ErrorForbidden, ErrorPayloadTooLarge, ErrorNotFound, ErrorBadRequest } from '../utils/errors';
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
import { betaStartSubUrl, betaUserDateRange, betaUserTrialPeriodDays, isBetaUser, stripeConfig } from '../utils/stripe';
import endOfBetaTemplate from '../views/emails/endOfBetaTemplate';
import Logger from '@joplin/lib/Logger';
import { PublicPrivateKeyPair } from '@joplin/lib/services/e2ee/ppk';
import paymentFailedUploadDisabledTemplate from '../views/emails/paymentFailedUploadDisabledTemplate';
import oversizedAccount1 from '../views/emails/oversizedAccount1';
import oversizedAccount2 from '../views/emails/oversizedAccount2';
import dayjs = require('dayjs');
import { failedPaymentFinalAccount } from './SubscriptionModel';
import { Day } from '../utils/time';
import paymentFailedAccountDisabledTemplate from '../views/emails/paymentFailedAccountDisabledTemplate';
import changeEmailConfirmationTemplate from '../views/emails/changeEmailConfirmationTemplate';
import changeEmailNotificationTemplate from '../views/emails/changeEmailNotificationTemplate';
import { NotificationKey } from './NotificationModel';
import prettyBytes = require('pretty-bytes');
import { Env } from '../utils/types';

const logger = Logger.create('UserModel');

interface UserEmailDetails {
	sender_id: EmailSender;
	recipient_id: Uuid;
	recipient_email: string;
	recipient_name: string;
}

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
		if ('can_upload' in object) user.can_upload = object.can_upload;
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
				'email',
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
		// If the item is encrypted, we apply a multiplier because encrypted
		// items can be much larger (seems to be up to twice the size but for
		// safety let's go with 2.2).

		const itemSize = buffer.byteLength;
		const itemTitle = joplinItem ? joplinItem.title || '' : '';
		const isNote = joplinItem && joplinItem.type_ === ModelType.Note;

		const maxItemSize = getMaxItemSize(user);
		const maxSize = maxItemSize * (itemIsEncrypted(item) ? 2.2 : 1);

		if (itemSize > 200000000) {
			logger.info(`Trying to upload large item: ${JSON.stringify({
				userId: user.id,
				itemName: item.name,
				itemSize,
				maxItemSize,
				maxSize,
			}, null, '    ')}`);
		}

		if (maxSize && itemSize > maxSize) {
			throw new ErrorPayloadTooLarge(_('Cannot save %s "%s" because it is larger than the allowed limit (%s)',
				isNote ? _('note') : _('attachment'),
				itemTitle ? itemTitle : item.name,
				formatBytes(maxItemSize)
			));
		}

		if (itemSize > this.itemSizeHardLimit) throw new ErrorPayloadTooLarge(`Uploading items larger than ${prettyBytes(this.itemSizeHardLimit)} is currently disabled`);

		// We allow lock files to go through so that sync can happen, which in
		// turns allow user to fix oversized account by deleting items.
		const isWhiteListed = itemSize < 200 && item.name.startsWith('locks/');

		if (!isWhiteListed) {
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
	}

	private validatePassword(password: string) {
		if (this.env === Env.Dev) return;

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

	// public async delete(id: string): Promise<void> {
	// 	const shares = await this.models().share().sharesByUser(id);

	// 	await this.withTransaction(async () => {
	// 		await this.models().item().deleteExclusivelyOwnedItems(id);
	// 		await this.models().share().delete(shares.map(s => s.id));
	// 		await this.models().userItem().deleteByUserId(id);
	// 		await this.models().session().deleteByUserId(id);
	// 		await this.models().notification().deleteByUserId(id);
	// 		await super.delete(id);
	// 	}, 'UserModel::delete');
	// }

	private async confirmEmail(user: User) {
		await this.save({ id: user.id, email_confirmed: 1 });
	}

	// eslint-disable-next-line @typescript-eslint/ban-types -- Old code before rule was applied
	public async processEmailConfirmation(userId: Uuid, token: string, beforeChangingEmailHandler: Function) {
		await this.models().token().checkToken(userId, token);
		const user = await this.models().user().load(userId);
		if (!user) throw new ErrorNotFound('No such user');

		const newEmail = await this.models().keyValue().value(`newEmail::${userId}`);
		if (newEmail) {
			await beforeChangingEmailHandler(newEmail);
			await this.completeEmailChange(user);
		} else {
			await this.confirmEmail(user);
		}
	}

	public async initiateEmailChange(userId: Uuid, newEmail: string) {
		const beforeSaveUser = await this.models().user().load(userId);

		await this.models().notification().add(userId, NotificationKey.Any, NotificationLevel.Important, 'A confirmation email has been sent to your new address. Please follow the link in that email to confirm. Your email will only be updated after that.');

		await this.models().keyValue().setValue(`newEmail::${userId}`, newEmail);

		await this.models().user().sendChangeEmailConfirmationEmail(newEmail, beforeSaveUser);
		await this.models().user().sendChangeEmailNotificationEmail(beforeSaveUser.email, beforeSaveUser);
	}

	public async completeEmailChange(user: User) {
		const newEmailKey = `newEmail::${user.id}`;
		const newEmail = await this.models().keyValue().value<string>(newEmailKey);

		const oldEmail = user.email;

		const userToSave: User = {
			id: user.id,
			email_confirmed: 1,
			email: newEmail,
		};

		await this.withTransaction(async () => {
			if (newEmail) {
				// We keep the old email just in case. Probably yagni but it's easy enough to do.
				await this.models().keyValue().setValue(`oldEmail::${user.id}_${Date.now()}`, oldEmail);
				await this.models().keyValue().deleteValue(newEmailKey);
			}
			await this.save(userToSave);
		}, 'UserModel::confirmEmail');

		logger.info(`Changed email of user ${user.id} from "${oldEmail}" to "${newEmail}"`);
	}

	private userEmailDetails(user: User): UserEmailDetails {
		return {
			sender_id: EmailSender.NoReply,
			recipient_id: user.id,
			recipient_email: user.email,
			recipient_name: user.full_name || '',
		};
	}

	public async sendAccountConfirmationEmail(user: User) {
		const validationToken = await this.models().token().generate(user.id);
		const url = encodeURI(confirmUrl(user.id, validationToken));

		await this.models().email().push({
			...accountConfirmationTemplate({ url }),
			...this.userEmailDetails(user),
		});
	}

	public async sendChangeEmailConfirmationEmail(recipientEmail: string, user: User) {
		const validationToken = await this.models().token().generate(user.id);
		const url = encodeURI(confirmUrl(user.id, validationToken));

		await this.models().email().push({
			...changeEmailConfirmationTemplate({ url }),
			...this.userEmailDetails(user),
			recipient_email: recipientEmail,
		});
	}
	public async sendChangeEmailNotificationEmail(recipientEmail: string, user: User) {
		await this.models().email().push({
			...changeEmailNotificationTemplate(),
			...this.userEmailDetails(user),
			recipient_email: recipientEmail,
		});
	}

	public async sendResetPasswordEmail(email: string) {
		const user = await this.loadByEmail(email);
		if (!user) throw new ErrorNotFound(`No such user: ${email}`);

		const validationToken = await this.models().token().generate(user.id);
		const url = resetPasswordUrl(validationToken);

		await this.models().email().push({
			...resetPasswordTemplate({ url }),
			...this.userEmailDetails(user),
		});
	}

	public async resetPassword(token: string, fields: CheckRepeatPasswordInput) {
		checkRepeatPassword(fields, true);
		const user = await this.models().token().userFromToken(token);

		await this.withTransaction(async () => {
			await this.models().user().save({ id: user.id, password: fields.password });
			await this.models().session().deleteByUserId(user.id);
			await this.models().token().deleteByValue(user.id, token);
		}, 'UserModel::resetPassword');
	}

	public async handleBetaUserEmails() {
		if (!stripeConfig().enabled) return;

		const range = betaUserDateRange();

		const betaUsers = await this
			.db('users')
			.select(['id', 'email', 'full_name', 'account_type', 'created_time'])
			.where('created_time', '>=', range[0])
			.andWhere('created_time', '<=', range[1]);

		const reminderIntervals = [14, 3, 0];

		for (const user of betaUsers) {
			if (!(await isBetaUser(this.models(), user.id))) continue;

			const remainingDays = betaUserTrialPeriodDays(user.created_time, 0, 0);

			for (const reminderInterval of reminderIntervals) {
				if (remainingDays <= reminderInterval) {
					const sentKey = `betaUser::emailSent::${reminderInterval}::${user.id}`;

					if (!(await this.models().keyValue().value(sentKey))) {
						await this.models().email().push({
							...endOfBetaTemplate({
								expireDays: remainingDays,
								startSubUrl: betaStartSubUrl(user.email, user.account_type),
							}),
							...this.userEmailDetails(user),
						});

						await this.models().keyValue().setValue(sentKey, 1);
					}
				}
			}

			if (remainingDays <= 0) {
				await this.models().userFlag().add(user.id, UserFlagType.AccountWithoutSubscription);
			}
		}
	}

	public async handleFailedPaymentSubscriptions() {
		interface SubInfo {
			subs: Subscription[];
			// eslint-disable-next-line @typescript-eslint/ban-types -- Old code before rule was applied
			templateFn: Function;
			emailKeyPrefix: string;
			flagType: UserFlagType;
		}

		const subInfos: SubInfo[] = [
			{
				subs: await this.models().subscription().failedPaymentWarningSubscriptions(),
				emailKeyPrefix: 'payment_failed_upload_disabled_',
				flagType: UserFlagType.FailedPaymentWarning,
				templateFn: () => paymentFailedUploadDisabledTemplate({ disabledInDays: Math.round(failedPaymentFinalAccount / Day) }),
			},
			{
				subs: await this.models().subscription().failedPaymentFinalSubscriptions(),
				emailKeyPrefix: 'payment_failed_account_disabled_',
				flagType: UserFlagType.FailedPaymentFinal,
				templateFn: () => paymentFailedAccountDisabledTemplate(),
			},
		];

		let users: User[] = [];
		for (const subInfo of subInfos) {
			users = users.concat(await this.loadByIds(subInfo.subs.map(s => s.user_id)));
		}

		await this.withTransaction(async () => {
			for (const subInfo of subInfos) {
				for (const sub of subInfo.subs) {
					const user = users.find(u => u.id === sub.user_id);
					if (!user) {
						logger.error(`Could not find user for subscription ${sub.id}`);
						continue;
					}

					const existingFlag = await this.models().userFlag().byUserId(user.id, subInfo.flagType);

					if (!existingFlag) {
						await this.models().userFlag().add(user.id, subInfo.flagType);

						await this.models().email().push({
							...subInfo.templateFn(),
							...this.userEmailDetails(user),
							key: `${subInfo.emailKeyPrefix}${sub.last_payment_failed_time}`,
						});
					}
				}
			}
		}, 'UserModel::handleFailedPaymentSubscriptions');
	}

	public async handleOversizedAccounts() {
		const alertLimit1 = 0.8;
		const alertLimitMax = 1;

		const basicAccount = accountByType(AccountType.Basic);
		const proAccount = accountByType(AccountType.Pro);
		const basicDefaultLimit1 = Math.round(alertLimit1 * basicAccount.max_total_item_size);
		const proDefaultLimit1 = Math.round(alertLimit1 * proAccount.max_total_item_size);
		const basicDefaultLimitMax = Math.round(alertLimitMax * basicAccount.max_total_item_size);
		const proDefaultLimitMax = Math.round(alertLimitMax * proAccount.max_total_item_size);

		// ------------------------------------------------------------------------
		// First, find all the accounts that are over the limit and send an
		// email to the owner. Also flag accounts that are over 100% full.
		// ------------------------------------------------------------------------

		const users: User[] = await this
			.db(this.tableName)
			.select(['id', 'total_item_size', 'max_total_item_size', 'account_type', 'email', 'full_name'])
			.where(function() {
				void this.whereRaw('total_item_size > ? AND account_type = ?', [basicDefaultLimit1, AccountType.Basic])
					.orWhereRaw('total_item_size > ? AND account_type = ?', [proDefaultLimit1, AccountType.Pro]);
			})
			// Users who are disabled or who cannot upload already received the
			// notification.
			.andWhere('enabled', '=', 1)
			.andWhere('can_upload', '=', 1);

		const makeEmailKey = (user: User, alertLimit: number): string => {
			return [
				'oversizedAccount',
				user.account_type,
				alertLimit * 100,
				// Also add the month/date to the key so that we don't send more than one email a month
				dayjs(Date.now()).format('MMYY'),
			].join('::');
		};

		await this.withTransaction(async () => {
			for (const user of users) {
				const maxTotalItemSize = getMaxTotalItemSize(user);
				const account = accountByType(user.account_type);

				if (user.total_item_size > maxTotalItemSize * alertLimitMax) {
					await this.models().email().push({
						...oversizedAccount2({
							percentLimit: alertLimitMax * 100,
							url: this.baseUrl,
						}),
						...this.userEmailDetails(user),
						sender_id: EmailSender.Support,
						key: makeEmailKey(user, alertLimitMax),
					});

					await this.models().userFlag().add(user.id, UserFlagType.AccountOverLimit);
				} else if (maxTotalItemSize > account.max_total_item_size * alertLimit1) {
					await this.models().email().push({
						...oversizedAccount1({
							percentLimit: alertLimit1 * 100,
							url: this.baseUrl,
						}),
						...this.userEmailDetails(user),
						sender_id: EmailSender.Support,
						key: makeEmailKey(user, alertLimit1),
					});
				}
			}
		}, 'UserModel::handleOversizedAccounts::1');

		// ------------------------------------------------------------------------
		// Secondly, find all the accounts that have previously been flagged and
		// that are now under the limit. Remove the flag from these accounts.
		// ------------------------------------------------------------------------

		const flaggedUsers = await this
			.db({ f: 'user_flags' })
			.select(['u.id', 'u.total_item_size', 'u.max_total_item_size', 'u.account_type', 'u.email', 'u.full_name'])
			.join({ u: 'users' }, 'u.id', 'f.user_id')
			.where('f.type', '=', UserFlagType.AccountOverLimit)
			.where(function() {
				void this
					.whereRaw('u.total_item_size < ? AND u.account_type = ?', [basicDefaultLimitMax, AccountType.Basic])
					.orWhereRaw('u.total_item_size < ? AND u.account_type = ?', [proDefaultLimitMax, AccountType.Pro]);
			});

		await this.withTransaction(async () => {
			for (const user of flaggedUsers) {
				const maxTotalItemSize = getMaxTotalItemSize(user);
				if (user.total_item_size < maxTotalItemSize) {
					await this.models().userFlag().remove(user.id, UserFlagType.AccountOverLimit);
				}
			}
		}, 'UserModel::handleOversizedAccounts::2');
	}

	private formatValues(user: User): User {
		const output: User = { ...user };
		if ('email' in output) output.email = (`${user.email}`).trim().toLowerCase();
		return output;
	}

	private async syncInfo(userId: Uuid): Promise<any> {
		const item = await this.models().item().loadByName(userId, 'info.json');

		// We can get there if user 1 tries to share a notebook with user 2, but
		// user 2 has never initiated a sync. In this case, they won't have the
		// info.json file that we need, so we try to return an error message
		// that makes sense.
		if (!item) throw new ErrorBadRequest('The account of this user is not correctly initialised (missing info.json)');
		const withContent = await this.models().item().loadWithContent(item.id);
		return JSON.parse(withContent.content.toString());
	}

	public async publicPrivateKey(userId: string): Promise<PublicPrivateKeyPair> {
		const syncInfo = await this.syncInfo(userId);
		return syncInfo.ppk?.value || null;
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
		}, 'UserModel::save');
	}

	public async saveMulti(users: User[], options: SaveOptions = {}): Promise<void> {
		await this.withTransaction(async () => {
			for (const user of users) {
				await this.save(user, options);
			}
		}, 'UserModel::saveMulti');
	}

}
