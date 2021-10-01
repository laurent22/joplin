import { SubPath } from '../../utils/routeUtils';
import Router from '../../utils/Router';
import { RouteType } from '../../utils/types';
import { AppContext } from '../../utils/types';
import { ErrorMethodNotAllowed } from '../../utils/errors';
import defaultView from '../../utils/defaultView';

const router: Router = new Router(RouteType.Web);

router.public = true;

router.get('help', async (_path: SubPath, ctx: AppContext) => {
	if (ctx.method === 'GET') {
		const view = defaultView('help', 'Help');
		return view;
	}

	throw new ErrorMethodNotAllowed();
});

export default router;
