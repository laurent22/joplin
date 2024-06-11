export type Uuid = string;

export enum ItemAddressingType {
	Id = 1,
	Path,
}

export enum NotificationLevel {
	Error = 5,
	Important = 10,
	Normal = 20,
}

export enum ItemType {
	Item = 1,
	UserItem = 2,
	User,
}

export enum EmailSender {
	NoReply = 1,
	Support = 2,
}

export enum ChangeType {
	Create = 1,
	Update = 2,
	Delete = 3,
}

export enum EventType {
	TaskStarted = 1,
	TaskCompleted = 2,
}

export enum BackupItemType {
	UserAccount = 1,
}

export enum UserFlagType {
	FailedPaymentWarning = 1,
	FailedPaymentFinal = 2,
	AccountOverLimit = 3,
	AccountWithoutSubscription = 4,
	SubscriptionCancelled = 5,
	ManuallyDisabled = 6,
	UserDeletionInProgress = 7,
}

export function userFlagTypeToLabel(t: UserFlagType): string {
	const s: Record<UserFlagType, string> = {
		[UserFlagType.FailedPaymentWarning]: 'Failed Payment (Warning)',
		[UserFlagType.FailedPaymentFinal]: 'Failed Payment (Final)',
		[UserFlagType.AccountOverLimit]: 'Account Over Limit',
		[UserFlagType.AccountWithoutSubscription]: 'Account Without Subscription',
		[UserFlagType.SubscriptionCancelled]: 'Subscription Cancelled',
		[UserFlagType.ManuallyDisabled]: 'Manually Disabled',
		[UserFlagType.UserDeletionInProgress]: 'User deletion in progress',
	};

	if (!s[t]) throw new Error(`Unknown flag type: ${t}`);

	return s[t];
}

export enum FileContentType {
	Any = 1,
	JoplinItem = 2,
}

export function changeTypeToString(t: ChangeType): string {
	if (t === ChangeType.Create) return 'create';
	if (t === ChangeType.Update) return 'update';
	if (t === ChangeType.Delete) return 'delete';
	throw new Error(`Unknown type: ${t}`);
}

export const getDefaultValue = (tableName: string, colName: string): string|number|null => {
	const table = databaseSchema[tableName];
	if (!table) throw new Error(`Invalid table name: ${tableName}`);
	const col = table[colName];
	if (!col) throw new Error(`Invalid column name: ${tableName}.${colName}`);
	return col.defaultValue;
};

export enum ShareType {
	Note = 1, // When a note is shared via a public link
	Folder = 3, // When a complete folder is shared with another Joplin Server user
}

export enum ShareUserStatus {
	Waiting = 0,
	Accepted = 1,
	Rejected = 2,
}

export interface WithDates {
	updated_time?: number;
	created_time?: number;
}

export interface WithCreatedDate {
	created_time?: number;
}

export interface WithUuid {
	id?: Uuid;
}

interface DatabaseTableColumn {
	type: string;
	defaultValue: string | number | null;
}

interface DatabaseTable {
	[key: string]: DatabaseTableColumn;
}

interface DatabaseTables {
	[key: string]: DatabaseTable;
}

export enum TaskId {
	// Don't re-use any of these numbers, always add to it, as the ID is used in
	// the database
	DeleteExpiredTokens = 1,
	UpdateTotalSizes,
	HandleOversizedAccounts,
	HandleBetaUserEmails,
	HandleFailedPaymentSubscriptions,
	DeleteExpiredSessions,
	CompressOldChanges,
	ProcessUserDeletions,
	AutoAddDisabledAccountsForDeletion,
	ProcessOrphanedItems,
	ProcessShares,
	ProcessEmails,
	LogHeartbeatMessage,
}

// AUTO-GENERATED-TYPES
// Auto-generated using `yarn generate-types`
export interface Session extends WithDates, WithUuid {
	user_id?: Uuid;
	auth_code?: string;
}

export interface File {
	id?: Uuid;
	owner_id?: Uuid;
	name?: string;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	content?: any;
	mime_type?: string;
	size?: number;
	is_directory?: number;
	is_root?: number;
	parent_id?: Uuid;
	updated_time?: string;
	created_time?: string;
	source_file_id?: Uuid;
	content_type?: number;
	content_id?: Uuid;
}

export interface ApiClient extends WithDates, WithUuid {
	name?: string;
	secret?: string;
}

export interface Notification extends WithDates, WithUuid {
	owner_id?: Uuid;
	level?: NotificationLevel;
	key?: string;
	message?: string;
	read?: number;
	canBeDismissed?: number;
}

