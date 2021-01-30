import Router from '../../utils/Router';

const router = new Router();

router.public = true;

router.get('api/ping', async () => {
	return { status: 'ok', message: 'Joplin Server is running' };
});

export default router;
