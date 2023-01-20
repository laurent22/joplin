"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const config_1 = require("../../config");
function default_1(view) {
    return {
        subject: `Your ${(0, config_1.default)().appName} account is over ${view.percentLimit}% full`,
        body: `

Your ${(0, config_1.default)().appName} account is over ${view.percentLimit}% full.

Please consider deleting notes or attachments before it reaches its limit.

Once the account is full it will no longer be possible to upload new notes to it.

If you have Pro account and would like to request more space, please contact us by replying to this email.

You may access your account by following this URL:

${view.url}

`.trim(),
    };
}
exports.default = default_1;
//# sourceMappingURL=oversizedAccount1.js.map