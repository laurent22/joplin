import { Pagination, PaginationOrder, PaginationOrderDir } from '../../../models/utils/types';
import { Request } from '../Api';
import { ErrorBadRequest } from './errors';

function requestPaginationOrder(request: Request): PaginationOrder[] {
	const orderBy: string = request.query.order_by ? request.query.order_by : 'updated_time';
	const orderDir: PaginationOrderDir = request.query.order_dir ? request.query.order_dir : PaginationOrderDir.ASC;

	return [{
		by: orderBy,
		dir: orderDir,
		caseInsensitive: true,
	}];
}

export default function(request: Request): Pagination {
	const limit = request.query.limit ? request.query.limit : 100;
	if (limit < 0 || limit > 100) throw new ErrorBadRequest(`Limit out of bond: ${limit}`);
	const order: PaginationOrder[] = requestPaginationOrder(request);
	const page: number = request.query.page || 1;

	return { limit, order, page };
}
