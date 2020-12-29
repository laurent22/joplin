import { SubPath, Route, respondWithFileContent, redirect } from '../../utils/routeUtils';
import { AppContext } from '../../utils/types';
import { contextSessionId, formParse } from '../../utils/requestUtils';
import { ErrorMethodNotAllowed, ErrorNotFound } from '../../utils/errors';
import { File } from '../../db';

const route: Route = {

	exec: async function(path: SubPath, ctx: AppContext) {
		const sessionId = contextSessionId(ctx);

		if (ctx.method === 'GET') {
			if (!path.link) {
				return ctx.controllers.indexFiles().getIndex(sessionId, path.id, ctx.query);
			} else if (path.link === 'content') {
				const file: File = await ctx.controllers.apiFile().getFileContent(sessionId, path.id);
				return respondWithFileContent(ctx.response, file);
			}

			throw new ErrorNotFound();
		}

		if (ctx.method === 'POST') {
			const body = await formParse(ctx.req);
			const fields = body.fields;
			const parentId = fields.parent_id;
			const user = await ctx.models.session().sessionUser(sessionId);

			if (fields.delete_all_button) {
				await ctx.controllers.indexFiles().deleteAll(sessionId, parentId);
			} else {
				throw new Error('Invalid form button');
			}

			return redirect(ctx, await ctx.models.file({ userId: user.id }).fileUrl(parentId, ctx.query));
		}

		throw new ErrorMethodNotAllowed();
	},

};

export default route;
