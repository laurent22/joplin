import defaultView from '../../../utils/defaultView';
import { ErrorMethodNotAllowed } from '../../../utils/errors';
import Router from '../../../utils/Router';
import { SubPath } from '../../../utils/routeUtils';
import { AppContext, RouteType } from '../../../utils/types';
import { _ } from '@joplin/lib/locale';

const router: Router = new Router(RouteType.Web);

router.public = true;

router.get('admin/organizations', async (_path: SubPath, ctx: AppContext) => {
	if (ctx.method === 'GET') {
		const view = defaultView('admin/organizations', _('Organizations'));
		return view;
	}

	throw new ErrorMethodNotAllowed();
});

export default router;
