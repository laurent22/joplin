import { AppContext, KoaNext } from '../utils/types';
import { contextSessionId } from '../utils/requestUtils';

export default async function(ctx: AppContext, next: KoaNext): Promise<void> {
	const sessionId = contextSessionId(ctx, false);
	if (sessionId) ctx.owner = await ctx.models.session().sessionUser(sessionId);
	return next();
}
