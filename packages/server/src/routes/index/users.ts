import { SubPath, redirect } from '../../utils/routeUtils';
import Router from '../../utils/Router';
import { RouteType } from '../../utils/types';
import { AppContext, HttpMethod } from '../../utils/types';
import { bodyFields, contextSessionId, formParse } from '../../utils/requestUtils';
import { ErrorBadRequest, ErrorForbidden, ErrorNotFound, ErrorUnprocessableEntity } from '../../utils/errors';
import { User, UserFlag, UserFlagType, Uuid } from '../../services/database/types';
import config from '../../config';
import { View } from '../../services/MustacheService';
import defaultView from '../../utils/defaultView';
import { AclAction } from '../../models/BaseModel';
import { NotificationKey } from '../../models/NotificationModel';
import { AccountType, accountTypeOptions, accountTypeToString } from '../../models/UserModel';
import uuidgen from '../../utils/uuidgen';
import { formatMaxItemSize, formatMaxTotalSize, formatTotalSize, formatTotalSizePercent, yesOrNo } from '../../utils/strings';
import { getCanShareFolder, totalSizeClass } from '../../models/utils/user';
import { yesNoDefaultOptions, yesNoOptions } from '../../utils/views/select';
import { confirmUrl, stripePortalUrl } from '../../utils/urlUtils';
import { cancelSubscriptionByUserId, updateCustomerEmail, updateSubscriptionType } from '../../utils/stripe';
import { createCsrfTag } from '../../utils/csrf';
import { formatDateTime } from '../../utils/time';
import { cookieSet } from '../../utils/cookies';
import { startImpersonating, stopImpersonating } from './utils/users/impersonate';
import { userFlagToString } from '../../models/UserFlagModel';

export interface CheckRepeatPasswordInput {
	password: string;
	password2: string;
}

export function checkRepeatPassword(fields: CheckRepeatPasswordInput, required: boolean): string {
	if (fields.password) {
		if (fields.password !== fields.password2) throw new ErrorUnprocessableEntity('Passwords do not match');
		return fields.password;
	} else {
		if (required) throw new ErrorUnprocessableEntity('Password is required');
	}

	return '';
}

function boolOrDefaultToValue(fields: any, fieldName: string): number | null {
	if (fields[fieldName] === '') return null;
	const output = Number(fields[fieldName]);
	if (isNaN(output) || (output !== 0 && output !== 1)) throw new Error(`Invalid value for ${fieldName}`);
	return output;
}

function intOrDefaultToValue(fields: any, fieldName: string): number | null {
	if (fields[fieldName] === '') return null;
	const output = Number(fields[fieldName]);
	if (isNaN(output)) throw new Error(`Invalid value for ${fieldName}`);
	return output;
}

function makeUser(isNew: boolean, fields: any): User {
	const user: User = {};

	if ('email' in fields) user.email = fields.email;
	if ('full_name' in fields) user.full_name = fields.full_name;
	if ('is_admin' in fields) user.is_admin = fields.is_admin;
	if ('max_item_size' in fields) user.max_item_size = intOrDefaultToValue(fields, 'max_item_size');
	if ('max_total_item_size' in fields) user.max_total_item_size = intOrDefaultToValue(fields, 'max_total_item_size');
	if ('can_share_folder' in fields) user.can_share_folder = boolOrDefaultToValue(fields, 'can_share_folder');
	if ('can_upload' in fields) user.can_upload = intOrDefaultToValue(fields, 'can_upload');
	if ('account_type' in fields) user.account_type = Number(fields.account_type);

	const password = checkRepeatPassword(fields, false);
	if (password) user.password = password;

	if (!isNew) user.id = fields.id;

	if (isNew) {
		user.must_set_password = user.password ? 0 : 1;
		user.password = user.password ? user.password : uuidgen();
	}

	return user;
}

function defaultUser(): User {
	return {};
}

function userIsNew(path: SubPath): boolean {
	return path.id === 'new';
}

function userIsMe(path: SubPath): boolean {
	return path.id === 'me';
}

const router = new Router(RouteType.Web);

router.get('users', async (_path: SubPath, ctx: AppContext) => {
	const userModel = ctx.joplin.models.user();
	await userModel.checkIfAllowed(ctx.joplin.owner, AclAction.List);

	const users = await userModel.all();

	users.sort((u1: User, u2: User) => {
		if (u1.full_name && u2.full_name) return u1.full_name.toLowerCase() < u2.full_name.toLowerCase() ? -1 : +1;
		if (u1.full_name && !u2.full_name) return +1;
		if (!u1.full_name && u2.full_name) return -1;
		return u1.email.toLowerCase() < u2.email.toLowerCase() ? -1 : +1;
	});

	const view: View = defaultView('users', 'Users');
	view.content.users = users.map(user => {
		return {
			...user,
			displayName: user.full_name ? user.full_name : '(not set)',
			formattedItemMaxSize: formatMaxItemSize(user),
			formattedTotalSize: formatTotalSize(user),
			formattedMaxTotalSize: formatMaxTotalSize(user),
			formattedTotalSizePercent: formatTotalSizePercent(user),
			totalSizeClass: totalSizeClass(user),
			formattedAccountType: accountTypeToString(user.account_type),
			formattedCanShareFolder: yesOrNo(getCanShareFolder(user)),
			rowClassName: user.enabled ? '' : 'is-disabled',
		};
	});
	return view;
});

