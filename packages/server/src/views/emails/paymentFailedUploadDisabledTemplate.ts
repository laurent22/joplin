import markdownUtils from '@joplin/lib/markdownUtils';
import config from '../../config';
import { EmailSubjectBody } from '../../models/EmailModel';
import { stripePortalUrl } from '../../utils/urlUtils';

interface Props {
	disabledInDays: number;
}

export default (props: Props): EmailSubjectBody => {
	return {
		subject: `Your ${config().appName} payment could not be processed`,
		body: `

Your last ${config().appName} payment could not be processed. As a result your account has been temporarily restricted: it is no longer possible to upload data to it.

The account will be permanently disabled in ${props.disabledInDays} days.

To re-activate your account, please update your payment details, or contact us for more details.

[Manage your subscription](${markdownUtils.escapeLinkUrl(stripePortalUrl())})

`.trim(),
	};
};
