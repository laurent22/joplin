import { ModelType } from "../../BaseModel";

export interface BaseItemEntity {
  id?: string;
  encryption_applied?: number;

  // Means the item (note or resource) is published
  is_shared?: number;

  // Means the item (note, folder or resource) is shared, as part of a shared
  // notebook
  share_id?: string;
  type_?: ModelType;
  updated_time?: number;
  created_time?: number;
}

export type SqlParams = any[];

export interface SqlQuery {
	sql: string;
	params?: SqlParams;
}

export type StringOrSqlQuery = string | SqlQuery;

export type Migration = () => (SqlQuery|string)[];

export enum FolderIconType {
  Emoji = 1,
  DataUrl = 2,
  FontAwesome = 3,
}

export interface FolderIcon {
  type: FolderIconType;
	emoji: string;
	name: string;
  dataUrl: string;
}

export const defaultFolderIcon = () => {
  const icon:FolderIcon = {
    type: FolderIconType.Emoji,
    emoji: '',
    name: '',
    dataUrl: '',
  };
  return icon;
}

export interface UserDataValue {
  v: any; // value
  t: Number; // timestamp
  d?: Number; // deleted - 0 or 1 (default = 0)
}

export enum ResourceOcrStatus {
	Todo = 0,
	Processing = 1,
	Done = 2,
	Error = 3,
}

export type UserData = Record<string, Record<string, UserDataValue>>;

interface DatabaseTableColumn {
	type: string;
}

interface DatabaseTable {
	[key: string]: DatabaseTableColumn;
}

interface DatabaseTables {
	[key: string]: DatabaseTable;
}

// AUTO-GENERATED BY packages/tools/generate-database-types.js