router.get('users/:id', async (path: SubPath, ctx: AppContext, user: User = null, error: any = null) => {
	const owner = ctx.joplin.owner;
	const isMe = userIsMe(path);
	const isNew = userIsNew(path);
	const models = ctx.joplin.models;
	const userId = userIsMe(path) ? owner.id : path.id;

	user = !isNew ? user || await models.user().load(userId) : null;
	if (isNew && !user) user = defaultUser();

	await models.user().checkIfAllowed(ctx.joplin.owner, AclAction.Read, user);

	let postUrl = '';

	if (isNew) {
		postUrl = `${config().baseUrl}/users/new`;
	} else if (isMe) {
		postUrl = `${config().baseUrl}/users/me`;
	} else {
		postUrl = `${config().baseUrl}/users/${user.id}`;
	}

	interface UserFlagView extends UserFlag {
		message: string;
	}

	let userFlagViews: UserFlagView[] = isNew ? [] : (await models.userFlag().allByUserId(user.id)).map(f => {
		return {
			...f,
			message: userFlagToString(f),
		};
	});

	userFlagViews.sort((a, b) => {
		return a.created_time < b.created_time ? +1 : -1;
	});

	if (!owner.is_admin) userFlagViews = [];

	const subscription = !isNew ? await ctx.joplin.models.subscription().byUserId(userId) : null;

	const view: View = defaultView('user', 'Profile');
	view.content.user = user;
	view.content.isNew = isNew;
	view.content.buttonTitle = isNew ? 'Create user' : 'Update profile';
	view.content.error = error;
	view.content.postUrl = postUrl;
	view.content.showDisableButton = !isNew && !!owner.is_admin && owner.id !== user.id && user.enabled;
	view.content.csrfTag = await createCsrfTag(ctx);

	if (subscription) {
		const lastPaymentAttempt = models.subscription().lastPaymentAttempt(subscription);

		view.content.subscription = subscription;
		view.content.showManageSubscription = !isNew;
		view.content.showUpdateSubscriptionBasic = !isNew && !!owner.is_admin && user.account_type !== AccountType.Basic;
		view.content.showUpdateSubscriptionPro = !isNew && user.account_type !== AccountType.Pro;
		view.content.subLastPaymentStatus = lastPaymentAttempt.status;
		view.content.subLastPaymentDate = formatDateTime(lastPaymentAttempt.time);
	}

	view.content.showImpersonateButton = !isNew && !!owner.is_admin && user.enabled && user.id !== owner.id;
	view.content.showRestoreButton = !isNew && !!owner.is_admin && !user.enabled;
	view.content.showResetPasswordButton = !isNew && owner.is_admin && user.enabled;
	view.content.canShareFolderOptions = yesNoDefaultOptions(user, 'can_share_folder');
	view.content.canUploadOptions = yesNoOptions(user, 'can_upload');
	view.content.hasFlags = !!userFlagViews.length;
	view.content.userFlagViews = userFlagViews;
	view.content.stripePortalUrl = stripePortalUrl();

	view.jsFiles.push('zxcvbn');
	view.cssFiles.push('index/user');

	if (config().accountTypesEnabled) {
		view.content.showAccountTypes = true;
		view.content.accountTypes = accountTypeOptions().map((o: any) => {
			o.selected = user.account_type === o.value;
			return o;
		});
	}

	return view;
});

router.publicSchemas.push('users/:id/confirm');

router.get('users/:id/confirm', async (path: SubPath, ctx: AppContext, error: Error = null) => {
	const models = ctx.joplin.models;
	const userId = path.id;
	const token = ctx.query.token;

	if (!token) throw new ErrorBadRequest('Missing token');

	const beforeChangingEmailHandler = async (newEmail: string) => {
		if (config().stripe.enabled) {
			try {
				await updateCustomerEmail(models, userId, newEmail);
			} catch (error) {
				if (['no_sub', 'no_stripe_sub'].includes(error.code)) {
					// ok - the user just doesn't have a subscription
				} else {
					error.message = `Your Stripe subscription email could not be updated. As a result your account email has not been changed. Please try again or contact support. Error was: ${error.message}`;
					throw error;
				}
			}
		}
	};

	if (ctx.query.confirm_email !== '0') await models.user().processEmailConfirmation(userId, token, beforeChangingEmailHandler);

	const user = await models.user().load(userId);
	if (!user) throw new ErrorNotFound(`No such user: ${userId}`);

	if (user.must_set_password) {
		const view: View = {
			...defaultView('users/confirm', 'Confirmation'),
			content: {
				user,
				error,
				token,
				postUrl: confirmUrl(userId, token),
			},
			navbar: false,
		};

		view.jsFiles.push('zxcvbn');

		return view;
	} else {
		await models.token().deleteByValue(userId, token);
		await models.notification().add(userId, NotificationKey.EmailConfirmed);

		if (ctx.joplin.owner) {
			return redirect(ctx, `${config().baseUrl}/home`);
		} else {
			return redirect(ctx, `${config().baseUrl}/login`);
		}
	}
});

