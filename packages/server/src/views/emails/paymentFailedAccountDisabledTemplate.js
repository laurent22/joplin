"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const markdownUtils_1 = require("@joplin/lib/markdownUtils");
const config_1 = require("../../config");
const urlUtils_1 = require("../../utils/urlUtils");
exports.default = () => {
    return {
        subject: `Your ${(0, config_1.default)().appName} payment could not be processed`,
        body: `

Your last ${(0, config_1.default)().appName} payment could not be processed. As a result your account has been disabled.

To re-activate your account, please update your payment details.

Following this link to [manage your subscription](${markdownUtils_1.default.escapeLinkUrl((0, urlUtils_1.stripePortalUrl)())}).

For more information please see the [help page](${(0, urlUtils_1.helpUrl)()}).

Thank you,

Joplin Cloud Team
`.trim(),
    };
};
//# sourceMappingURL=paymentFailedAccountDisabledTemplate.js.map