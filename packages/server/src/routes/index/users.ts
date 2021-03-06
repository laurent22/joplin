import { SubPath, redirect } from '../../utils/routeUtils';
import Router from '../../utils/Router';
import { AppContext, HttpMethod } from '../../utils/types';
import { formParse } from '../../utils/requestUtils';
import { ErrorUnprocessableEntity } from '../../utils/errors';
import { User } from '../../db';
import config from '../../config';
import { View } from '../../services/MustacheService';
import defaultView from '../../utils/defaultView';

function makeUser(isNew: boolean, fields: any): User {
	const user: User = {};

	if ('email' in fields) user.email = fields.email;
	if ('full_name' in fields) user.full_name = fields.full_name;

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
	const userModel = ctx.models.user({ userId: ctx.owner.id });
	const users = await userModel.all();

	const view: View = defaultView('users');
	view.content.users = users;
	return view;
});

router.get('users/:id', async (path: SubPath, ctx: AppContext, user: User = null, error: any = null) => {
	const owner = ctx.owner;
	const isMe = userIsMe(path);
	const isNew = userIsNew(path);
	const userModel = ctx.models.user({ userId: owner.id });
	const userId = userIsMe(path) ? owner.id : path.id;

	user = !isNew ? user || await userModel.load(userId) : null;

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
		if (userIsMe(path)) fields.id = userId;
		user = makeUser(userIsNew(path), fields);

		const userModel = ctx.models.user({ userId: ctx.owner.id });

		if (fields.post_button) {
			if (userIsNew(path)) {
				await userModel.save(userModel.fromApiInput(user));
			} else {
				await userModel.save(userModel.fromApiInput(user), { isNew: false });
			}
		} else if (fields.delete_button) {
			await userModel.delete(path.id);
		} else {
			throw new Error('Invalid form button');
		}

		return redirect(ctx, `${config().baseUrl}/users${userIsMe(path) ? '/me' : ''}`);
	} catch (error) {
		const endPoint = router.findEndPoint(HttpMethod.GET, 'users/:id');
		return endPoint(path, ctx, user, error);
	}
});

export default router;
