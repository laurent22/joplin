import markdownUtils from '@joplin/lib/markdownUtils';
import config from '../../config';
import { EmailSubjectBody } from '../../models/EmailModel';

interface TemplateView {
	changePasswordUrl: string;
	accessTime: string;
}

export default (view: TemplateView): EmailSubjectBody => {
	return {
		subject: `[${config().appName}] Your multi-factor authentication recovery codes were viewed`,
		body: `

Your multi-factor authentication recovery codes were viewed on ${view.accessTime}.

If this was you, no further action is needed.

If this wasn't you, someone might be using your account. Please [change your password](${markdownUtils.escapeLinkUrl(view.changePasswordUrl)}).
`.trim(),
	};
};
