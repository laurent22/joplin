import { createPaginationLinks, PageLink, pageMaxSize, Pagination, PaginationOrder, PaginationOrderDir, PaginationQueryParams, requestPaginationOrder, validatePagination } from '../../models/utils/pagination';
import { setQueryParameters } from '../urlUtils';

const defaultSortOrder = PaginationOrderDir.ASC;

function headerIsSelectedClass(name: string, pagination: Pagination): string {
	if (!pagination) return '';
	const orderBy = pagination.order[0].by;
	return name === orderBy ? 'is-selected' : '';
}

function headerSortIconDir(name: string, pagination: Pagination): string {
	if (!pagination) return '';
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
	canSort?: boolean;
}

interface HeaderView {
	label: string;
	sortLink: string;
	classNames: string[];
	iconDir: string;
}

export type RowItemRenderCallback = ()=> string;

interface RowItem {
	value: string;
	checkbox?: boolean;
	url?: string;
	stretch?: boolean;
	hint?: string;
	render?: RowItemRenderCallback;
	classNames?: string[];
}

export interface Row {
	classNames?: string[];
	items: RowItem[];
}

interface RowItemView {
	value: string;
	valueHtml: string;
	classNames: string[];
	url: string;
	checkbox: boolean;
	hint: string;
}

interface RowView {
	classNames: string[];
	items: RowItemView[];
}

export interface Table {
	headers: Header[];
	rows: Row[];
	baseUrl?: string;
	requestQuery?: any;
	pageCount?: number;
	pagination?: Pagination;
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
	const canSort = header.canSort !== false;

	return {
		label: header.label,
		sortLink: !pagination || !canSort ? null : setQueryParameters(parentBaseUrl, { ...baseUrlQuery, 'order_by': header.name, 'order_dir': headerNextOrder(header.name, pagination) }),
		classNames: [header.stretch ? 'stretch' : 'nowrap', headerIsSelectedClass(header.name, pagination)],
		iconDir: headerSortIconDir(header.name, pagination),
	};
}

function makeRowView(row: Row): RowView {
	return {
		classNames: row.classNames,
		items: row.items.map(rowItem => {
			let classNames = [rowItem.stretch ? 'stretch' : 'nowrap'];
			if (rowItem.classNames) classNames = classNames.concat(rowItem.classNames);

			return {
				value: rowItem.value,
				valueHtml: rowItem.render ? rowItem.render() : '',
				classNames,
				url: rowItem.url,
				checkbox: rowItem.checkbox,
				hint: rowItem.hint,
			};
		}),
	};
}

export function makeTableView(table: Table): TableView {
	let paginationLinks: PageLink[] = [];
	let baseUrlQuery: PaginationQueryParams = null;
	let pagination: Pagination = null;

	if (table.pageCount) {
		if (!table.baseUrl || !table.requestQuery) throw new Error('Table.baseUrl and Table.requestQuery are required for pagination when there is more than one page');

		baseUrlQuery = table.requestQuery; // filterPaginationQueryParams(table.requestQuery);
		pagination = table.pagination;
		paginationLinks = createPaginationLinks(pagination.page, table.pageCount, setQueryParameters(table.baseUrl, { ...baseUrlQuery, 'page': 'PAGE_NUMBER' }));
	}

	return {
		headers: table.headers.map(h => makeHeaderView(h, table.baseUrl, baseUrlQuery, pagination)),
		rows: table.rows.map(r => makeRowView(r)),
		paginationLinks,
	};
}

export function tablePartials(): string[] {
	return ['pagination', 'table', 'tableHeader', 'tableRowItem'];
}

export const renderUserIcon = () => {
	return '<i class="fas fa-user-alt"></i>';
};
