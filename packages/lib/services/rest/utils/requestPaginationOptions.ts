import { Pagination, PaginationOrder, PaginationOrderDir } from '../../../models/utils/types';
import { Request } from '../Api';
import { ErrorBadRequest } from './errors';
import validateField from './validateField';

function requestPaginationOrder(request: Request): PaginationOrder[] {
	const orderBy = request.query.order_by ? validateField(request.query.order_by) : 'updated_time';

	let orderDir: PaginationOrderDir = PaginationOrderDir.ASC;
	if (typeof request.query.order_dir === 'string' && request.query.order_dir.toUpperCase() === 'DESC') {
		orderDir = PaginationOrderDir.DESC;
	}

	return [{
		by: orderBy,
		dir: orderDir,
		caseInsensitive: true,
	}];
}

const requestLimit = (request: Request) => {
	const limit = request.query.limit ? Number(request.query.limit) : 100;
	if (!Number.isInteger(limit)) throw new ErrorBadRequest(`Invalid limit: ${JSON.stringify(limit)}`);
	if (limit < 0 || limit > 100) throw new ErrorBadRequest(`Limit out of bond: ${limit}`);
	return limit;
};

const requestPage = (request: Request) => {
	const page = Number(request.query.page || 1);
	if (!Number.isInteger(page)) throw new ErrorBadRequest(`Invalid page: ${page}`);
	return page;
};

export default function(request: Request): Pagination {
	const limit = requestLimit(request);
	const order = requestPaginationOrder(request);
	const page = requestPage(request);

	return { limit, order, page };
}