export interface ShareUser extends WithDates, WithUuid {
	share_id?: Uuid;
	user_id?: Uuid;
	status?: ShareUserStatus;
	master_key?: string;
}

export interface UserItem extends WithDates {
	id?: number;
	user_id?: Uuid;
	item_id?: Uuid;
}

export interface ItemResource {
	id?: number;
	item_id?: Uuid;
	resource_id?: Uuid;
}

export interface KeyValue {
	id?: number;
	key?: string;
	type?: number;
	value?: string;
}

export interface Share extends WithDates, WithUuid {
	owner_id?: Uuid;
	item_id?: Uuid;
	type?: ShareType;
	folder_id?: Uuid;
	note_id?: Uuid;
	master_key_id?: Uuid;
	recursive?: number;
}

export interface Change extends WithDates, WithUuid {
	counter?: number;
	item_type?: ItemType;
	item_id?: Uuid;
	item_name?: string;
	type?: ChangeType;
	previous_item?: string;
	user_id?: Uuid;
}

export interface Token extends WithDates {
	id?: number;
	value?: string;
	user_id?: Uuid;
}

export interface Subscription {
	id?: number;
	user_id?: Uuid;
	stripe_user_id?: Uuid;
	stripe_subscription_id?: Uuid;
	last_payment_time?: number;
	last_payment_failed_time?: number;
	updated_time?: string;
	created_time?: string;
	is_deleted?: number;
}

export interface User extends WithDates, WithUuid {
	email?: string;
	password?: string;
	full_name?: string;
	is_admin?: number;
	email_confirmed?: number;
	must_set_password?: number;
	account_type?: number;
	can_upload?: number;
	max_item_size?: number | null;
	can_share_folder?: number | null;
	can_share_note?: number | null;
	max_total_item_size?: number | null;
	total_item_size?: number;
	enabled?: number;
	disabled_time?: number;
	can_receive_folder?: number;
}

export interface UserFlag extends WithDates {
	id?: number;
	user_id?: Uuid;
	type?: UserFlagType;
}

export interface Event extends WithUuid {
	counter?: number;
	type?: EventType;
	name?: string;
	created_time?: number;
}

export interface Storage {
	id?: number;
	connection_string?: string;
	updated_time?: string;
	created_time?: string;
}

export interface Item extends WithDates, WithUuid {
	name?: string;
	mime_type?: string;
	content?: Buffer;
	content_size?: number;
	jop_id?: Uuid;
	jop_parent_id?: Uuid;
	jop_share_id?: Uuid;
	jop_type?: number;
	jop_encryption_applied?: number;
	jop_updated_time?: number;
	owner_id?: Uuid;
	content_storage_id?: number;
}

export interface UserDeletion extends WithDates {
	id?: number;
	user_id?: Uuid;
	process_data?: number;
	process_account?: number;
	scheduled_time?: number;
	start_time?: number;
	end_time?: number;
	success?: number;
	error?: string;
}

export interface Email extends WithDates {
	id?: number;
	recipient_name?: string;
	recipient_email?: string;
	recipient_id?: Uuid;
	sender_id?: EmailSender;
	subject?: string;
	body?: string;
	sent_time?: number;
	sent_success?: number;
	error?: string;
	key?: string;
}

export interface BackupItem extends WithCreatedDate {
	id?: number;
	type?: number;
	key?: string;
	user_id?: Uuid;
	content?: Buffer;
}

export interface TaskState extends WithDates {
	id?: number;
	task_id?: TaskId;
	running?: number;
	enabled?: number;
}

