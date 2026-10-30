import markdownUtils from '@joplin/lib/markdownUtils';
import config from '../../config';
import { EmailSubjectBody } from '../../models/EmailModel';
import { profileUrl } from '../../utils/urlUtils';

export default (): EmailSubjectBody => {
	return {
		subject: `[${config().appName}] Protect your account with multi-factor authentication`,
		body: `

Protect your account with multi-factor authentication (MFA): even if someone gets your password, they won’t be able to sign in. You can turn it on from [your profile page](${markdownUtils.escapeLinkUrl(profileUrl())}).

`.trim(),
	};
};
