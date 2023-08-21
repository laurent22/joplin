import { cookieSet } from './cookies';
import { contextSessionId } from './requestUtils';
import { AppContext } from './types';

export default async (ctx: AppContext) => {
	const sessionId = contextSessionId(ctx, false);
	cookieSet(ctx, 'sessionId', '');
	cookieSet(ctx, 'adminSessionId', '');
	await ctx.joplin.models.session().logout(sessionId);
};
