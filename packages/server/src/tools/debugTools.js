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
exports.createUserDeletions = exports.createTestUsers = exports.clearDatabase = exports.handleDebugCommands = void 0;
const time_1 = require("@joplin/lib/time");
const db_1 = require("../db");
const factory_1 = require("../models/factory");
const UserModel_1 = require("../models/UserModel");
const types_1 = require("../services/database/types");
const time_2 = require("../utils/time");
function handleDebugCommands(argv, db, config) {
    return __awaiter(this, void 0, void 0, function* () {
        if (argv.debugCreateTestUsers) {
            yield createTestUsers(db, config);
        }
        else {
            return false;
        }
        return true;
    });
}
exports.handleDebugCommands = handleDebugCommands;
function clearDatabase(db) {
    return __awaiter(this, void 0, void 0, function* () {
        yield (0, db_1.dropTables)(db);
        yield (0, db_1.migrateLatest)(db);
    });
}
exports.clearDatabase = clearDatabase;
function createTestUsers(db, config, options = null) {
    return __awaiter(this, void 0, void 0, function* () {
        options = Object.assign({ count: 0, fromNum: 1 }, options);
        const password = '111111';
        const models = (0, factory_1.default)(db, config);
        if (options.count) {
            const users = [];
            for (let i = 0; i < options.count; i++) {
                const userNum = i + options.fromNum;
                users.push({
                    email: `user${userNum}@example.com`,
                    password,
                    full_name: `User ${userNum}`,
                });
            }
            yield models.user().saveMulti(users);
        }
        else {
            yield (0, db_1.dropTables)(db);
            yield (0, db_1.migrateLatest)(db);
            for (let userNum = 1; userNum <= 2; userNum++) {
                yield models.user().save({
                    email: `user${userNum}@example.com`,
                    password,
                    full_name: `User ${userNum}`,
                });
            }
            {
                const { user } = yield models.subscription().saveUserAndSubscription('usersub@example.com', 'With Sub', UserModel_1.AccountType.Basic, 'usr_111', 'sub_111');
                yield models.user().save({ id: user.id, password });
            }
            {
                const { user, subscription } = yield models.subscription().saveUserAndSubscription('userfailedpayment@example.com', 'Failed Payment', UserModel_1.AccountType.Basic, 'usr_222', 'sub_222');
                yield models.user().save({ id: user.id, password });
                yield models.subscription().handlePayment(subscription.stripe_subscription_id, false);
                yield models.userFlag().add(user.id, types_1.UserFlagType.FailedPaymentWarning);
            }
            {
                const user = yield models.user().save({
                    email: 'userwithflags@example.com',
                    password,
                    full_name: 'User Withflags',
                });
                yield models.userFlag().add(user.id, types_1.UserFlagType.AccountOverLimit);
                yield time_1.default.sleep(2);
                yield models.userFlag().add(user.id, types_1.UserFlagType.FailedPaymentWarning);
            }
        }
    });
}
exports.createTestUsers = createTestUsers;
function createUserDeletions(db, config) {
    return __awaiter(this, void 0, void 0, function* () {
        const models = (0, factory_1.default)(db, config);
        const users = yield models.user().all();
        for (let i = 0; i < 3; i++) {
            if (i >= users.length)
                break;
            if (users[i].is_admin)
                continue;
            yield models.userDeletion().add(users[i].id, Date.now() + 60 * time_2.Second + (i * 10 * time_2.Minute));
        }
    });
}
exports.createUserDeletions = createUserDeletions;
//# sourceMappingURL=debugTools.js.map