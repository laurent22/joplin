"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const config_1 = require("../../config");
function default_1(view) {
    return {
        subject: `Reset your ${(0, config_1.default)().appName} password`,
        body: `

Somebody asked to reset your password on ${(0, config_1.default)().appName}.

If it was not you, you can safely ignore this email.

Click the following link to choose a new password:

${view.url}

`.trim(),
    };
}
exports.default = default_1;
//# sourceMappingURL=resetPasswordTemplate.js.map