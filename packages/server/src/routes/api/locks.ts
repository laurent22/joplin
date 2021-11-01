import { LockType, LockClientType, lockNameToObject } from '@joplin/lib/services/synchronizer/LockHandler';
import { bodyFields } from '../../utils/requestUtils';
import Router from '../../utils/Router';
import { SubPath } from '../../utils/routeUtils';
import { AppContext, RouteType } from '../../utils/types';

const router = new Router(RouteType.Api);

interface PostFields {
	type: LockType;
	clientType: LockClientType;
	clientId: string;
}

router.post('api/locks', async (_path: SubPath, ctx: AppContext) => {
	const fields = await bodyFields<PostFields>(ctx.req);
	return ctx.joplin.models.lock().acquireLock(ctx.joplin.owner.id, fields.type, fields.clientType, fields.clientId);
});

router.del('api/locks/:id', async (path: SubPath, ctx: AppContext) => {
	const lock = lockNameToObject(path.id);
	await ctx.joplin.models.lock().releaseLock(ctx.joplin.owner.id, lock.type, lock.clientType, lock.clientId);
});

router.get('api/locks', async (_path: SubPath, ctx: AppContext) => {
	return {
		items: await ctx.joplin.models.lock().allLocks(ctx.joplin.owner.id),
		has_more: false,
	};
});

export default router;
