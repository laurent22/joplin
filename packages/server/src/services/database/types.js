"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.databaseSchema = exports.TaskId = exports.ShareUserStatus = exports.ShareType = exports.getDefaultValue = exports.changeTypeToString = exports.FileContentType = exports.userFlagTypeToLabel = exports.UserFlagType = exports.BackupItemType = exports.EventType = exports.ChangeType = exports.EmailSender = exports.ItemType = exports.NotificationLevel = exports.ItemAddressingType = void 0;
var ItemAddressingType;
(function (ItemAddressingType) {
    ItemAddressingType[ItemAddressingType["Id"] = 1] = "Id";
    ItemAddressingType[ItemAddressingType["Path"] = 2] = "Path";
})(ItemAddressingType || (exports.ItemAddressingType = ItemAddressingType = {}));
var NotificationLevel;
(function (NotificationLevel) {
    NotificationLevel[NotificationLevel["Error"] = 5] = "Error";
    NotificationLevel[NotificationLevel["Important"] = 10] = "Important";
    NotificationLevel[NotificationLevel["Normal"] = 20] = "Normal";
})(NotificationLevel || (exports.NotificationLevel = NotificationLevel = {}));
var ItemType;
(function (ItemType) {
    ItemType[ItemType["Item"] = 1] = "Item";
    ItemType[ItemType["UserItem"] = 2] = "UserItem";
    ItemType[ItemType["User"] = 3] = "User";
})(ItemType || (exports.ItemType = ItemType = {}));
var EmailSender;
(function (EmailSender) {
    EmailSender[EmailSender["NoReply"] = 1] = "NoReply";
    EmailSender[EmailSender["Support"] = 2] = "Support";
})(EmailSender || (exports.EmailSender = EmailSender = {}));
var ChangeType;
(function (ChangeType) {
    ChangeType[ChangeType["Create"] = 1] = "Create";
    ChangeType[ChangeType["Update"] = 2] = "Update";
    ChangeType[ChangeType["Delete"] = 3] = "Delete";
})(ChangeType || (exports.ChangeType = ChangeType = {}));
var EventType;
(function (EventType) {
    EventType[EventType["TaskStarted"] = 1] = "TaskStarted";
    EventType[EventType["TaskCompleted"] = 2] = "TaskCompleted";
})(EventType || (exports.EventType = EventType = {}));
var BackupItemType;
(function (BackupItemType) {
    BackupItemType[BackupItemType["UserAccount"] = 1] = "UserAccount";
})(BackupItemType || (exports.BackupItemType = BackupItemType = {}));
var UserFlagType;
(function (UserFlagType) {
    UserFlagType[UserFlagType["FailedPaymentWarning"] = 1] = "FailedPaymentWarning";
    UserFlagType[UserFlagType["FailedPaymentFinal"] = 2] = "FailedPaymentFinal";
    UserFlagType[UserFlagType["AccountOverLimit"] = 3] = "AccountOverLimit";
    UserFlagType[UserFlagType["AccountWithoutSubscription"] = 4] = "AccountWithoutSubscription";
    UserFlagType[UserFlagType["SubscriptionCancelled"] = 5] = "SubscriptionCancelled";
    UserFlagType[UserFlagType["ManuallyDisabled"] = 6] = "ManuallyDisabled";
    UserFlagType[UserFlagType["UserDeletionInProgress"] = 7] = "UserDeletionInProgress";
})(UserFlagType || (exports.UserFlagType = UserFlagType = {}));
function userFlagTypeToLabel(t) {
    const s = {
        [UserFlagType.FailedPaymentWarning]: 'Failed Payment (Warning)',
        [UserFlagType.FailedPaymentFinal]: 'Failed Payment (Final)',
        [UserFlagType.AccountOverLimit]: 'Account Over Limit',
        [UserFlagType.AccountWithoutSubscription]: 'Account Without Subscription',
        [UserFlagType.SubscriptionCancelled]: 'Subscription Cancelled',
        [UserFlagType.ManuallyDisabled]: 'Manually Disabled',
        [UserFlagType.UserDeletionInProgress]: 'User deletion in progress',
    };
    if (!s[t])
        throw new Error(`Unknown flag type: ${t}`);
    return s[t];
}
exports.userFlagTypeToLabel = userFlagTypeToLabel;
var FileContentType;
(function (FileContentType) {
    FileContentType[FileContentType["Any"] = 1] = "Any";
    FileContentType[FileContentType["JoplinItem"] = 2] = "JoplinItem";
})(FileContentType || (exports.FileContentType = FileContentType = {}));
function changeTypeToString(t) {
    if (t === ChangeType.Create)
        return 'create';
    if (t === ChangeType.Update)
        return 'update';
    if (t === ChangeType.Delete)
        return 'delete';
    throw new Error(`Unkown type: ${t}`);
}
exports.changeTypeToString = changeTypeToString;
const getDefaultValue = (tableName, colName) => {
    const table = exports.databaseSchema[tableName];
    if (!table)
        throw new Error(`Invalid table name: ${tableName}`);
    const col = table[colName];
    if (!col)
        throw new Error(`Invalid column name: ${tableName}.${colName}`);
    return col.defaultValue;
};
exports.getDefaultValue = getDefaultValue;
var ShareType;
(function (ShareType) {
    ShareType[ShareType["Note"] = 1] = "Note";
    ShareType[ShareType["Folder"] = 3] = "Folder";
})(ShareType || (exports.ShareType = ShareType = {}));
var ShareUserStatus;
(function (ShareUserStatus) {
    ShareUserStatus[ShareUserStatus["Waiting"] = 0] = "Waiting";
    ShareUserStatus[ShareUserStatus["Accepted"] = 1] = "Accepted";
    ShareUserStatus[ShareUserStatus["Rejected"] = 2] = "Rejected";
})(ShareUserStatus || (exports.ShareUserStatus = ShareUserStatus = {}));
var TaskId;
(function (TaskId) {
    // Don't re-use any of these numbers, always add to it, as the ID is used in
    // the database
    TaskId[TaskId["DeleteExpiredTokens"] = 1] = "DeleteExpiredTokens";
    TaskId[TaskId["UpdateTotalSizes"] = 2] = "UpdateTotalSizes";
    TaskId[TaskId["HandleOversizedAccounts"] = 3] = "HandleOversizedAccounts";
    TaskId[TaskId["HandleBetaUserEmails"] = 4] = "HandleBetaUserEmails";
    TaskId[TaskId["HandleFailedPaymentSubscriptions"] = 5] = "HandleFailedPaymentSubscriptions";
    TaskId[TaskId["DeleteExpiredSessions"] = 6] = "DeleteExpiredSessions";
    TaskId[TaskId["CompressOldChanges"] = 7] = "CompressOldChanges";
    TaskId[TaskId["ProcessUserDeletions"] = 8] = "ProcessUserDeletions";
    TaskId[TaskId["AutoAddDisabledAccountsForDeletion"] = 9] = "AutoAddDisabledAccountsForDeletion";
    TaskId[TaskId["ProcessOrphanedItems"] = 10] = "ProcessOrphanedItems";
    TaskId[TaskId["ProcessShares"] = 11] = "ProcessShares";
    TaskId[TaskId["ProcessEmails"] = 12] = "ProcessEmails";
})(TaskId || (exports.TaskId = TaskId = {}));
exports.databaseSchema = {
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
//# sourceMappingURL=types.js.map