export const databaseSchema: DatabaseTables = {
	sessions: {
		id: { type: 'string', defaultValue: null },
		user_id: { type: 'string', defaultValue: null },
		auth_code: { type: 'string', defaultValue: '' },
		updated_time: { type: 'string', defaultValue: null },
		created_time: { type: 'string', defaultValue: null },
	},
	files: {
		id: { type: 'string', defaultValue: null },
		owner_id: { type: 'string', defaultValue: null },
		name: { type: 'string', defaultValue: null },
		content: { type: 'any', defaultValue: '' },
		mime_type: { type: 'string', defaultValue: 'application/octet-stream' },
		size: { type: 'number', defaultValue: 0 },
		is_directory: { type: 'number', defaultValue: 0 },
		is_root: { type: 'number', defaultValue: 0 },
		parent_id: { type: 'string', defaultValue: '' },
		updated_time: { type: 'string', defaultValue: null },
		created_time: { type: 'string', defaultValue: null },
		source_file_id: { type: 'string', defaultValue: '' },
		content_type: { type: 'number', defaultValue: 1 },
		content_id: { type: 'string', defaultValue: '' },
	},
	api_clients: {
		id: { type: 'string', defaultValue: null },
		name: { type: 'string', defaultValue: null },
		secret: { type: 'string', defaultValue: null },
		updated_time: { type: 'string', defaultValue: null },
		created_time: { type: 'string', defaultValue: null },
	},
	notifications: {
		id: { type: 'string', defaultValue: null },
		owner_id: { type: 'string', defaultValue: null },
		level: { type: 'number', defaultValue: null },
		key: { type: 'string', defaultValue: null },
		message: { type: 'string', defaultValue: null },
		read: { type: 'number', defaultValue: 0 },
		canBeDismissed: { type: 'number', defaultValue: 1 },
		updated_time: { type: 'string', defaultValue: null },
		created_time: { type: 'string', defaultValue: null },
	},
	share_users: {
		id: { type: 'string', defaultValue: null },
		share_id: { type: 'string', defaultValue: null },
		user_id: { type: 'string', defaultValue: null },
		status: { type: 'number', defaultValue: 0 },
		updated_time: { type: 'string', defaultValue: null },
		created_time: { type: 'string', defaultValue: null },
		master_key: { type: 'string', defaultValue: '' },
	},
	user_items: {
		id: { type: 'number', defaultValue: null },
		user_id: { type: 'string', defaultValue: null },
		item_id: { type: 'string', defaultValue: null },
		updated_time: { type: 'string', defaultValue: null },
		created_time: { type: 'string', defaultValue: null },
	},
	item_resources: {
		id: { type: 'number', defaultValue: null },
		item_id: { type: 'string', defaultValue: null },
		resource_id: { type: 'string', defaultValue: null },
	},
	key_values: {
		id: { type: 'number', defaultValue: null },
		key: { type: 'string', defaultValue: null },
		type: { type: 'number', defaultValue: null },
		value: { type: 'string', defaultValue: null },
	},
	shares: {
		id: { type: 'string', defaultValue: null },
		owner_id: { type: 'string', defaultValue: null },
		item_id: { type: 'string', defaultValue: null },
		type: { type: 'number', defaultValue: null },
		updated_time: { type: 'string', defaultValue: null },
		created_time: { type: 'string', defaultValue: null },
		folder_id: { type: 'string', defaultValue: '' },
		note_id: { type: 'string', defaultValue: '' },
		master_key_id: { type: 'string', defaultValue: '' },
		recursive: { type: 'number', defaultValue: 0 },
	},
	changes: {
		counter: { type: 'number', defaultValue: null },
		id: { type: 'string', defaultValue: null },
		item_type: { type: 'number', defaultValue: null },
		item_id: { type: 'string', defaultValue: null },
		item_name: { type: 'string', defaultValue: '' },
		type: { type: 'number', defaultValue: null },
		updated_time: { type: 'string', defaultValue: null },
		created_time: { type: 'string', defaultValue: null },
		previous_item: { type: 'string', defaultValue: '' },
		user_id: { type: 'string', defaultValue: '' },
	},
	tokens: {
		id: { type: 'number', defaultValue: null },
		value: { type: 'string', defaultValue: null },
		user_id: { type: 'string', defaultValue: '' },
		updated_time: { type: 'string', defaultValue: null },
		created_time: { type: 'string', defaultValue: null },
	},
	subscriptions: {
		id: { type: 'number', defaultValue: null },
		user_id: { type: 'string', defaultValue: null },
		stripe_user_id: { type: 'string', defaultValue: null },
		stripe_subscription_id: { type: 'string', defaultValue: null },
		last_payment_time: { type: 'string', defaultValue: null },
		last_payment_failed_time: { type: 'string', defaultValue: 0 },
		updated_time: { type: 'string', defaultValue: null },
		created_time: { type: 'string', defaultValue: null },
		is_deleted: { type: 'number', defaultValue: 0 },
	},
	users: {
		id: { type: 'string', defaultValue: null },
		email: { type: 'string', defaultValue: null },
		password: { type: 'string', defaultValue: null },
		full_name: { type: 'string', defaultValue: '' },
		is_admin: { type: 'number', defaultValue: 0 },
		updated_time: { type: 'string', defaultValue: null },
		created_time: { type: 'string', defaultValue: null },
		email_confirmed: { type: 'number', defaultValue: 0 },
		must_set_password: { type: 'number', defaultValue: 0 },
		account_type: { type: 'number', defaultValue: 0 },
		can_upload: { type: 'number', defaultValue: 1 },
		max_item_size: { type: 'number', defaultValue: null },
		can_share_folder: { type: 'number', defaultValue: null },
		can_share_note: { type: 'number', defaultValue: null },
		max_total_item_size: { type: 'string', defaultValue: null },
		total_item_size: { type: 'string', defaultValue: 0 },
		enabled: { type: 'number', defaultValue: 1 },
		disabled_time: { type: 'string', defaultValue: 0 },
		can_receive_folder: { type: 'number', defaultValue: null },
	},
	user_flags: {
		id: { type: 'number', defaultValue: null },
		user_id: { type: 'string', defaultValue: null },
		type: { type: 'number', defaultValue: 0 },
		updated_time: { type: 'string', defaultValue: null },
		created_time: { type: 'string', defaultValue: null },
	},
	events: {
		id: { type: 'string', defaultValue: null },
		counter: { type: 'number', defaultValue: null },
		type: { type: 'number', defaultValue: null },
		name: { type: 'string', defaultValue: '' },
		created_time: { type: 'string', defaultValue: null },
	},
	storages: {
		id: { type: 'number', defaultValue: null },
		connection_string: { type: 'string', defaultValue: null },
		updated_time: { type: 'string', defaultValue: null },
		created_time: { type: 'string', defaultValue: null },
	},
	items: {
		id: { type: 'string', defaultValue: null },
		name: { type: 'string', defaultValue: null },
		mime_type: { type: 'string', defaultValue: 'application/octet-stream' },
		updated_time: { type: 'string', defaultValue: null },
		created_time: { type: 'string', defaultValue: null },
		content: { type: 'any', defaultValue: '' },
		content_size: { type: 'number', defaultValue: 0 },
		jop_id: { type: 'string', defaultValue: '' },
		jop_parent_id: { type: 'string', defaultValue: '' },
		jop_share_id: { type: 'string', defaultValue: '' },
		jop_type: { type: 'number', defaultValue: 0 },
		jop_encryption_applied: { type: 'number', defaultValue: 0 },
		jop_updated_time: { type: 'string', defaultValue: 0 },
		owner_id: { type: 'string', defaultValue: null },
		content_storage_id: { type: 'number', defaultValue: null },
	},
	user_deletions: {
		id: { type: 'number', defaultValue: null },
		user_id: { type: 'string', defaultValue: null },
		process_data: { type: 'number', defaultValue: 0 },
		process_account: { type: 'number', defaultValue: 0 },
		scheduled_time: { type: 'string', defaultValue: null },
		start_time: { type: 'string', defaultValue: 0 },
		end_time: { type: 'string', defaultValue: 0 },
		success: { type: 'number', defaultValue: 0 },
		error: { type: 'string', defaultValue: '' },
		updated_time: { type: 'string', defaultValue: null },
		created_time: { type: 'string', defaultValue: null },
	},
	emails: {
		id: { type: 'number', defaultValue: null },
		recipient_name: { type: 'string', defaultValue: '' },
		recipient_email: { type: 'string', defaultValue: '' },
		recipient_id: { type: 'string', defaultValue: '' },
		sender_id: { type: 'number', defaultValue: null },
		subject: { type: 'string', defaultValue: null },
		body: { type: 'string', defaultValue: null },
		sent_time: { type: 'string', defaultValue: 0 },
		sent_success: { type: 'number', defaultValue: 0 },
		error: { type: 'string', defaultValue: '' },
		updated_time: { type: 'string', defaultValue: null },
		created_time: { type: 'string', defaultValue: null },
		key: { type: 'string', defaultValue: '' },
	},
	backup_items: {
		id: { type: 'number', defaultValue: null },
		type: { type: 'number', defaultValue: null },
		key: { type: 'string', defaultValue: null },
		user_id: { type: 'string', defaultValue: '' },
		content: { type: 'any', defaultValue: null },
		created_time: { type: 'string', defaultValue: null },
	},
	task_states: {
		id: { type: 'number', defaultValue: null },
		task_id: { type: 'number', defaultValue: null },
		running: { type: 'number', defaultValue: 0 },
		enabled: { type: 'number', defaultValue: 1 },
		updated_time: { type: 'string', defaultValue: null },
		created_time: { type: 'string', defaultValue: null },
	},
};
// AUTO-GENERATED-TYPES
