import { SubPath } from '../../utils/routeUtils';
import Router from '../../utils/Router';
import { RouteType } from '../../utils/types';
import { AppContext } from '../../utils/types';
import { putItemContents } from './items';
import { PaginatedResults } from '../../models/utils/pagination';

const router = new Router(RouteType.Api);

router.put('api/batch_items', async (path: SubPath, ctx: AppContext) => {
	const output: PaginatedResults<any> = {
		items: await putItemContents(path, ctx, true) as any,
		has_more: false,
	};

	return output;
});

export default router;
