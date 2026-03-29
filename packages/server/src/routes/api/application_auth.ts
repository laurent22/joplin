
import { SubPath } from '../../utils/routeUtils';
import Router from '../../utils/Router';
import { RouteType } from '../../utils/types';
import { AppContext } from '../../utils/types';

const router = new Router(RouteType.Api);

router.public = true;

// id here should be the same code used in the index/applications/:id/confirm
router.get('api/application_auth/:id', async (path: SubPath, ctx: AppContext) => {
	return await ctx.joplin.models.application().createAppPassword(path.id);
});

export default router;
