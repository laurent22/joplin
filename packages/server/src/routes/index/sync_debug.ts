import { SubPath } from '../../utils/routeUtils';
import Router from '../../utils/Router';
import { RouteType } from '../../utils/types';
import { AppContext } from '../../utils/types';
import { ErrorMethodNotAllowed } from '../../utils/errors';
import { contextSessionId } from '../../utils/requestUtils';
import defaultView from '../../utils/defaultView';

const router = new Router(RouteType.Web);

router.get('sync_debug', async (_path: SubPath, ctx: AppContext) => {
	contextSessionId(ctx);

	if (ctx.method !== 'GET') {
		throw new ErrorMethodNotAllowed();
	}

	const view = defaultView('sync_debug', 'Sync Debug');
	view.cssFiles = ['index/sync_debug'];
	return view;
});

export default router;
