"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.down = exports.up = exports.disabledUserIds = exports.setUserAccountDisabledTimes = void 0;
// It's assumed that the input user IDs are disabled.
// The disabled_time will be set to the first flag created_time
const setUserAccountDisabledTimes = (db, userIds) => __awaiter(void 0, void 0, void 0, function* () {
    // FailedPaymentFinal = 2,
    // SubscriptionCancelled = 5,
    // ManuallyDisabled = 6,
    // UserDeletionInProgress = 7,
    const flags = yield db('user_flags')
        .select(['user_id', 'created_time'])
        .whereIn('user_id', userIds)
        .whereIn('type', [2, 5, 6, 7])
        .orderBy('created_time', 'asc');
    for (const userId of userIds) {
        const flag = flags.find(f => f.user_id === userId);
        if (!flag) {
            console.warn(`Found a disabled account without an associated flag. Setting disabled timestamp to current time: ${userId}`);
        }
        yield db('users')
            .update({ disabled_time: flag ? flag.created_time : Date.now() })
            .where('id', '=', userId);
    }
});
exports.setUserAccountDisabledTimes = setUserAccountDisabledTimes;
const disabledUserIds = (db) => __awaiter(void 0, void 0, void 0, function* () {
    const users = yield db('users').select(['id']).where('enabled', '=', 0);
    return users.map(u => u.id);
});
exports.disabledUserIds = disabledUserIds;
function up(db) {
    return __awaiter(this, void 0, void 0, function* () {
        yield db.schema.alterTable('users', (table) => {
            table.bigInteger('disabled_time').defaultTo(0).notNullable();
        });
        const userIds = yield (0, exports.disabledUserIds)(db);
        yield (0, exports.setUserAccountDisabledTimes)(db, userIds);
    });
}
exports.up = up;
function down(db) {
    return __awaiter(this, void 0, void 0, function* () {
        yield db.schema.alterTable('users', (table) => {
            table.dropColumn('disabled_time');
        });
    });
}
exports.down = down;
//# sourceMappingURL=20220131185922_account_disabled_timestamp.js.map