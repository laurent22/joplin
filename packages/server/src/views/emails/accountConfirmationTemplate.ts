import markdownUtils from '@joplin/lib/markdownUtils';
import config from '../../config';
import { EmailSubjectBody } from '../../models/EmailModel';

interface TemplateView {
	url: string;
}

export default (view: TemplateView): EmailSubjectBody => {
	return {
		subject: `Your new ${config().appName} account is almost ready to use`,
		body: `

Please click on the following link to finish setting up your account:

[Complete your account](${markdownUtils.escapeLinkUrl(view.url)})

`.trim(),
	};
};
