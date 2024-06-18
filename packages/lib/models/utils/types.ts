import { SqlQuery } from '../../services/database/types';

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
	where?: string;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	whereParams?: any[];
	order?: {
		by: string;
		dir: string;
		caseInsensitive?: boolean;
	}[];
	limit?: number;
	includeConflicts?: boolean;
	includeDeleted?: boolean;
}

export interface FolderLoadOptions extends LoadOptions {
	includeConflictFolder?: boolean;
	includeTrash?: boolean;
}

export interface SaveOptions {
	isNew?: boolean;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	oldItem?: any;
	userSideValidation?: boolean;
	nextQueries?: SqlQuery[];
	autoTimestamp?: boolean;
	provisional?: boolean;
	ignoreProvisionalFlag?: boolean;
	dispatchUpdateAction?: boolean;
	dispatchOptions?: { preserveSelection: boolean };
	changeSource?: number;
	disableReadOnlyCheck?: boolean;
}