interface SetPasswordFormData {
	token: string;
	password: string;
	password2: string;
}

router.post('users/:id/confirm', async (path: SubPath, ctx: AppContext) => {
	const userId = path.id;

	try {
		const fields = await bodyFields<SetPasswordFormData>(ctx.req);
		await ctx.joplin.models.token().checkToken(userId, fields.token);

		const password = checkRepeatPassword(fields, true);

		await ctx.joplin.models.user().save({ id: userId, password, must_set_password: 0 });
		await ctx.joplin.models.token().deleteByValue(userId, fields.token);

		const session = await ctx.joplin.models.session().createUserSession(userId);
		cookieSet(ctx, 'sessionId', session.id);

		await ctx.joplin.models.notification().add(userId, NotificationKey.PasswordSet);

		return redirect(ctx, `${config().baseUrl}/home`);
	} catch (error) {
		const endPoint = router.findEndPoint(HttpMethod.GET, 'users/:id/confirm');
		return endPoint.handler(path, ctx, error);
	}
});

router.alias(HttpMethod.POST, 'users/:id', 'users');

interface FormFields {
	id: Uuid;
	post_button: string;
	disable_button: string;
	restore_button: string;
	cancel_subscription_button: string;
	send_account_confirmation_email: string;
	update_subscription_basic_button: string;
	update_subscription_pro_button: string;
	// user_cancel_subscription_button: string;
	impersonate_button: string;
	stop_impersonate_button: string;
	delete_user_flags: string;
}

router.post('users', async (path: SubPath, ctx: AppContext) => {
	let user: User = {};
	const owner = ctx.joplin.owner;
	const userId = userIsMe(path) ? owner.id : path.id;

	try {
		const body = await formParse(ctx.req);
		const fields = body.fields as FormFields;
		const isNew = userIsNew(path);
		if (userIsMe(path)) fields.id = userId;
		user = makeUser(isNew, fields);

		const models = ctx.joplin.models;

		if (fields.post_button) {
			const userToSave: User = models.user().fromApiInput(user);
			await models.user().checkIfAllowed(owner, isNew ? AclAction.Create : AclAction.Update, userToSave);

			if (isNew) {
				await models.user().save(userToSave);
			} else {
				if (userToSave.email && !owner.is_admin) {
					await models.user().initiateEmailChange(userId, userToSave.email);
					delete userToSave.email;
				}

				await models.user().save(userToSave, { isNew: false });

				// When changing the password, we also clear all session IDs for
				// that user, except the current one (otherwise they would be
				// logged out).
				if (userToSave.password) await models.session().deleteByUserId(userToSave.id, contextSessionId(ctx));
			}
		} else if (fields.stop_impersonate_button) {
			await stopImpersonating(ctx);
			return redirect(ctx, config().baseUrl);
		} else if (owner.is_admin) {
			if (fields.disable_button || fields.restore_button) {
				const user = await models.user().load(path.id);
				await models.user().checkIfAllowed(owner, AclAction.Delete, user);
				await models.userFlag().toggle(user.id, UserFlagType.ManuallyDisabled, !fields.restore_button);
			} else if (fields.send_account_confirmation_email) {
				const user = await models.user().load(path.id);
				await models.user().save({ id: user.id, must_set_password: 1 });
				await models.user().sendAccountConfirmationEmail(user);
			} else if (fields.impersonate_button) {
				await startImpersonating(ctx, userId);
				return redirect(ctx, config().baseUrl);
			} else if (fields.cancel_subscription_button) {
				await cancelSubscriptionByUserId(models, userId);
			} else if (fields.update_subscription_basic_button) {
				await updateSubscriptionType(models, userId, AccountType.Basic);
			} else if (fields.update_subscription_pro_button) {
				await updateSubscriptionType(models, userId, AccountType.Pro);
			} else if (fields.delete_user_flags) {
				const userFlagTypes: UserFlagType[] = [];
				for (const key of Object.keys(fields)) {
					if (key.startsWith('user_flag_')) {
						const type = Number(key.substr(10));
						userFlagTypes.push(type);
					}
				}

				await models.userFlag().removeMulti(userId, userFlagTypes);
			} else {
				throw new Error('Invalid form button');
			}
		}

		return redirect(ctx, `${config().baseUrl}/users${userIsMe(path) ? '/me' : `/${userId}`}`);
	} catch (error) {
		error.message = `Error: Your changes were not saved: ${error.message}`;
		if (error instanceof ErrorForbidden) throw error;
		const endPoint = router.findEndPoint(HttpMethod.GET, 'users/:id');
		return endPoint.handler(path, ctx, user, error);
	}
});

export default router;
