import markdownUtils from '@joplin/lib/markdownUtils';
import config from '../../config';
import { EmailSubjectBody } from '../../models/EmailModel';
import { stripePortalUrl, helpUrl } from '../../utils/urlUtils';

export default function(): EmailSubjectBody {
	return {
		subject: `${config().appName} subscription payment failed`,
		body: `
Hello,

We were not able to process your last payment. Please follow this URL to update your payment details:

[Manage your subscription](${markdownUtils.escapeLinkUrl(stripePortalUrl())})

For more information please see the [help page](${helpUrl()}).

Thank you,

Joplin Cloud Team
`
			.trim(),
	};
}
