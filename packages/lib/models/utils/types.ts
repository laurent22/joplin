import { SqlQuery } from '../../database';

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

export interface SaveOptions {
	isNew?: boolean;
	oldItem?: any;
	userSideValidation?: boolean;
	nextQueries?: SqlQuery[];
	autoTimestamp?: boolean;
	provisional?: boolean;
	ignoreProvisionalFlag?: boolean;
	dispatchUpdateAction?: boolean;
	changeSource?: number;
	disableReadOnlyCheck?: boolean;
}
