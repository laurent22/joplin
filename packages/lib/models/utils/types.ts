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
	whereParams?: (string | number | boolean)[];
	order?: {
		by: string;
		dir: string;
		caseInsensitive?: boolean;
	}[];
	limit?: number;
	includeConflicts?: boolean;
	includeDeleted?: boolean;
	useNoteLock?: boolean;
}

export interface FolderLoadOptions extends LoadOptions {
	includeConflictFolder?: boolean;
	includeTrash?: boolean;
}

export interface SaveOptions {
	isNew?: boolean;
	oldItem?: Record<string, unknown>;
	fields?: string[];
	userSideValidation?: boolean;
	nextQueries?: SqlQuery[];
	autoTimestamp?: boolean;
	provisional?: boolean;
	ignoreProvisionalFlag?: boolean;
	dispatchUpdateAction?: boolean;
	dispatchOptions?: { preserveSelection: boolean };
	disableReadOnlyCheck?: boolean;
	useNoteLock?: boolean;

	changeSource?: number;

	// The changeId is included in events emitted by some .save calls. Use this to pair a call
	// to Item.save(...) with events emitted by that call.
	changeId?: string;
}
