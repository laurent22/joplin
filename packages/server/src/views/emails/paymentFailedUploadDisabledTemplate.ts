import markdownUtils from '@joplin/lib/markdownUtils';
import config from '../../config';
import { EmailSubjectBody } from '../../models/EmailModel';
import { stripePortalUrl } from '../../utils/urlUtils';

export default (): EmailSubjectBody => {
	return {
		subject: `Your ${config().appName} payment could not be processed`,
		body: `

Your last ${config().appName} payment could not be processed. As a result your account has been temporarily restricted: it is no longer possible to upload data to it.

To re-activate your account, please update your payment details, or contact us for more details.

[Manage your subscription](${markdownUtils.escapeLinkUrl(stripePortalUrl())})

`.trim(),
	};
};
