import { SubPath, redirect } from '../../utils/routeUtils';
import Router from '../../utils/Router';
import { AppContext, HttpMethod } from '../../utils/types';
import { bodyFields, formParse } from '../../utils/requestUtils';
import { ErrorForbidden, ErrorUnprocessableEntity } from '../../utils/errors';
import { NotificationLevel, User } from '../../db';
import config from '../../config';
import { View } from '../../services/MustacheService';
import defaultView from '../../utils/defaultView';
import { AclAction } from '../../models/BaseModel';
const prettyBytes = require('pretty-bytes');

function checkPassword(fields: SetPasswordFormData, required: boolean): string {
	if (fields.password) {
		if (fields.password !== fields.password2) throw new ErrorUnprocessableEntity('Passwords do not match');
		return fields.password;
	} else {
		if (required) throw new ErrorUnprocessableEntity('Password is required');
	}

	return '';
}

function makeUser(isNew: boolean, fields: any): User {
	const user: User = {};

	if ('email' in fields) user.email = fields.email;
	if ('full_name' in fields) user.full_name = fields.full_name;
	if ('is_admin' in fields) user.is_admin = fields.is_admin;
	if ('max_item_size' in fields) user.max_item_size = fields.max_item_size;
	user.can_share = fields.can_share ? 1 : 0;

	const password = checkPassword(fields, false);
	if (password) user.password = password;

	if (!isNew) user.id = fields.id;

	return user;
}

function userIsNew(path: SubPath): boolean {
	return path.id === 'new';
}

function userIsMe(path: SubPath): boolean {
	return path.id === 'me';
}

const router = new Router();

router.get('users', async (_path: SubPath, ctx: AppContext) => {
	const userModel = ctx.models.user();
	await userModel.checkIfAllowed(ctx.owner, AclAction.List);

	const users = await userModel.all();

	const view: View = defaultView('users');
	view.content.users = users.map(user => {
		return {
			...user,
			formattedItemMaxSize: user.max_item_size ? prettyBytes(user.max_item_size) : '∞',
		};
	});
	return view;
});

router.get('users/:id', async (path: SubPath, ctx: AppContext, user: User = null, error: any = null) => {
	const owner = ctx.owner;
	const isMe = userIsMe(path);
	const isNew = userIsNew(path);
	const userModel = ctx.models.user();
	const userId = userIsMe(path) ? owner.id : path.id;

	user = !isNew ? user || await userModel.load(userId) : null;

	await userModel.checkIfAllowed(ctx.owner, AclAction.Read, user);

	let postUrl = '';

	if (isNew) {
		postUrl = `${config().baseUrl}/users/new`;
	} else if (isMe) {
		postUrl = `${config().baseUrl}/users/me`;
	} else {
		postUrl = `${config().baseUrl}/users/${user.id}`;
	}

	const view: View = defaultView('user');
	view.content.user = user;
	view.content.isNew = isNew;
	view.content.buttonTitle = isNew ? 'Create user' : 'Update profile';
	view.content.error = error;
	view.content.postUrl = postUrl;
	view.content.showDeleteButton = !isNew && !!owner.is_admin && owner.id !== user.id;

	return view;
});

router.publicSchemas.push('users/:id/confirm');

router.get('users/:id/confirm', async (path: SubPath, ctx: AppContext, error: Error = null) => {
	const userId = path.id;
	const token = ctx.query.token;
	if (token) await ctx.models.user().confirmEmail(userId, token);

	const user = await ctx.models.user().load(userId);

	const view: View = {
		...defaultView('users/confirm'),
		content: {
			user,
			error,
			token,
			postUrl: ctx.models.user().confirmUrl(userId, token),
		},
		navbar: false,
	};

	return view;
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
		await ctx.models.token().checkToken(userId, fields.token);

		const password = checkPassword(fields, true);

		await ctx.models.user().save({ id: userId, password });
		await ctx.models.token().deleteByValue(userId, fields.token);

		const session = await ctx.models.session().createUserSession(userId);
		ctx.cookies.set('sessionId', session.id);

		await ctx.models.notification().add(userId, 'passwordSet', NotificationLevel.Normal, 'Welcome to Joplin Cloud! Your password has been set successfully.');

		return redirect(ctx, `${config().baseUrl}/home`);
	} catch (error) {
		const endPoint = router.findEndPoint(HttpMethod.GET, 'users/:id/confirm');
		return endPoint(path, ctx, error);
	}
});

router.alias(HttpMethod.POST, 'users/:id', 'users');

router.post('users', async (path: SubPath, ctx: AppContext) => {
	let user: User = {};
	const userId = userIsMe(path) ? ctx.owner.id : path.id;

	try {
		const body = await formParse(ctx.req);
		const fields = body.fields;
		const isNew = userIsNew(path);
		if (userIsMe(path)) fields.id = userId;
		user = makeUser(isNew, fields);

		const userModel = ctx.models.user();

		if (fields.post_button) {
			const userToSave: User = userModel.fromApiInput(user);
			await userModel.checkIfAllowed(ctx.owner, isNew ? AclAction.Create : AclAction.Update, userToSave);

			if (isNew) {
				await userModel.save(userToSave);
			} else {
				await userModel.save(userToSave, { isNew: false });
			}
		} else if (fields.delete_button) {
			const user = await userModel.load(path.id);
			await userModel.checkIfAllowed(ctx.owner, AclAction.Delete, user);
			await userModel.delete(path.id);
		} else {
			throw new Error('Invalid form button');
		}

		return redirect(ctx, `${config().baseUrl}/users${userIsMe(path) ? '/me' : ''}`);
	} catch (error) {
		if (error instanceof ErrorForbidden) throw error;
		const endPoint = router.findEndPoint(HttpMethod.GET, 'users/:id');
		return endPoint(path, ctx, user, error);
	}
});

export default router;
