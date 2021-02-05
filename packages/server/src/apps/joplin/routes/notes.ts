import Router from '../../../utils/Router';
import { SubPath } from '../../../utils/routeUtils';
import { AppContext } from '../../../utils/types';

const router = new Router();

router.get('notes/:id', async (_path: SubPath, _ctx: AppContext) => {
	return 'testing';
});

export default router;
