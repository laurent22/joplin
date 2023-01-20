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
const errors_1 = require("../utils/errors");
const uuidgen_1 = require("../utils/uuidgen");
const BaseModel_1 = require("./BaseModel");
class TokenModel extends BaseModel_1.default {
    constructor() {
        super(...arguments);
        this.tokenTtl_ = 7 * 24 * 60 * 60 * 1000;
    }
    get tableName() {
        return 'tokens';
    }
    hasUuid() {
        return false;
    }
    generate(userId) {
        return __awaiter(this, void 0, void 0, function* () {
            const token = yield this.save({
                value: (0, uuidgen_1.default)(32),
                user_id: userId,
            });
            return token.value;
        });
    }
    checkToken(userId, tokenValue) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!(yield this.isValid(userId, tokenValue)))
                throw new errors_1.ErrorForbidden('Invalid or expired token');
        });
    }
    byUser(userId, tokenValue) {
        return __awaiter(this, void 0, void 0, function* () {
            return this
                .db(this.tableName)
                .select(['id'])
                .where('user_id', '=', userId)
                .where('value', '=', tokenValue)
                .first();
        });
    }
    byToken(tokenValue) {
        return __awaiter(this, void 0, void 0, function* () {
            return this
                .db(this.tableName)
                .select(['user_id', 'value'])
                .where('value', '=', tokenValue)
                .first();
        });
    }
    userFromToken(tokenValue) {
        return __awaiter(this, void 0, void 0, function* () {
            const token = yield this.byToken(tokenValue);
            if (!token)
                throw new errors_1.ErrorNotFound(`No such token: ${tokenValue}`);
            const user = this.models().user().load(token.user_id);
            if (!user)
                throw new errors_1.ErrorNotFound('No user associated with this token');
            return user;
        });
    }
    isValid(userId, tokenValue) {
        return __awaiter(this, void 0, void 0, function* () {
            const token = yield this.byUser(userId, tokenValue);
            return !!token;
        });
    }
    deleteExpiredTokens() {
        return __awaiter(this, void 0, void 0, function* () {
            const cutOffDate = Date.now() - this.tokenTtl_;
            yield this.db(this.tableName).where('created_time', '<', cutOffDate).delete();
        });
    }
    deleteByValue(userId, value) {
        return __awaiter(this, void 0, void 0, function* () {
            const token = yield this.byUser(userId, value);
            if (token)
                yield this.delete(token.id);
        });
    }
    allByUserId(userId) {
        return __awaiter(this, void 0, void 0, function* () {
            return this
                .db(this.tableName)
                .select(this.defaultFields)
                .where('user_id', '=', userId);
        });
    }
}
exports.default = TokenModel;
//# sourceMappingURL=TokenModel.js.map