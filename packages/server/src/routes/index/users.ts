import { SubPath, Route, redirect } from '../../utils/routeUtils';
import { AppContext } from '../../utils/types';
import { contextSessionId, formParse } from '../../utils/requestUtils';
import { ErrorMethodNotAllowed, ErrorUnprocessableEntity } from '../../utils/errors';
import { User } from '../../db';
import { baseUrl } from '../../config';
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

const endPoints = {

	'GET': {
		'users': async function(_path: SubPath, ctx: AppContext) {
			const userModel = ctx.models.user({ userId: ctx.owner.id });
			const users = await userModel.all();

			const view: View = defaultView('users');
			view.content.users = users;
			return view;
		},

		'users/:id': async function(path: SubPath, ctx: AppContext, user: User = null, error: any = null) {
			const owner = ctx.owner;
			const isMe = userIsMe(path);
			const isNew = userIsNew(path);
			const userModel = ctx.models.user({ userId: owner.id });
			const userId = userIsMe(path) ? owner.id : path.id;

			user = !isNew ? user || await userModel.load(userId) : null;

			let postUrl = '';

			if (isNew) {
				postUrl = `${baseUrl()}/users/new`;
			} else if (isMe) {
				postUrl = `${baseUrl()}/users/me`;
			} else {
				postUrl = `${baseUrl()}/users/${user.id}`;
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
		},
	},

	'POST': {
		'users': async function(path: SubPath, ctx: AppContext) {
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

				return redirect(ctx, `${baseUrl()}/users${userIsMe(path) ? '/me' : ''}`);
			} catch (error) {
				return endPoints.GET['users/:id'](path, ctx, user, error);
			}
		},
	},
};

const route: Route = {

	exec: async function(path: SubPath, ctx: AppContext) {
		contextSessionId(ctx);

		if (ctx.method === 'GET') {
			if (path.id) {
				return endPoints.GET['users/:id'](path, ctx);
			} else {
				return endPoints.GET['users'](path, ctx);
			}
		}

		if (ctx.method === 'POST') {
			return endPoints.POST['users'](path, ctx);
		}

		throw new ErrorMethodNotAllowed();
	},

};

export default route;
