import { SubPath, Route, respondWithFileContent } from '../../utils/routeUtils';
import { AppContext } from '../../utils/types';
import { contextSessionId } from '../../utils/requestUtils';
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

		throw new ErrorMethodNotAllowed();
	},

};

export default route;
