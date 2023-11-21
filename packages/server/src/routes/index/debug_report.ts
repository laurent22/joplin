import { SubPath } from '../../utils/routeUtils';
import Router from '../../utils/Router';
import { RouteType } from '../../utils/types';
import { AppContext } from '../../utils/types';
import { ErrorMethodNotAllowed } from '../../utils/errors';
import { contextSessionId } from '../../utils/requestUtils';

const router = new Router(RouteType.Web);

router.get('debug_report', async (_path: SubPath, ctx: AppContext) => {
	contextSessionId(ctx);

	if (ctx.method !== 'GET') {
		throw new ErrorMethodNotAllowed();
	}

	const outputLines = [];
	const startTime = Date.now();

	const exceededTimeLimit = () => {
		return Date.now() - startTime > 250;
	};

	const itemModel = ctx.joplin.models.item();
	const userId = ctx.joplin.owner.id;

	const formatItemId = (id: string) => id;

	// Start by logging all changes
	outputLines.push('# Changes:', '');

	const changeModel = ctx.joplin.models.change();
	const changes = await changeModel.delta(userId, { limit: 10_000 });

	for (const change of changes.items) {
		outputLines.push(`\t${formatItemId(change.item_name)}:\tupdated @ ${change.jop_updated_time}, type: ${change.type}`);
	}

	if (changes.has_more) {
		outputLines.push('...', '');
	}

	let cursor;
	let allItems;
	let page = 1;

	// Log all items
	outputLines.push('');
	outputLines.push('# All items:');
	outputLines.push('');

	while (!allItems || allItems.has_more) {
		allItems = await itemModel.children(userId, '', { page, cursor });
		cursor = allItems.cursor;
		page ++;

		const newLines = allItems.items.map(item =>
			`\t${formatItemId(item.name)}:\t(update @ ${item.updated_time})`,
		);
		outputLines.push(...newLines);

		if (exceededTimeLimit()) {
			outputLines.push('Exceeded time limit.');
			break;
		}
	}

	outputLines.push('', `Done in ${(Date.now() - startTime) / 1000}s`);

	return outputLines.join('\n');
});

export default router;
