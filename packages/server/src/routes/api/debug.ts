/* eslint-disable no-console */

import config from '../../config';
import { clearDatabase, createTestUsers, CreateTestUsersOptions, createUserDeletions } from '../../tools/debugTools';
import { bodyFields } from '../../utils/requestUtils';
import Router from '../../utils/Router';
import { Env, RouteType } from '../../utils/types';
import { SubPath } from '../../utils/routeUtils';
import { AppContext } from '../../utils/types';
import { ErrorForbidden } from '../../utils/errors';

const router = new Router(RouteType.Api);

router.public = true;

interface Query {
	action: string;
	count?: number;
	fromNum?: number;
}

router.post('api/debug', async (_path: SubPath, ctx: AppContext) => {
	if (config().env !== Env.Dev) throw new ErrorForbidden();

	const query: Query = (await bodyFields(ctx.req)) as Query;
	const models = ctx.joplin.models;

	console.info(`Action: ${query.action}`);

	if (query.action === 'createTestUsers') {
		const options: CreateTestUsersOptions = {};

		if ('count' in query) options.count = query.count;
		if ('fromNum' in query) options.fromNum = query.fromNum;

		await createTestUsers(ctx.joplin.db, config(), options);
	}

	if (query.action === 'createUserDeletions') {
		await createUserDeletions(ctx.joplin.db, config());
	}

	if (query.action === 'clearDatabase') {
		await clearDatabase(ctx.joplin.db);
	}

	if (query.action === 'clearKeyValues') {
		await models.keyValue().deleteAll();
	}
});

export default router;
