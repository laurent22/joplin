import { AppContext, KoaNext } from '../utils/types';
import { isApiRequest, contextSessionId } from '../utils/requestUtils';
import Logger from '@joplin/lib/Logger';

const logger = Logger.create('loggedInUserHandler');

export default async function(ctx: AppContext, next: KoaNext): Promise<void> {
	try {
		if (isApiRequest(ctx)) return next();
		const sessionId = contextSessionId(ctx);
		ctx.owner = await ctx.models.session().sessionUser(sessionId);
	} catch (error) {
		logger.error(error);
	}

	return next();
}
