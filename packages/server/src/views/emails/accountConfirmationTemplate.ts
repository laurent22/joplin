import markdownUtils from '@joplin/lib/markdownUtils';
import config from '../../config';
import { EmailSubjectBody } from '../../models/EmailModel';
import { profileUrl } from '../../utils/urlUtils';
import { mfaPromptMessage } from '../../models/utils/user';

interface TemplateView {
	url: string;
}

export default (view: TemplateView): EmailSubjectBody => {
	const mfaParagraph = config().MFA_ENABLED ? `\n\n${mfaPromptMessage} You can turn it on from [your profile page](${markdownUtils.escapeLinkUrl(profileUrl())}).` : '';

	return {
		subject: `Your new ${config().appName} account is almost ready to use`,
		body: `

Please click on the following link to finish setting up your account:

[Complete your account](${markdownUtils.escapeLinkUrl(view.url)})${mfaParagraph}

`.trim(),
	};
};
