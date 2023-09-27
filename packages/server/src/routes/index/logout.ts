import { SubPath, redirect } from '../../utils/routeUtils';
import Router from '../../utils/Router';
import { RouteType } from '../../utils/types';
import { AppContext } from '../../utils/types';
import config from '../../config';
import webLogout from '../../utils/webLogout';

const router = new Router(RouteType.Web);

router.post('logout', async (_path: SubPath, ctx: AppContext) => {
	await webLogout(ctx);
	return redirect(ctx, `${config().baseUrl}/login`);
});

export default router;
