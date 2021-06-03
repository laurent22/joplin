import config from '../../config';
import Router from '../../utils/Router';
import { RouteType } from '../../utils/types';

const router = new Router(RouteType.Api);

router.public = true;

router.get('api/ping', async () => {
	return { status: 'ok', message: `${config().appName} is running` };
});

export default router;
