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
exports.defaultSessionTtl = void 0;
const BaseModel_1 = require("./BaseModel");
const uuidgen_1 = require("../utils/uuidgen");
const errors_1 = require("../utils/errors");
const time_1 = require("../utils/time");
exports.defaultSessionTtl = 12 * time_1.Hour;
class SessionModel extends BaseModel_1.default {
    get tableName() {
        return 'sessions';
    }
    sessionUser(sessionId) {
        return __awaiter(this, void 0, void 0, function* () {
            const session = yield this.load(sessionId);
            if (!session)
                return null;
            const userModel = this.models().user();
            return userModel.load(session.user_id);
        });
    }
    createUserSession(userId) {
        return __awaiter(this, void 0, void 0, function* () {
            return this.save({
                id: (0, uuidgen_1.default)(),
                user_id: userId,
            }, { isNew: true });
        });
    }
    authenticate(email, password) {
        return __awaiter(this, void 0, void 0, function* () {
            const user = yield this.models().user().login(email, password);
            if (!user)
                throw new errors_1.ErrorForbidden('Invalid username or password', { details: { email } });
            return this.createUserSession(user.id);
        });
    }
    logout(sessionId) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!sessionId)
                return;
            yield this.delete(sessionId);
        });
    }
    deleteByUserId(userId, exceptSessionId = '') {
        return __awaiter(this, void 0, void 0, function* () {
            const query = this.db(this.tableName).where('user_id', '=', userId);
            if (exceptSessionId)
                void query.where('id', '!=', exceptSessionId);
            yield query.delete();
        });
    }
    deleteExpiredSessions() {
        return __awaiter(this, void 0, void 0, function* () {
            const cutOffTime = Date.now() - exports.defaultSessionTtl;
            yield this.db(this.tableName).where('created_time', '<', cutOffTime).delete();
        });
    }
}
exports.default = SessionModel;
//# sourceMappingURL=SessionModel.js.map