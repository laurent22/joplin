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
	throw new Error(`Unkown type: ${t}`);
}

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
	UpdateTotalSizes = 2,
	HandleOversizedAccounts = 3,
	HandleBetaUserEmails = 4,
	HandleFailedPaymentSubscriptions = 5,
	DeleteExpiredSessions = 6,
	CompressOldChanges = 7,
	ProcessUserDeletions = 8,
	AutoAddDisabledAccountsForDeletion = 9,
	ProcessOrphanedItems = 10,
}

// AUTO-GENERATED-TYPES
// Auto-generated using `yarn run generate-types`
export interface Session extends WithDates, WithUuid {
	user_id?: Uuid;
	auth_code?: string;
}

export interface File {
	id?: Uuid;
	owner_id?: Uuid;
	name?: string;
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
		id: { type: 'string' },
		user_id: { type: 'string' },
		auth_code: { type: 'string' },
		updated_time: { type: 'string' },
		created_time: { type: 'string' },
	},
	files: {
		id: { type: 'string' },
		owner_id: { type: 'string' },
		name: { type: 'string' },
		content: { type: 'any' },
		mime_type: { type: 'string' },
		size: { type: 'number' },
		is_directory: { type: 'number' },
		is_root: { type: 'number' },
		parent_id: { type: 'string' },
		updated_time: { type: 'string' },
		created_time: { type: 'string' },
		source_file_id: { type: 'string' },
		content_type: { type: 'number' },
		content_id: { type: 'string' },
	},
	api_clients: {
		id: { type: 'string' },
		name: { type: 'string' },
		secret: { type: 'string' },
		updated_time: { type: 'string' },
		created_time: { type: 'string' },
	},
	notifications: {
		id: { type: 'string' },
		owner_id: { type: 'string' },
		level: { type: 'number' },
		key: { type: 'string' },
		message: { type: 'string' },
		read: { type: 'number' },
		canBeDismissed: { type: 'number' },
		updated_time: { type: 'string' },
		created_time: { type: 'string' },
	},
	share_users: {
		id: { type: 'string' },
		share_id: { type: 'string' },
		user_id: { type: 'string' },
		status: { type: 'number' },
		updated_time: { type: 'string' },
		created_time: { type: 'string' },
		master_key: { type: 'string' },
	},
	user_items: {
		id: { type: 'number' },
		user_id: { type: 'string' },
		item_id: { type: 'string' },
		updated_time: { type: 'string' },
		created_time: { type: 'string' },
	},
	item_resources: {
		id: { type: 'number' },
		item_id: { type: 'string' },
		resource_id: { type: 'string' },
	},
	key_values: {
		id: { type: 'number' },
		key: { type: 'string' },
		type: { type: 'number' },
		value: { type: 'string' },
	},
	shares: {
		id: { type: 'string' },
		owner_id: { type: 'string' },
		item_id: { type: 'string' },
		type: { type: 'number' },
		updated_time: { type: 'string' },
		created_time: { type: 'string' },
		folder_id: { type: 'string' },
		note_id: { type: 'string' },
		master_key_id: { type: 'string' },
		recursive: { type: 'number' },
	},
	changes: {
		counter: { type: 'number' },
		id: { type: 'string' },
		item_type: { type: 'number' },
		item_id: { type: 'string' },
		item_name: { type: 'string' },
		type: { type: 'number' },
		updated_time: { type: 'string' },
		created_time: { type: 'string' },
		previous_item: { type: 'string' },
		user_id: { type: 'string' },
	},
	tokens: {
		id: { type: 'number' },
		value: { type: 'string' },
		user_id: { type: 'string' },
		updated_time: { type: 'string' },
		created_time: { type: 'string' },
	},
	subscriptions: {
		id: { type: 'number' },
		user_id: { type: 'string' },
		stripe_user_id: { type: 'string' },
		stripe_subscription_id: { type: 'string' },
		last_payment_time: { type: 'string' },
		last_payment_failed_time: { type: 'string' },
		updated_time: { type: 'string' },
		created_time: { type: 'string' },
		is_deleted: { type: 'number' },
	},
	users: {
		id: { type: 'string' },
		email: { type: 'string' },
		password: { type: 'string' },
		full_name: { type: 'string' },
		is_admin: { type: 'number' },
		updated_time: { type: 'string' },
		created_time: { type: 'string' },
		email_confirmed: { type: 'number' },
		must_set_password: { type: 'number' },
		account_type: { type: 'number' },
		can_upload: { type: 'number' },
		max_item_size: { type: 'number' },
		can_share_folder: { type: 'number' },
		can_share_note: { type: 'number' },
		max_total_item_size: { type: 'string' },
		total_item_size: { type: 'string' },
		enabled: { type: 'number' },
		disabled_time: { type: 'string' },
	},
	user_flags: {
		id: { type: 'number' },
		user_id: { type: 'string' },
		type: { type: 'number' },
		updated_time: { type: 'string' },
		created_time: { type: 'string' },
	},
	events: {
		id: { type: 'string' },
		counter: { type: 'number' },
		type: { type: 'number' },
		name: { type: 'string' },
		created_time: { type: 'string' },
	},
	storages: {
		id: { type: 'number' },
		connection_string: { type: 'string' },
		updated_time: { type: 'string' },
		created_time: { type: 'string' },
	},
	items: {
		id: { type: 'string' },
		name: { type: 'string' },
		mime_type: { type: 'string' },
		updated_time: { type: 'string' },
		created_time: { type: 'string' },
		content: { type: 'any' },
		content_size: { type: 'number' },
		jop_id: { type: 'string' },
		jop_parent_id: { type: 'string' },
		jop_share_id: { type: 'string' },
		jop_type: { type: 'number' },
		jop_encryption_applied: { type: 'number' },
		jop_updated_time: { type: 'string' },
		owner_id: { type: 'string' },
		content_storage_id: { type: 'number' },
	},
	user_deletions: {
		id: { type: 'number' },
		user_id: { type: 'string' },
		process_data: { type: 'number' },
		process_account: { type: 'number' },
		scheduled_time: { type: 'string' },
		start_time: { type: 'string' },
		end_time: { type: 'string' },
		success: { type: 'number' },
		error: { type: 'string' },
		updated_time: { type: 'string' },
		created_time: { type: 'string' },
	},
	emails: {
		id: { type: 'number' },
		recipient_name: { type: 'string' },
		recipient_email: { type: 'string' },
		recipient_id: { type: 'string' },
		sender_id: { type: 'number' },
		subject: { type: 'string' },
		body: { type: 'string' },
		sent_time: { type: 'string' },
		sent_success: { type: 'number' },
		error: { type: 'string' },
		updated_time: { type: 'string' },
		created_time: { type: 'string' },
		key: { type: 'string' },
	},
	backup_items: {
		id: { type: 'number' },
		type: { type: 'number' },
		key: { type: 'string' },
		user_id: { type: 'string' },
		content: { type: 'any' },
		created_time: { type: 'string' },
	},
	task_states: {
		id: { type: 'number' },
		task_id: { type: 'number' },
		running: { type: 'number' },
		enabled: { type: 'number' },
		updated_time: { type: 'string' },
		created_time: { type: 'string' },
	},
};
// AUTO-GENERATED-TYPES
