"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const config_1 = require("../../config");
exports.default = () => {
    return {
        subject: `Somebody asked to change your email on ${(0, config_1.default)().appName}`,
        body: `

Somebody asked to change your email on ${(0, config_1.default)().appName}.

If it was not you, please contact support at ${(0, config_1.default)().supportEmail}.

`.trim(),
    };
};
//# sourceMappingURL=changeEmailNotificationTemplate.js.map