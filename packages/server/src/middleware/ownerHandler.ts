import { AppContext, KoaNext } from '../utils/types';
import { contextSessionId } from '../utils/requestUtils';

export default async function(ctx: AppContext, next: KoaNext): Promise<void> {
	const models = ctx.joplin.models;
	const sessionId = contextSessionId(ctx, false);
	const owner = sessionId ? await models.session().sessionUser(sessionId) : null;
	ctx.joplin.owner = owner;
	return next();
}
