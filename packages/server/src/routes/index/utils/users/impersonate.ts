import { Uuid } from '../../../../services/database/types';
import { cookieDelete, cookieGet, cookieSet } from '../../../../utils/cookies';
import { ErrorForbidden } from '../../../../utils/errors';
import { contextSessionId } from '../../../../utils/requestUtils';
import { AppContext } from '../../../../utils/types';

export function getImpersonatorAdminSessionId(ctx: AppContext): string {
	return cookieGet(ctx, 'adminSessionId');
}

export async function startImpersonating(ctx: AppContext, userId: Uuid) {
	const adminSessionId = contextSessionId(ctx);
	const user = await ctx.joplin.models.session().sessionUser(adminSessionId);
	if (!user.is_admin) throw new ErrorForbidden('Impersonator must be an admin');

	const impersonatedSession = await ctx.joplin.models.session().createUserSession(userId);
	cookieSet(ctx, 'adminSessionId', adminSessionId);
	cookieSet(ctx, 'sessionId', impersonatedSession.id);
}

export async function stopImpersonating(ctx: AppContext) {
	const adminSessionId = cookieGet(ctx, 'adminSessionId');
	if (!adminSessionId) throw new Error('Missing cookie adminSessionId');

	const adminUser = await ctx.joplin.models.session().sessionUser(adminSessionId);
	if (!adminUser.is_admin) throw new ErrorForbidden('User must be an admin');

	cookieDelete(ctx, 'adminSessionId');
	cookieSet(ctx, 'sessionId', adminSessionId);
}
