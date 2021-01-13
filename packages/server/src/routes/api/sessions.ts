import { SubPath, Route } from '../../utils/routeUtils';
import { ErrorForbidden, ErrorMethodNotAllowed, ErrorNotFound } from '../../utils/errors';
import { AppContext } from '../../utils/types';
import { bodyFields } from '../../utils/requestUtils';
import { User } from '../../db';

const route: Route = {

	exec: async function(path: SubPath, ctx: AppContext) {

		// -------------------------------------------
		// ROUTE api/sessions
		// -------------------------------------------

		if (!path.link) {
			if (ctx.method === 'POST') {
				const fields: User =  await bodyFields(ctx.req);
				const user = await ctx.models.user().login(fields.email, fields.password);
				if (!user) throw new ErrorForbidden('Invalid username or password');

				const session = await ctx.models.session().createUserSession(user.id);
				return { id: session.id };
			}

			throw new ErrorMethodNotAllowed();
		}

		throw new ErrorNotFound(`Invalid link: ${path.link}`);
	},

};

export default route;
