import { ErrorBadRequest } from '../../utils/errors';
import { decodeBase64, encodeBase64 } from '../../utils/base64';
import { ChangePagination, defaultChangePagination } from '../ChangeModel';
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
	limit?: number;
	order?: PaginationOrder[];
	page?: number;
	cursor?: string;
}

export interface PaginatedResults {
	items: any[];
	has_more: boolean;
	cursor?: string;
}

export const pageMaxSize = 100;
const defaultOrderField_ = 'updated_time';
const defaultOrderDir_ = PaginationOrderDir.DESC;

export function defaultPagination(): Pagination {
	return {
		limit: pageMaxSize,
		order: [
			{
				by: defaultOrderField_,
				dir: defaultOrderDir_,
			},
		],
		page: 1,
	};
}

function dbOffset(pagination: Pagination): number {
	return pagination.limit * (pagination.page - 1);
}

export function requestPaginationOrder(query: any, defaultOrderField: string = null, defaultOrderDir: PaginationOrderDir = null): PaginationOrder[] {
	if (defaultOrderField === null) defaultOrderField = defaultOrderField_;
	if (defaultOrderDir === null) defaultOrderDir = defaultOrderDir_;

	const orderBy: string = 'order_by' in query ? query.order_by : defaultOrderField;
	const orderDir: PaginationOrderDir = 'order_dir' in query ? query.order_dir : defaultOrderDir;

	if (![PaginationOrderDir.ASC, PaginationOrderDir.DESC].includes(orderDir)) throw new ErrorBadRequest(`Invalid order_dir parameter: ${orderDir}`);

	return [{
		by: orderBy,
		dir: orderDir,
	}];
}

export function validatePagination(p: Pagination): Pagination {
	if (p.limit < 0 || p.limit > pageMaxSize) throw new ErrorBadRequest(`Limit out of bond: ${p.limit}`);
	if (p.page <= 0) throw new ErrorBadRequest(`Invalid page number: ${p.page}`);

	for (const o of p.order) {
		if (![PaginationOrderDir.ASC, PaginationOrderDir.DESC].includes(o.dir)) throw new ErrorBadRequest(`Invalid order_dir parameter: ${o.dir}`);
	}

	return p;
}

function processCursor(pagination: Pagination): Pagination {
	// If a cursor is present, we parse it and move to the next page.
	if (pagination.cursor) {
		const p = validatePagination(JSON.parse(decodeBase64(pagination.cursor)));
		p.page++;
		return p;
	}

	return pagination as Pagination;
}

export function requestPagination(query: any): Pagination {
	if (!query) return defaultPagination();

	if ('cursor' in query) {
		return processCursor(query);
	}

	const limit = 'limit' in query ? query.limit : pageMaxSize;
	const order: PaginationOrder[] = requestPaginationOrder(query);
	const page: number = 'page' in query ? query.page : 1;

	return validatePagination({ limit, order, page });
}

export function requestChangePagination(query: any): ChangePagination {
	if (!query) return defaultChangePagination();

	const output: ChangePagination = {};
	if ('limit' in query) output.limit = query.limit;
	if ('cursor' in query) output.cursor = query.cursor;
	return output;
}

export interface PageLink {
	page?: number;
	isEllipsis?: boolean;
	isCurrent?: boolean;
	url?: string;
}

export function createPaginationLinks(page: number, pageCount: number, urlTemplate: string = null): PageLink[] {
	if (!pageCount) return [];

	let output: PageLink[] = [];
	const firstPage: number = Math.max(page - 2, 1);

	for (let p = firstPage; p <= firstPage + 4; p++) {
		if (p > pageCount) break;
		output.push({ page: p });
	}

	const firstPages: PageLink[] = [];
	for (let p = 1; p <= 2; p++) {
		if (output.find(o => o.page === p) || p > pageCount) continue;
		firstPages.push({ page: p });
	}

	if (firstPages.length && (output[0].page - firstPages[firstPages.length - 1].page) > 1) {
		firstPages.push({ isEllipsis: true });
	}

	output = firstPages.concat(output);

	const lastPages: PageLink[] = [];
	for (let p = pageCount - 1; p <= pageCount; p++) {
		if (output.find(o => o.page === p) || p > pageCount || p < 1) continue;
		lastPages.push({ page: p });
	}

	if (lastPages.length && (lastPages[0].page - output[output.length - 1].page) > 1) {
		output.push({ isEllipsis: true });
	}

	output = output.concat(lastPages);

	output = output.map(o => {
		return o.page === page ? { ...o, isCurrent: true } : o;
	});

	if (urlTemplate) {
		output = output.map(o => {
			if (o.isEllipsis) return o;
			return { ...o, url: urlTemplate.replace(/PAGE_NUMBER/, o.page.toString()) };
		});
	}

	return output;
}

export async function paginateDbQuery(query: Knex.QueryBuilder, pagination: Pagination): Promise<PaginatedResults> {
	pagination = processCursor(pagination);

	const orderSql: any[] = pagination.order.map(o => {
		return {
			column: o.by,
			order: o.dir,
		};
	});

	const items = await query
		.orderBy(orderSql)
		.offset(dbOffset(pagination))
		.limit(pagination.limit);

	const hasMore = items.length >= pagination.limit;

	return {
		items,
		has_more: hasMore,
		cursor: hasMore ? encodeBase64(JSON.stringify(pagination)) : null,
	};
}
