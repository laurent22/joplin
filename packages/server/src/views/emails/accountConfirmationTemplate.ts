import markdownUtils from '@joplin/lib/markdownUtils';
import config from '../../config';
import { EmailSubjectBody } from '../../models/EmailModel';
import { profileUrl } from '../../utils/urlUtils';

interface TemplateView {
	url: string;
}

export default (view: TemplateView): EmailSubjectBody => {
	const mfaMessage = config().MFA_ENABLED ? `

Once your account is set up, we recommend enabling multi-factor authentication (MFA) from [your profile page](${markdownUtils.escapeLinkUrl(profileUrl())}).

With MFA enabled, a leaked password is not enough to sign in to your account.` : '';

	return {
		subject: `Your new ${config().appName} account is almost ready to use`,
		body: `

Please click on the following link to finish setting up your account:

[Complete your account](${markdownUtils.escapeLinkUrl(view.url)})${mfaMessage}

`.trim(),
	};
};
