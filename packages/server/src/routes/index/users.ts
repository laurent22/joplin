import { SubPath, Route, redirect } from '../../utils/routeUtils';
import { AppContext } from '../../utils/types';
import { contextSessionId, formParse } from '../../utils/requestUtils';
import { ErrorMethodNotAllowed, ErrorUnprocessableEntity } from '../../utils/errors';
import { User } from '../../db';
import { baseUrl } from '../../config';

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

const route: Route = {

	exec: async function(path: SubPath, ctx: AppContext) {
		const sessionId = contextSessionId(ctx);
		const isNew = path.id === 'new';
		const isMe = path.id === 'me';
		const userId = isMe ? ctx.owner.id : path.id;

		if (ctx.method === 'GET') {
			if (path.id) {
				return ctx.controllers.indexUser().getOne(sessionId, isNew, isMe, !isNew ? userId : null);
			} else {
				return ctx.controllers.indexUser().getIndex(sessionId);
			}
		}

		if (ctx.method === 'POST') {
			let user: User = {};

			try {
				const body = await formParse(ctx.req);
				const fields = body.fields;
				if (isMe) fields.id = userId;
				user = makeUser(isNew, fields);

				const userModel = ctx.models.user({ userId: ctx.owner.id });

				if (fields.post_button) {
					if (isNew) {
						await userModel.save(userModel.fromApiInput(user));
					} else {
						await userModel.save(userModel.fromApiInput(user), { isNew: false });
					}
				} else if (fields.delete_button) {
					await userModel.delete(path.id);
				} else {
					throw new Error('Invalid form button');
				}

				return redirect(ctx, `${baseUrl()}/users${isMe ? '/me' : ''}`);
			} catch (error) {
				return ctx.controllers.indexUser().getOne(sessionId, isNew, isMe, user, error);
			}
		}

		throw new ErrorMethodNotAllowed();
	},

};

export default route;
