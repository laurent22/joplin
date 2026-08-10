import { SqlQuery } from '../../services/database/types';
import type { DecryptedNoteLockKey } from '../../services/noteLock/NoteLockKey';

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
	// Encrypt with this key captured when the note was decrypted, instead of the live session key.
	// Lets a pending editor save complete after the session locks; a real key rotation still aborts it.
	noteLockKey?: DecryptedNoteLockKey;

	changeSource?: number;

	// The changeId is included in events emitted by some .save calls. Use this to pair a call
	// to Item.save(...) with events emitted by that call.
	changeId?: string;
}
