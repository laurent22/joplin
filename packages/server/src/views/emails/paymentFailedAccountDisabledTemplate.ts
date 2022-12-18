import markdownUtils from '@joplin/lib/markdownUtils';
import config from '../../config';
import { EmailSubjectBody } from '../../models/EmailModel';
import { stripePortalUrl, helpUrl } from '../../utils/urlUtils';

export default (): EmailSubjectBody => {
	return {
		subject: `Your ${config().appName} payment could not be processed`,
		body: `

Your last ${config().appName} payment could not be processed. As a result your account has been disabled.

To re-activate your account, please update your payment details.

Following this link to [manage your subscription](${markdownUtils.escapeLinkUrl(stripePortalUrl())}).

For more information please see the [help page](${helpUrl()}).

Thank you,

Joplin Cloud Team
`.trim(),
	};
};
