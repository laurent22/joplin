import { createPaginationLinks, filterPaginationQueryParams, PageLink, pageMaxSize, Pagination, PaginationOrder, PaginationOrderDir, PaginationQueryParams, requestPaginationOrder, validatePagination } from '../../models/utils/pagination';
import { setQueryParameters } from '../urlUtils';

const defaultSortOrder = PaginationOrderDir.ASC;

function headerIsSelectedClass(name: string, pagination: Pagination): string {
	const orderBy = pagination.order[0].by;
	return name === orderBy ? 'is-selected' : '';
}

function headerSortIconDir(name: string, pagination: Pagination): string {
	const orderBy = pagination.order[0].by;
	const orderDir = orderBy === name ? pagination.order[0].dir : defaultSortOrder;
	return orderDir === PaginationOrderDir.ASC ? 'up' : 'down';

}

function headerNextOrder(name: string, pagination: Pagination): PaginationOrderDir {
	if (name !== pagination.order[0].by) return defaultSortOrder;
	return pagination.order[0].dir === PaginationOrderDir.ASC ? PaginationOrderDir.DESC : PaginationOrderDir.ASC;
}

export interface Header {
	name: string;
	label: string;
	stretch?: boolean;
}

interface HeaderView {
	label: string;
	sortLink: string;
	classNames: string[];
	iconDir: string;
}

interface RowItem {
	value: string;
	url?: string;
	stretch?: boolean;
}

export type Row = RowItem[];

interface RowItemView {
	value: string;
	classNames: string[];
	url: string;
}

type RowView = RowItemView[];

export interface Table {
	headers: Header[];
	rows: Row[];
	baseUrl: string;
	requestQuery: any;
	pageCount: number;
	pagination: Pagination;
}

export interface TableView {
	headers: HeaderView[];
	rows: RowView[];
	paginationLinks: PageLink[];
}

export function makeTablePagination(query: any, defaultOrderField: string, defaultOrderDir: PaginationOrderDir): Pagination {
	const limit = Number(query.limit) || pageMaxSize;
	const order: PaginationOrder[] = requestPaginationOrder(query, defaultOrderField, defaultOrderDir);
	const page: number = 'page' in query ? Number(query.page) : 1;

	const output: Pagination = { limit, order, page };
	validatePagination(output);
	return output;
}

function makeHeaderView(header: Header, parentBaseUrl: string, baseUrlQuery: PaginationQueryParams, pagination: Pagination): HeaderView {
	return {
		label: header.label,
		sortLink: setQueryParameters(parentBaseUrl, { ...baseUrlQuery, 'order_by': header.name, 'order_dir': headerNextOrder(header.name, pagination) }),
		classNames: [header.stretch ? 'stretch' : 'nowrap', headerIsSelectedClass(header.name, pagination)],
		iconDir: headerSortIconDir(header.name, pagination),
	};
}

function makeRowView(row: Row): RowView {
	return row.map(rowItem => {
		return {
			value: rowItem.value,
			classNames: [rowItem.stretch ? 'stretch' : 'nowrap'],
			url: rowItem.url,
		};
	});
}

export function makeTableView(table: Table): TableView {
	const baseUrlQuery = filterPaginationQueryParams(table.requestQuery);
	const pagination = table.pagination;
	const paginationLinks = createPaginationLinks(pagination.page, table.pageCount, setQueryParameters(table.baseUrl, { ...baseUrlQuery, 'page': 'PAGE_NUMBER' }));

	return {
		headers: table.headers.map(h => makeHeaderView(h, table.baseUrl, baseUrlQuery, pagination)),
		rows: table.rows.map(r => makeRowView(r)),
		paginationLinks,
	};
}

export function tablePartials(): string[] {
	return ['pagination', 'table', 'tableHeader', 'tableRowItem'];
}
