"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const markdownUtils_1 = require("@joplin/lib/markdownUtils");
const config_1 = require("../../config");
exports.default = (view) => {
    return {
        subject: `Your new ${(0, config_1.default)().appName} account is almost ready to use`,
        body: `

Please click on the following link to finish setting up your account:

[Complete your account](${markdownUtils_1.default.escapeLinkUrl(view.url)})

`.trim(),
    };
};
//# sourceMappingURL=accountConfirmationTemplate.js.map