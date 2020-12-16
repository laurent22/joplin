import { ErrorBadRequest } from '../../utils/errors';
import Knex = require('knex');

export enum PaginationOrderDir {
	ASC = 'asc',
	DESC = 'desc',
}

export interface PaginationOrder {
	by: string;
	dir: PaginationOrderDir;
}

export interface Pagination {
	limit: number;
	order: PaginationOrder[];
	page: number;
}

export interface PaginatedResults {
	items: any[];
	has_more: boolean;
}

const pageMaxSize = 1000;
const defaultOrderField = 'updated_time';
const defaultOrderDir = PaginationOrderDir.DESC;

export function defaultPagination(): Pagination {
	return {
		limit: pageMaxSize,
		order: [
			{
				by: defaultOrderField,
				dir: defaultOrderDir,
			},
		],
		page: 1,
	};
}

function dbOffset(pagination: Pagination): number {
	return pagination.limit * (pagination.page - 1);
}

function requestPaginationOrder(query: any): PaginationOrder[] {
	const orderBy: string = 'order_by' in query ? query.order_by : defaultOrderField;
	const orderDir: PaginationOrderDir = 'order_dir' in query ? query.order_dir : defaultOrderDir;

	if (![PaginationOrderDir.ASC, PaginationOrderDir.DESC].includes(orderDir)) throw new ErrorBadRequest(`Invalid order_dir parameter: ${orderDir}`);

	return [{
		by: orderBy,
		dir: orderDir,
	}];
}

export function requestPagination(query: any): Pagination {
	if (!query) return defaultPagination();

	const limit = 'limit' in query ? query.limit : pageMaxSize;
	if (limit < 0 || limit > pageMaxSize) throw new ErrorBadRequest(`Limit out of bond: ${limit}`);
	const order: PaginationOrder[] = requestPaginationOrder(query);
	const page: number = 'page' in query ? query.page : 1;
	if (page <= 0) throw new ErrorBadRequest(`Invalid page number: ${page}`);

	return { limit, order, page };
}

export async function paginateDbQuery(query: Knex.QueryBuilder, pagination: Pagination): Promise<PaginatedResults> {
	const items = await query
		.orderBy(pagination.order[0].by, pagination.order[0].dir)
		.offset(dbOffset(pagination))
		.limit(pagination.limit);

	return {
		items,
		has_more: items.length >= pagination.limit,
	};
}
