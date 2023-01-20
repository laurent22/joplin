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
const Router_1 = require("../../utils/Router");
const types_1 = require("../../utils/types");
const MarkdownIt = require("markdown-it");
const config_1 = require("../../config");
const markdownUtils_1 = require("@joplin/lib/markdownUtils");
const router = new Router_1.default(types_1.RouteType.Web);
router.public = true;
router.get('privacy', (_path, _ctx) => __awaiter(void 0, void 0, void 0, function* () {
    const markdownIt = new MarkdownIt();
    return markdownIt.render(`# Joplin Cloud Privacy Policy

## Who are we?

The Joplin Cloud web service is owned by Joplin, registered in France.

## What information do we collect?

In order to operate this service, the following user data is stored:

- Email (required)
- Full name (optional)
- Joplin synchronisation items.
- Stripe user ID
- Stripe subscription ID

Financial information is processed by Stripe. We do not store financial information.

## How do we use personal information?

We use the email to authenticate the user and allow them to login to the service and synchronise data with it. We also use it to send important emails, such as email verification or to recover a lost password. Occasionally, we may send important notifications to our users.

## What legal basis do we have for processing your personal data?

GDPR applies.

## When do we share personal data?

We treat personal data confidentially and will not share it with any third party.

## Where do we store and process personal data?

Personal data is stored securely in a Postgres database. Access to it is strictly controlled.

We may process the data for reporting purposes - for example, how many users use the service. How many requests per day, etc.

## How do we secure personal data?

A backup is made at regular intervals and stored on a secure server.

## How long do we keep your personal data for?

We keep your data for as long as you use the service. If you would like to stop using it and have your data deleted, please contact us. We will also consider automatic data deletion provided it can be done in a safe way.

## How to contact us?

Please contact us at [${markdownUtils_1.default.escapeTitleText((0, config_1.default)().supportEmail)}](mailto:${markdownUtils_1.default.escapeLinkUrl((0, config_1.default)().supportEmail)}) for any question.`);
}));
exports.default = router;
//# sourceMappingURL=privacy.js.map