"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const markdownUtils_1 = require("@joplin/lib/markdownUtils");
const config_1 = require("../../config");
exports.default = (view) => {
    return {
        subject: `Confirm your new ${(0, config_1.default)().appName} account email`,
        body: `

Please click on the following link to confirm your new email address:

[Confirm email](${markdownUtils_1.default.escapeLinkUrl(view.url)})

`.trim(),
    };
};
//# sourceMappingURL=changeEmailConfirmationTemplate.js.map