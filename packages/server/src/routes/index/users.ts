import { SubPath, Route, redirect } from '../../utils/routeUtils';
import { AppContext } from '../../utils/types';
import { contextSessionId, formParse } from '../../utils/requestUtils';
import { ErrorMethodNotAllowed, ErrorUnprocessableEntity } from '../../utils/errors';
import { User } from '../../db';
import { baseUrl } from '../../config';

function makeUser(isNew: boolean, fields: any): User {
	const user: User = {
		email: fields.email,
		full_name: fields.full_name,
	};

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

		if (ctx.method === 'GET') {
			if (path.id) {
				return ctx.controllers.indexUser().getOne(sessionId, isNew, !isNew ? path.id : null);
			} else {
				return ctx.controllers.indexUser().getIndex(sessionId);
			}
		}

		if (ctx.method === 'POST') {
			let user: User = {};

			try {
				const body = await formParse(ctx.req);
				const fields = body.fields;
				user = makeUser(isNew, fields);

				if (fields.post_button) {
					if (isNew) {
						await ctx.controllers.apiUser().postUser(sessionId, user);
					} else {
						await ctx.controllers.apiUser().patchUser(sessionId, user);
					}
				} else if (fields.delete_button) {
					await ctx.controllers.apiUser().deleteUser(sessionId, path.id);
				} else {
					throw new Error('Invalid form button');
				}

				return redirect(ctx, `${baseUrl()}/users`);
			} catch (error) {
				return ctx.controllers.indexUser().getOne(sessionId, isNew, user, error);
			}
		}

		throw new ErrorMethodNotAllowed();
	},

};

export default route;
