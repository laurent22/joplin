import { SubPath } from '../../utils/routeUtils';
import Router from '../../utils/Router';
import { RouteType } from '../../utils/types';
import { AppContext } from '../../utils/types';
import MarkdownIt = require('markdown-it');
import config from '../../config';
import markdownUtils from '@joplin/lib/markdownUtils';

const router: Router = new Router(RouteType.Web);
router.public = true;

router.get('privacy', async (_path: SubPath, _ctx: AppContext) => {
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

Please contact us at [${markdownUtils.escapeTitleText(config().supportEmail)}](mailto:${markdownUtils.escapeLinkUrl(config().supportEmail)}) for any question.`);
});

export default router;
