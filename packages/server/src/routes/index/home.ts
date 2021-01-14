import { SubPath } from '../../utils/routeUtils';
import Router from '../../utils/Router';
import { AppContext } from '../../utils/types';
import { contextSessionId } from '../../utils/requestUtils';
import { ErrorMethodNotAllowed } from '../../utils/errors';
import defaultView from '../../utils/defaultView';

const router: Router = new Router();

router.get('home', async (_path: SubPath, ctx: AppContext) => {
	contextSessionId(ctx);

	if (ctx.method === 'GET') {
		return defaultView('home');
	}

	throw new ErrorMethodNotAllowed();
});

export default router;
