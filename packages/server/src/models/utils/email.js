"use strict";
/* eslint-disable import/prefer-default-export */
Object.defineProperty(exports, "__esModule", { value: true });
exports.senderInfo = void 0;
const config_1 = require("../../config");
const types_1 = require("../../services/database/types");
const senders_ = {};
const senderInfo = (senderId) => {
    if (!senders_[senderId]) {
        if (senderId === types_1.EmailSender.NoReply) {
            senders_[senderId] = {
                name: (0, config_1.default)().mailer.noReplyName,
                email: (0, config_1.default)().mailer.noReplyEmail,
            };
        }
        else if (senderId === types_1.EmailSender.Support) {
            senders_[senderId] = {
                name: (0, config_1.default)().supportName,
                email: (0, config_1.default)().supportEmail,
            };
        }
        else {
            throw new Error(`Invalid sender ID: ${senderId}`);
        }
    }
    return senders_[senderId];
};
exports.senderInfo = senderInfo;
//# sourceMappingURL=email.js.map