// Not used??

// import { SubPath, Route, redirect } from '../../utils/routeUtils';
// import { AppContext } from '../../utils/types';
// import { contextSessionId, formParse } from '../../utils/requestUtils';
// import { ErrorMethodNotAllowed, ErrorUnprocessableEntity } from '../../utils/errors';
// import { User } from '../../db';
// import { baseUrl } from '../../config';

// function makeUser(isNew: boolean, fields: any): User {
// 	const user: User = {
// 		email: fields.email,
// 		full_name: fields.full_name,
// 	};

// 	if (fields.password) {
// 		if (fields.password !== fields.password2) throw new ErrorUnprocessableEntity('Passwords do not match');
// 		user.password = fields.password;
// 	}

// 	if (!isNew) user.id = fields.id;

// 	return user;
// }

// const route: Route = {

// 	exec: async function(_path: SubPath, ctx: AppContext) {
// 		const sessionId = contextSessionId(ctx);

// 		// if (ctx.method === 'GET') {
// 		// 	return ctx.controllers.indexUser().getOne(sessionId);
// 		// }

// 		if (ctx.method === 'POST') {
// 			const user: User = {};

// 			try {
// 				const body = await formParse(ctx.req);
// 				const fields = body.fields;
// 				const isNew = !!Number(fields.is_new);
// 				const user = makeUser(isNew, fields);

// 				if (isNew) {
// 					await ctx.controllers.apiUser().postUser(sessionId, user);
// 				} else {
// 					await ctx.controllers.apiUser().patchUser(sessionId, user);
// 				}

// 				return redirect(ctx, `${baseUrl()}/users`);
// 			} catch (error) {
// 				return ctx.controllers.indexProfile().getIndex(sessionId, user, error);
// 			}
// 		}

// 		throw new ErrorMethodNotAllowed();
// 	},

// };

// export default route;
