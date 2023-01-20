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
const BaseModel_1 = require("./BaseModel");
class EmailModel extends BaseModel_1.default {
    get tableName() {
        return 'emails';
    }
    hasUuid() {
        return false;
    }
    push(email) {
        const _super = Object.create(null, {
            save: { get: () => super.save }
        });
        return __awaiter(this, void 0, void 0, function* () {
            if (email.key) {
                const existingEmail = yield this.byRecipientAndKey(email.recipient_email, email.key);
                if (existingEmail)
                    return null; // noop - the email has already been sent
            }
            const output = yield _super.save.call(this, Object.assign({}, email));
            EmailModel.eventEmitter.emit('queued');
            return output;
        });
    }
    byRecipientAndKey(recipientEmail, key) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!key)
                throw new Error('Key cannot be empty');
            return this.db(this.tableName)
                .where('recipient_email', '=', recipientEmail)
                .where('key', '=', key)
                .first();
        });
    }
    needToBeSent() {
        return __awaiter(this, void 0, void 0, function* () {
            return this.db(this.tableName).where('sent_time', '=', 0);
        });
    }
    deleteAll() {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.db(this.tableName).delete();
        });
    }
}
exports.default = EmailModel;
//# sourceMappingURL=EmailModel.js.map