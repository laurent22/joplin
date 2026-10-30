import markdownUtils from '@joplin/lib/markdownUtils';
import config from '../../config';
import { EmailSubjectBody } from '../../models/EmailModel';
import { profileUrl } from '../../utils/urlUtils';

interface TemplateView {
	url: string;
}

export default (view: TemplateView): EmailSubjectBody => {
	const mfaMessage = config().MFA_ENABLED ? `

Protect your account with multi-factor authentication (MFA): even if someone gets your password, they won’t be able to sign in. You can turn it on from [your profile page](${markdownUtils.escapeLinkUrl(profileUrl())}).` : '';

	return {
		subject: `Your new ${config().appName} account is almost ready to use`,
		body: `

Please click on the following link to finish setting up your account:

[Complete your account](${markdownUtils.escapeLinkUrl(view.url)})${mfaMessage}

`.trim(),
	};
};
