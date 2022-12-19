import markdownUtils from '@joplin/lib/markdownUtils';
import config from '../../config';
import { EmailSubjectBody } from '../../models/EmailModel';

interface TemplateView {
	url: string;
}

export default (view: TemplateView): EmailSubjectBody => {
	return {
		subject: `Confirm your new ${config().appName} account email`,
		body: `

Please click on the following link to confirm your new email address:

[Confirm email](${markdownUtils.escapeLinkUrl(view.url)})

`.trim(),
	};
};
