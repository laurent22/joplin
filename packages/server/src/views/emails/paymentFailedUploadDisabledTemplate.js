"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const markdownUtils_1 = require("@joplin/lib/markdownUtils");
const config_1 = require("../../config");
const urlUtils_1 = require("../../utils/urlUtils");
exports.default = (props) => {
    return {
        subject: `Your ${(0, config_1.default)().appName} payment could not be processed`,
        body: `

Your last ${(0, config_1.default)().appName} payment could not be processed. As a result your account has been temporarily restricted: it is no longer possible to upload data to it.

The account will be permanently disabled in ${props.disabledInDays} days.

To re-activate your account, please update your payment details, or contact us for more details.

[Manage your subscription](${markdownUtils_1.default.escapeLinkUrl((0, urlUtils_1.stripePortalUrl)())})

`.trim(),
    };
};
//# sourceMappingURL=paymentFailedUploadDisabledTemplate.js.map