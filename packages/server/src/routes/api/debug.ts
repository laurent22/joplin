/* eslint-disable no-console */

import config from '../../config';
import { bodyFields } from '../../utils/requestUtils';
import Router from '../../utils/Router';
import { Env, RouteType } from '../../utils/types';
import { SubPath } from '../../utils/routeUtils';
import { AppContext } from '../../utils/types';
import { ErrorForbidden } from '../../utils/errors';
import createTestUsers, { CreateTestUsersOptions } from '../../tools/debug/createTestUsers';
import benchmarkDeltaPerformance from '../../tools/benchmark/benchmarkDeltaPerformance';
import createUserDeletions from '../../tools/debug/createUserDeletions';
import clearDatabase from '../../tools/debug/clearDatabase';
import populateDatabase from '../../tools/debug/populateDatabase';
import uuid from '@joplin/lib/uuid';

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

	if (query.action === 'benchmarkDeltaPerformance') {
		await benchmarkDeltaPerformance(ctx.joplin.models);
	}

	if (query.action === 'populateDatabase') {
		const size = 'size' in query ? Number(query.size) : 1;
		const actionCount = (() => {
			if (size === 1) return 1024;
			if (size === 2) return 4096;
			return 1024 * 1024;
		})();

		await populateDatabase(ctx.joplin.models, {
			actionCount,
			userCount: 10,
			userPrefix: uuid.create(),
		});
	}
});

export default router;
