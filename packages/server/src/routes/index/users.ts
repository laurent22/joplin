import { SubPath, redirect } from '../../utils/routeUtils';
import Router from '../../utils/Router';
import { RouteType } from '../../utils/types';
import { AppContext, HttpMethod } from '../../utils/types';
import { bodyFields, formParse } from '../../utils/requestUtils';
import { ErrorForbidden, ErrorUnprocessableEntity } from '../../utils/errors';
import { User, Uuid } from '../../db';
import config from '../../config';
import { View } from '../../services/MustacheService';
import defaultView from '../../utils/defaultView';
import { AclAction } from '../../models/BaseModel';
import { NotificationKey } from '../../models/NotificationModel';
import { accountTypeOptions, accountTypeToString } from '../../models/UserModel';
import uuidgen from '../../utils/uuidgen';
import { formatMaxItemSize, formatMaxTotalSize, formatTotalSize, formatTotalSizePercent, yesOrNo } from '../../utils/strings';
import { getCanShareFolder, totalSizeClass } from '../../models/utils/user';
import { yesNoDefaultOptions } from '../../utils/views/select';
import { confirmUrl } from '../../utils/urlUtils';

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
			formattedItemMaxSize: formatMaxItemSize(user),
			formattedTotalSize: formatTotalSize(user),
			formattedMaxTotalSize: formatMaxTotalSize(user),
			formattedTotalSizePercent: formatTotalSizePercent(user),
			totalSizeClass: totalSizeClass(user),
			formattedAccountType: accountTypeToString(user.account_type),
			formattedCanShareFolder: yesOrNo(getCanShareFolder(user)),
		};
	});
	return view;
});

router.get('users/:id', async (path: SubPath, ctx: AppContext, user: User = null, error: any = null) => {
	const owner = ctx.joplin.owner;
	const isMe = userIsMe(path);
	const isNew = userIsNew(path);
	const userModel = ctx.joplin.models.user();
	const userId = userIsMe(path) ? owner.id : path.id;

	user = !isNew ? user || await userModel.load(userId) : null;
	if (isNew && !user) user = defaultUser();

	await userModel.checkIfAllowed(ctx.joplin.owner, AclAction.Read, user);

	let postUrl = '';

	if (isNew) {
		postUrl = `${config().baseUrl}/users/new`;
	} else if (isMe) {
		postUrl = `${config().baseUrl}/users/me`;
	} else {
		postUrl = `${config().baseUrl}/users/${user.id}`;
	}

	const view: View = defaultView('user', 'Profile');
	view.content.user = user;
	view.content.isNew = isNew;
	view.content.buttonTitle = isNew ? 'Create user' : 'Update profile';
	view.content.error = error;
	view.content.postUrl = postUrl;
	view.content.showDeleteButton = !isNew && !!owner.is_admin && owner.id !== user.id;
	view.content.showResetPasswordButton = !isNew && owner.is_admin;
	view.content.canSetEmail = isNew || owner.is_admin;
	view.content.canShareFolderOptions = yesNoDefaultOptions(user, 'can_share_folder');
	view.jsFiles.push('zxcvbn');

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
	const userId = path.id;
	const token = ctx.query.token;
	if (token) await ctx.joplin.models.user().confirmEmail(userId, token);

	const user = await ctx.joplin.models.user().load(userId);

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
		await ctx.joplin.models.token().deleteByValue(userId, token);
		await ctx.joplin.models.notification().add(userId, NotificationKey.EmailConfirmed);

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
		ctx.cookies.set('sessionId', session.id);

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
	delete_button: string;
	send_reset_password_email: string;
}

router.post('users', async (path: SubPath, ctx: AppContext) => {
	let user: User = {};
	const userId = userIsMe(path) ? ctx.joplin.owner.id : path.id;

	try {
		const body = await formParse(ctx.req);
		const fields = body.fields as FormFields;
		const isNew = userIsNew(path);
		if (userIsMe(path)) fields.id = userId;
		user = makeUser(isNew, fields);

		const userModel = ctx.joplin.models.user();

		if (fields.post_button) {
			const userToSave: User = userModel.fromApiInput(user);
			await userModel.checkIfAllowed(ctx.joplin.owner, isNew ? AclAction.Create : AclAction.Update, userToSave);

			if (isNew) {
				await userModel.save(userToSave);
			} else {
				await userModel.save(userToSave, { isNew: false });
			}
		} else if (fields.delete_button) {
			const user = await userModel.load(path.id);
			await userModel.checkIfAllowed(ctx.joplin.owner, AclAction.Delete, user);
			await userModel.delete(path.id);
		} else if (fields.send_reset_password_email) {
			const user = await userModel.load(path.id);
			await userModel.save({ id: user.id, must_set_password: 1 });
			await userModel.sendAccountConfirmationEmail(user);
		} else {
			throw new Error('Invalid form button');
		}

		return redirect(ctx, `${config().baseUrl}/users${userIsMe(path) ? '/me' : ''}`);
	} catch (error) {
		if (error instanceof ErrorForbidden) throw error;
		const endPoint = router.findEndPoint(HttpMethod.GET, 'users/:id');
		return endPoint.handler(path, ctx, user, error);
	}
});

export default router;
