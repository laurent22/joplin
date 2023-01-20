"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.databaseSchema = exports.TaskId = exports.ShareUserStatus = exports.ShareType = exports.changeTypeToString = exports.FileContentType = exports.userFlagTypeToLabel = exports.UserFlagType = exports.BackupItemType = exports.EventType = exports.ChangeType = exports.EmailSender = exports.ItemType = exports.NotificationLevel = exports.ItemAddressingType = void 0;
var ItemAddressingType;
(function (ItemAddressingType) {
    ItemAddressingType[ItemAddressingType["Id"] = 1] = "Id";
    ItemAddressingType[ItemAddressingType["Path"] = 2] = "Path";
})(ItemAddressingType = exports.ItemAddressingType || (exports.ItemAddressingType = {}));
var NotificationLevel;
(function (NotificationLevel) {
    NotificationLevel[NotificationLevel["Error"] = 5] = "Error";
    NotificationLevel[NotificationLevel["Important"] = 10] = "Important";
    NotificationLevel[NotificationLevel["Normal"] = 20] = "Normal";
})(NotificationLevel = exports.NotificationLevel || (exports.NotificationLevel = {}));
var ItemType;
(function (ItemType) {
    ItemType[ItemType["Item"] = 1] = "Item";
    ItemType[ItemType["UserItem"] = 2] = "UserItem";
    ItemType[ItemType["User"] = 3] = "User";
})(ItemType = exports.ItemType || (exports.ItemType = {}));
var EmailSender;
(function (EmailSender) {
    EmailSender[EmailSender["NoReply"] = 1] = "NoReply";
    EmailSender[EmailSender["Support"] = 2] = "Support";
})(EmailSender = exports.EmailSender || (exports.EmailSender = {}));
var ChangeType;
(function (ChangeType) {
    ChangeType[ChangeType["Create"] = 1] = "Create";
    ChangeType[ChangeType["Update"] = 2] = "Update";
    ChangeType[ChangeType["Delete"] = 3] = "Delete";
})(ChangeType = exports.ChangeType || (exports.ChangeType = {}));
var EventType;
(function (EventType) {
    EventType[EventType["TaskStarted"] = 1] = "TaskStarted";
    EventType[EventType["TaskCompleted"] = 2] = "TaskCompleted";
})(EventType = exports.EventType || (exports.EventType = {}));
var BackupItemType;
(function (BackupItemType) {
    BackupItemType[BackupItemType["UserAccount"] = 1] = "UserAccount";
})(BackupItemType = exports.BackupItemType || (exports.BackupItemType = {}));
var UserFlagType;
(function (UserFlagType) {
    UserFlagType[UserFlagType["FailedPaymentWarning"] = 1] = "FailedPaymentWarning";
    UserFlagType[UserFlagType["FailedPaymentFinal"] = 2] = "FailedPaymentFinal";
    UserFlagType[UserFlagType["AccountOverLimit"] = 3] = "AccountOverLimit";
    UserFlagType[UserFlagType["AccountWithoutSubscription"] = 4] = "AccountWithoutSubscription";
    UserFlagType[UserFlagType["SubscriptionCancelled"] = 5] = "SubscriptionCancelled";
    UserFlagType[UserFlagType["ManuallyDisabled"] = 6] = "ManuallyDisabled";
    UserFlagType[UserFlagType["UserDeletionInProgress"] = 7] = "UserDeletionInProgress";
})(UserFlagType = exports.UserFlagType || (exports.UserFlagType = {}));
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
})(FileContentType = exports.FileContentType || (exports.FileContentType = {}));
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
var ShareType;
(function (ShareType) {
    ShareType[ShareType["Note"] = 1] = "Note";
    ShareType[ShareType["Folder"] = 3] = "Folder";
})(ShareType = exports.ShareType || (exports.ShareType = {}));
var ShareUserStatus;
(function (ShareUserStatus) {
    ShareUserStatus[ShareUserStatus["Waiting"] = 0] = "Waiting";
    ShareUserStatus[ShareUserStatus["Accepted"] = 1] = "Accepted";
    ShareUserStatus[ShareUserStatus["Rejected"] = 2] = "Rejected";
})(ShareUserStatus = exports.ShareUserStatus || (exports.ShareUserStatus = {}));
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
})(TaskId = exports.TaskId || (exports.TaskId = {}));
exports.databaseSchema = {
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
//# sourceMappingURL=types.js.map