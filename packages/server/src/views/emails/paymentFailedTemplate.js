"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const markdownUtils_1 = require("@joplin/lib/markdownUtils");
const config_1 = require("../../config");
const urlUtils_1 = require("../../utils/urlUtils");
function default_1() {
    return {
        subject: `${(0, config_1.default)().appName} subscription payment failed`,
        body: `
Hello,

We were not able to process your last payment. Please follow this URL to update your payment details:

[Manage your subscription](${markdownUtils_1.default.escapeLinkUrl((0, urlUtils_1.stripePortalUrl)())})

For more information please see the [help page](${(0, urlUtils_1.helpUrl)()}).

Thank you,

Joplin Cloud Team
`
            .trim(),
    };
}
exports.default = default_1;
//# sourceMappingURL=paymentFailedTemplate.js.map