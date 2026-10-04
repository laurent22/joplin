import { _ } from '@joplin/lib/locale';
import defaultView from '../../utils/defaultView';
import Router from '../../utils/Router';
import { SubPath } from '../../utils/routeUtils';
import { AppContext, RouteType } from '../../utils/types';
import showJoplinServerBusinessPromo from '../../utils/showJoplinServerBusinessPromo';

const router = new Router(RouteType.Web);

router.get('admin/dashboard', async (_path: SubPath, ctx: AppContext) => {
	const view = defaultView('admin/dashboard', _('Admin dashboard'));
	view.content = {
		showJoplinServerBusinessPromo: await showJoplinServerBusinessPromo(ctx.joplin.models),
	};
	return view;
});

export default router;
