import config from '../../config';
import { clearDatabase, createTestUsers, CreateTestUsersOptions } from '../../tools/debugTools';
import { bodyFields } from '../../utils/requestUtils';
import Router from '../../utils/Router';
import { RouteType } from '../../utils/types';
import { SubPath } from '../../utils/routeUtils';
import { AppContext } from '../../utils/types';

const router = new Router(RouteType.Api);

router.public = true;

interface Query {
	action: string;
	count?: number;
	fromNum?: number;
}

router.post('api/debug', async (_path: SubPath, ctx: AppContext) => {
	const query: Query = (await bodyFields(ctx.req)) as Query;

	console.info(`Action: ${query.action}`);

	if (query.action === 'createTestUsers') {
		const options: CreateTestUsersOptions = {};

		if ('count' in query) options.count = query.count;
		if ('fromNum' in query) options.fromNum = query.fromNum;

		await createTestUsers(ctx.joplin.db, config(), options);
	}

	if (query.action === 'clearDatabase') {
		await clearDatabase(ctx.joplin.db);
	}
});

export default router;
