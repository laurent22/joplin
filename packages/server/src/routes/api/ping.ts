import Router from '../../utils/Router';
import { RouteType } from '../../utils/types';

const router = new Router(RouteType.Api);

router.public = true;

router.get('api/ping', async () => {
	return { status: 'ok', message: 'Joplin Server is running' };
});

export default router;
