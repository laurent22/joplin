import { SubPath, redirect } from '../../utils/routeUtils';
import Router from '../../utils/Router';
import { AppContext, HttpMethod } from '../../utils/types';
import { formParse } from '../../utils/requestUtils';
import { ErrorForbidden, ErrorUnprocessableEntity } from '../../utils/errors';
import { User } from '../../db';
import config from '../../config';
import { View } from '../../services/MustacheService';
import defaultView from '../../utils/defaultView';
import { AclAction } from '../../models/BaseModel';
const prettyBytes = require('pretty-bytes');

function makeUser(isNew: boolean, fields: any): User {
	const user: User = {};

	if ('email' in fields) user.email = fields.email;
	if ('full_name' in fields) user.full_name = fields.full_name;
	if ('is_admin' in fields) user.is_admin = fields.is_admin;
	if ('max_item_size' in fields) user.max_item_size = fields.max_item_size;
	user.can_share = fields.can_share ? 1 : 0;

	if (fields.password) {
		if (fields.password !== fields.password2) throw new ErrorUnprocessableEntity('Passwords do not match');
		user.password = fields.password;
	}

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
	view.partials.push('errorBanner');

	return view;
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
