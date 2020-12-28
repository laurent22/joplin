import { SubPath, Route, redirect } from '../../utils/routeUtils';
import { AppContext } from '../../utils/types';
import { contextSessionId, formParse } from '../../utils/requestUtils';
import { ErrorMethodNotAllowed, ErrorUnprocessableEntity } from '../../utils/errors';
import { User } from '../../db';
import { baseUrl } from '../../config';
import { hashPassword } from '../../utils/auth';

const route: Route = {

	exec: async function(_path: SubPath, ctx: AppContext) {
		const sessionId = contextSessionId(ctx);

		if (ctx.method === 'GET') {
			return ctx.controllers.indexProfile().getIndex(sessionId);
		}

		if (ctx.method === 'POST') {
			let user: User = {};

			try {
				const body = await formParse(ctx.req);

				user = {
					id: body.fields.id,
					email: body.fields.email,
					full_name: body.fields.full_name,
				};

				if (body.fields.password) {
					if (body.fields.password !== body.fields.password2) throw new ErrorUnprocessableEntity('Passwords do not match');
					user.password = hashPassword(body.fields.password);
				}

				await ctx.controllers.indexProfile().patchIndex(sessionId, user);
				return redirect(ctx, `${baseUrl()}/profile`);
			} catch (error) {
				return ctx.controllers.indexProfile().getIndex(sessionId, user, error);
			}
		}

		throw new ErrorMethodNotAllowed();
	},

};

export default route;