/*
* This file was generated by a tool.
* Rerun sql-ts to regenerate this file.
*/
export interface AlarmEntity {
  'id'?: number | null;
  'note_id'?: string;
  'trigger_time'?: number;
  'type_'?: number;
}
export interface DeletedItemEntity {
  'deleted_time'?: number;
  'id'?: number | null;
  'item_id'?: string;
  'item_type'?: number;
  'sync_target'?: number;
  'type_'?: number;
}
export interface FolderEntity {
  'created_time'?: number;
  'deleted_time'?: number;
  'encryption_applied'?: number;
  'encryption_cipher_text'?: string;
  'icon'?: string;
  'id'?: string | null;
  'is_shared'?: number;
  'master_key_id'?: string;
  'parent_id'?: string;
  'share_id'?: string;
  'title'?: string;
  'updated_time'?: number;
  'user_created_time'?: number;
  'user_data'?: string;
  'user_updated_time'?: number;
  'type_'?: number;
}
export interface ItemChangeEntity {
  'before_change_item'?: string;
  'created_time'?: number;
  'id'?: number | null;
  'item_id'?: string;
  'item_type'?: number;
  'source'?: number;
  'type'?: number;
  'type_'?: number;
}
export interface ItemsFtEntity {
  'body'?: any | null;
  'id'?: any | null;
  'item_id'?: any | null;
  'item_type'?: any | null;
  'reserved1'?: any | null;
  'reserved2'?: any | null;
  'reserved3'?: any | null;
  'reserved4'?: any | null;
  'reserved5'?: any | null;
  'reserved6'?: any | null;
  'title'?: any | null;
  'user_updated_time'?: any | null;
  'type_'?: number;
}
export interface ItemsFtsDocsizeEntity {
  'docid'?: number | null;
  'size'?: any | null;
  'type_'?: number;
}
export interface ItemsFtsSegdirEntity {
  'end_block'?: number | null;
  'idx'?: number | null;
  'leaves_end_block'?: number | null;
  'level'?: number | null;
  'root'?: any | null;
  'start_block'?: number | null;
  'type_'?: number;
}
export interface ItemsFtsSegmentEntity {
  'block'?: any | null;
  'blockid'?: number | null;
  'type_'?: number;
}
export interface ItemsFtsStatEntity {
  'id'?: number | null;
  'value'?: any | null;
  'type_'?: number;
}
export interface ItemsNormalizedEntity {
  'body'?: string;
  'id'?: number | null;
  'item_id'?: string;
  'item_type'?: number;
  'reserved1'?: number | null;
  'reserved2'?: number | null;
  'reserved3'?: number | null;
  'reserved4'?: number | null;
  'reserved5'?: number | null;
  'reserved6'?: number | null;
  'title'?: string;
  'user_updated_time'?: number;
  'type_'?: number;
}
export interface KeyValueEntity {
  'id'?: number | null;
  'key'?: string;
  'type'?: number;
  'updated_time'?: number;
  'value'?: string;
  'type_'?: number;
}
export interface MigrationEntity {
  'created_time'?: number;
  'id'?: number | null;
  'number'?: number;
  'updated_time'?: number;
  'type_'?: number;
}
export interface NoteResourceEntity {
  'id'?: number | null;
  'is_associated'?: number;
  'last_seen_time'?: number;
  'note_id'?: string;
  'resource_id'?: string;
  'type_'?: number;
}
export interface NoteTagEntity {
  'created_time'?: number;
  'encryption_applied'?: number;
  'encryption_cipher_text'?: string;
  'id'?: string | null;
  'is_shared'?: number;
  'note_id'?: string;
  'tag_id'?: string;
  'updated_time'?: number;
  'user_created_time'?: number;
  'user_updated_time'?: number;
  'type_'?: number;
}
export interface NoteEntity {
  'altitude'?: number;
  'application_data'?: string;
  'author'?: string;
  'body'?: string;
  'conflict_original_id'?: string;
  'created_time'?: number;
  'deleted_time'?: number;
  'encryption_applied'?: number;
  'encryption_cipher_text'?: string;
  'id'?: string | null;
  'is_conflict'?: number;
  'is_shared'?: number;
  'is_todo'?: number;
  'latitude'?: number;
  'longitude'?: number;
  'markup_language'?: number;
  'master_key_id'?: string;
  'order'?: number;
  'parent_id'?: string;
  'share_id'?: string;
  'source'?: string;
  'source_application'?: string;
  'source_url'?: string;
  'title'?: string;
  'todo_completed'?: number;
  'todo_due'?: number;
  'updated_time'?: number;
  'user_created_time'?: number;
  'user_data'?: string;
  'user_updated_time'?: number;
  'type_'?: number;
}
export interface NotesNormalizedEntity {
  'altitude'?: number;
  'body'?: string;
  'id'?: string;
  'is_todo'?: number;
  'latitude'?: number;
  'longitude'?: number;
  'parent_id'?: string;
  'source_url'?: string;
  'title'?: string;
  'todo_completed'?: number;
  'todo_due'?: number;
  'user_created_time'?: number;
  'user_updated_time'?: number;
  'type_'?: number;
}
export interface ResourceLocalStateEntity {
  'fetch_error'?: string;
  'fetch_status'?: number;
  'id'?: number | null;
  'resource_id'?: string;
  'type_'?: number;
}
export interface ResourceEntity {
  'blob_updated_time'?: number;
  'created_time'?: number;
  'encryption_applied'?: number;
  'encryption_blob_encrypted'?: number;
  'encryption_cipher_text'?: string;
  'file_extension'?: string;
  'filename'?: string;
  'id'?: string | null;
  'is_shared'?: number;
  'master_key_id'?: string;
  'mime'?: string;
  'ocr_details'?: string;
  'ocr_error'?: string;
  'ocr_status'?: number;
  'ocr_text'?: string;
  'share_id'?: string;
  'size'?: number;
  'title'?: string;
  'updated_time'?: number;
  'user_created_time'?: number;
  'user_data'?: string;
  'user_updated_time'?: number;
  'type_'?: number;
}
export interface ResourcesToDownloadEntity {
  'created_time'?: number;
  'id'?: number | null;
  'resource_id'?: string;
  'updated_time'?: number;
  'type_'?: number;
}
export interface RevisionEntity {
  'body_diff'?: string;
  'created_time'?: number;
  'encryption_applied'?: number;
  'encryption_cipher_text'?: string;
  'id'?: string | null;
  'item_id'?: string;
  'item_type'?: number;
  'item_updated_time'?: number;
  'metadata_diff'?: string;
  'parent_id'?: string;
  'title_diff'?: string;
  'updated_time'?: number;
  'type_'?: number;
}
export interface SettingEntity {
  'key'?: string | null;
  'value'?: string | null;
  'type_'?: number;
}
export interface SyncItemEntity {
  'force_sync'?: number;
  'id'?: number | null;
  'item_id'?: string;
  'item_location'?: number;
  'item_type'?: number;
  'sync_disabled'?: number;
  'sync_disabled_reason'?: string;
  'sync_warning_dismissed'?: number;
  'sync_target'?: number;
  'sync_time'?: number;
  'type_'?: number;
}
export interface TableFieldEntity {
  'field_default'?: string | null;
  'field_name'?: string;
  'field_type'?: number;
  'id'?: number | null;
  'table_name'?: string;
  'type_'?: number;
}
export interface TagEntity {
  'created_time'?: number;
  'encryption_applied'?: number;
  'encryption_cipher_text'?: string;
  'id'?: string | null;
  'is_shared'?: number;
  'parent_id'?: string;
  'title'?: string;
  'updated_time'?: number;
  'user_created_time'?: number;
  'user_data'?: string;
  'user_updated_time'?: number;
  'type_'?: number;
}
export interface TagsWithNoteCountEntity {
  'created_time'?: number | null;
  'id'?: string | null;
  'note_count'?: any | null;
  'title'?: string | null;
  'todo_completed_count'?: any | null;
  'updated_time'?: number | null;
  'type_'?: number;
}
export interface VersionEntity {
  'table_fields_version'?: number;
  'version'?: number;
  'type_'?: number;
}


