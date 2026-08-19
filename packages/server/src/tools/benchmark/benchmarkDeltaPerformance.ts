import { Models } from '../../models/factory';
import { ShareType, Uuid } from '../../services/database/types';
import recordBenchmark from './recordBenchmark';

const benchmarkDeltaPerformance = async (models: Models) => {
	const iterateUsers = async function*() {
		let page = 1;
		let hasMore = true;
		while (hasMore) {
			const batchSize = 50;
			const items = await models.user().allPaginated({ page: page++, limit: batchSize });
			hasMore = items.has_more;

			const users = items.items;
			yield await Promise.all(users.map(async user => {
				const userItemCount = await models.userItem().countWithUserId(user.id);
				const shareCount = (await models.share().byUserId(user.id, ShareType.Folder)).length;

				return {
					labels: {
						'User ID': user.id,
						'Share count': shareCount,
						'user_items count': userItemCount,
						'Total item size': user.total_item_size,
					},
					data: user.id,
				};
			}));
		}
	};

	await recordBenchmark<Uuid>({
		taskLabel: 'full delta',
		batchIterator: iterateUsers(),
		trialCount: 10,
		outputFile: 'delta-perf-full.csv',
		runTask: async (userId) => {
			await models.change().delta(userId, { cursor: '', limit: 200 });
		},
	});
	await recordBenchmark<Uuid>({
		taskLabel: 'changes query',
		batchIterator: iterateUsers(),
		trialCount: 10,
		outputFile: 'delta-perf-query-only.csv',
		runTask: async (userId) => {
			await models.change().changesForUserQuery(userId, -1, 200, false);
		},
	});
};

export default benchmarkDeltaPerformance;
