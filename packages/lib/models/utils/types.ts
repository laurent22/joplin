export enum PaginationOrderDir {
	ASC = 'ASC',
	DESC = 'DESC',
}

export interface PaginationOrder {
	by: string;
	dir: PaginationOrderDir;
	caseInsensitive: boolean;
}

export interface Pagination {
	limit: number;
	order: PaginationOrder[];
	page: number;
	caseInsensitive?: boolean;
}

export interface LoadOptions {
	caseInsensitive?: boolean;
	fields?: string | string[];
}