export const databaseSchema: DatabaseTables = {
	folders: {
		created_time: { type: 'number' },
		deleted_time: { type: 'number' },
		encryption_applied: { type: 'number' },
		encryption_cipher_text: { type: 'string' },
		icon: { type: 'string' },
		id: { type: 'string' },
		is_shared: { type: 'number' },
		master_key_id: { type: 'string' },
		parent_id: { type: 'string' },
		share_id: { type: 'string' },
		title: { type: 'string' },
		updated_time: { type: 'number' },
		user_created_time: { type: 'number' },
		user_data: { type: 'string' },
		user_updated_time: { type: 'number' },
		type_: { type: 'number' },
	},
	tags: {
		created_time: { type: 'number' },
		encryption_applied: { type: 'number' },
		encryption_cipher_text: { type: 'string' },
		id: { type: 'string' },
		is_shared: { type: 'number' },
		parent_id: { type: 'string' },
		title: { type: 'string' },
		updated_time: { type: 'number' },
		user_created_time: { type: 'number' },
		user_data: { type: 'string' },
		user_updated_time: { type: 'number' },
		type_: { type: 'number' },
	},
	note_tags: {
		created_time: { type: 'number' },
		encryption_applied: { type: 'number' },
		encryption_cipher_text: { type: 'string' },
		id: { type: 'string' },
		is_shared: { type: 'number' },
		note_id: { type: 'string' },
		tag_id: { type: 'string' },
		updated_time: { type: 'number' },
		user_created_time: { type: 'number' },
		user_updated_time: { type: 'number' },
		type_: { type: 'number' },
	},
	table_fields: {
		field_default: { type: 'string' },
		field_name: { type: 'string' },
		field_type: { type: 'number' },
		id: { type: 'number' },
		table_name: { type: 'string' },
		type_: { type: 'number' },
	},
	sync_items: {
		force_sync: { type: 'number' },
		id: { type: 'number' },
		item_id: { type: 'string' },
		item_location: { type: 'number' },
		item_type: { type: 'number' },
		sync_disabled: { type: 'number' },
		sync_disabled_reason: { type: 'string' },
		sync_warning_dismissed: { type: 'number' },
		sync_target: { type: 'number' },
		sync_time: { type: 'number' },
		type_: { type: 'number' },
	},
	version: {
		table_fields_version: { type: 'number' },
		version: { type: 'number' },
		type_: { type: 'number' },
	},
	deleted_items: {
		deleted_time: { type: 'number' },
		id: { type: 'number' },
		item_id: { type: 'string' },
		item_type: { type: 'number' },
		sync_target: { type: 'number' },
		type_: { type: 'number' },
	},
	settings: {
		key: { type: 'string' },
		value: { type: 'string' },
		type_: { type: 'number' },
	},
	alarms: {
		id: { type: 'number' },
		note_id: { type: 'string' },
		trigger_time: { type: 'number' },
		type_: { type: 'number' },
	},
	item_changes: {
		before_change_item: { type: 'string' },
		created_time: { type: 'number' },
		id: { type: 'number' },
		item_id: { type: 'string' },
		item_type: { type: 'number' },
		source: { type: 'number' },
		type: { type: 'number' },
		type_: { type: 'number' },
	},
	note_resources: {
		id: { type: 'number' },
		is_associated: { type: 'number' },
		last_seen_time: { type: 'number' },
		note_id: { type: 'string' },
		resource_id: { type: 'string' },
		type_: { type: 'number' },
	},
	resource_local_states: {
		fetch_error: { type: 'string' },
		fetch_status: { type: 'number' },
		id: { type: 'number' },
		resource_id: { type: 'string' },
		type_: { type: 'number' },
	},
	resources: {
		blob_updated_time: { type: 'number' },
		created_time: { type: 'number' },
		encryption_applied: { type: 'number' },
		encryption_blob_encrypted: { type: 'number' },
		encryption_cipher_text: { type: 'string' },
		file_extension: { type: 'string' },
		filename: { type: 'string' },
		id: { type: 'string' },
		is_shared: { type: 'number' },
		master_key_id: { type: 'string' },
		mime: { type: 'string' },
		ocr_details: { type: 'string' },
		ocr_error: { type: 'string' },
		ocr_status: { type: 'number' },
		ocr_text: { type: 'string' },
		share_id: { type: 'string' },
		size: { type: 'number' },
		title: { type: 'string' },
		updated_time: { type: 'number' },
		user_created_time: { type: 'number' },
		user_data: { type: 'string' },
		user_updated_time: { type: 'number' },
		type_: { type: 'number' },
	},
	revisions: {
		body_diff: { type: 'string' },
		created_time: { type: 'number' },
		encryption_applied: { type: 'number' },
		encryption_cipher_text: { type: 'string' },
		id: { type: 'string' },
		item_id: { type: 'string' },
		item_type: { type: 'number' },
		item_updated_time: { type: 'number' },
		metadata_diff: { type: 'string' },
		parent_id: { type: 'string' },
		title_diff: { type: 'string' },
		updated_time: { type: 'number' },
		type_: { type: 'number' },
	},
	migrations: {
		created_time: { type: 'number' },
		id: { type: 'number' },
		number: { type: 'number' },
		updated_time: { type: 'number' },
		type_: { type: 'number' },
	},
	resources_to_download: {
		created_time: { type: 'number' },
		id: { type: 'number' },
		resource_id: { type: 'string' },
		updated_time: { type: 'number' },
		type_: { type: 'number' },
	},
	key_values: {
		id: { type: 'number' },
		key: { type: 'string' },
		type: { type: 'number' },
		updated_time: { type: 'number' },
		value: { type: 'string' },
		type_: { type: 'number' },
	},
	notes: {
		altitude: { type: 'number' },
		application_data: { type: 'string' },
		author: { type: 'string' },
		body: { type: 'string' },
		conflict_original_id: { type: 'string' },
		created_time: { type: 'number' },
		deleted_time: { type: 'number' },
		encryption_applied: { type: 'number' },
		encryption_cipher_text: { type: 'string' },
		id: { type: 'string' },
		is_conflict: { type: 'number' },
		is_shared: { type: 'number' },
		is_todo: { type: 'number' },
		latitude: { type: 'number' },
		longitude: { type: 'number' },
		markup_language: { type: 'number' },
		master_key_id: { type: 'string' },
		order: { type: 'number' },
		parent_id: { type: 'string' },
		share_id: { type: 'string' },
		source: { type: 'string' },
		source_application: { type: 'string' },
		source_url: { type: 'string' },
		title: { type: 'string' },
		todo_completed: { type: 'number' },
		todo_due: { type: 'number' },
		updated_time: { type: 'number' },
		user_created_time: { type: 'number' },
		user_data: { type: 'string' },
		user_updated_time: { type: 'number' },
		type_: { type: 'number' },
	},
	notes_normalized: {
		altitude: { type: 'number' },
		body: { type: 'string' },
		id: { type: 'string' },
		is_todo: { type: 'number' },
		latitude: { type: 'number' },
		longitude: { type: 'number' },
		parent_id: { type: 'string' },
		source_url: { type: 'string' },
		title: { type: 'string' },
		todo_completed: { type: 'number' },
		todo_due: { type: 'number' },
		user_created_time: { type: 'number' },
		user_updated_time: { type: 'number' },
		type_: { type: 'number' },
	},
	items_normalized: {
		body: { type: 'string' },
		id: { type: 'number' },
		item_id: { type: 'string' },
		item_type: { type: 'number' },
		reserved1: { type: 'number' },
		reserved2: { type: 'number' },
		reserved3: { type: 'number' },
		reserved4: { type: 'number' },
		reserved5: { type: 'number' },
		reserved6: { type: 'number' },
		title: { type: 'string' },
		user_updated_time: { type: 'number' },
		type_: { type: 'number' },
	},
	items_fts: {
		body: { type: 'any' },
		id: { type: 'any' },
		item_id: { type: 'any' },
		item_type: { type: 'any' },
		reserved1: { type: 'any' },
		reserved2: { type: 'any' },
		reserved3: { type: 'any' },
		reserved4: { type: 'any' },
		reserved5: { type: 'any' },
		reserved6: { type: 'any' },
		title: { type: 'any' },
		user_updated_time: { type: 'any' },
		type_: { type: 'number' },
	},
	items_fts_segments: {
		block: { type: 'any' },
		blockid: { type: 'number' },
		type_: { type: 'number' },
	},
	items_fts_segdir: {
		end_block: { type: 'number' },
		idx: { type: 'number' },
		leaves_end_block: { type: 'number' },
		level: { type: 'number' },
		root: { type: 'any' },
		start_block: { type: 'number' },
		type_: { type: 'number' },
	},
	items_fts_docsize: {
		docid: { type: 'number' },
		size: { type: 'any' },
		type_: { type: 'number' },
	},
	items_fts_stat: {
		id: { type: 'number' },
		value: { type: 'any' },
		type_: { type: 'number' },
	},
	tags_with_note_count: {
		created_time: { type: 'number' },
		id: { type: 'string' },
		note_count: { type: 'any' },
		title: { type: 'string' },
		todo_completed_count: { type: 'any' },
		updated_time: { type: 'number' },
		type_: { type: 'number' },
	},
};