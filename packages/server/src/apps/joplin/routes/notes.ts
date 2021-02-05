import routes from '../../../routes/routes';
import Router from '../../../utils/Router';
import { execRequest, SubPath } from '../../../utils/routeUtils';
import { AppContext } from '../../../utils/types';

const router = new Router();

router.get('notes/:id', async (path: SubPath, ctx: AppContext) => {
	// return execRequest(routes, ctx, 'api/files/root:/' + path.id);
	// return execRoute('GET', 'api/files/:id', path, ctx);
	//return ctx.routes['api/files'](path, ctx);
});

export default router;
