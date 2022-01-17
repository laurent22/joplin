import markdownUtils from '@joplin/lib/markdownUtils';
import config from '../../config';
import { EmailSubjectBody } from '../../models/EmailModel';

interface TemplateView {
	organizationName: string;
	url: string;
}

export default function(view: TemplateView): EmailSubjectBody {
	return {
		subject: `You are invited to join the organisation "${view.organizationName}" on ${config().appName}`,
		body: `
You have been invited to join the organisation "${view.organizationName}" on ${config().appName}.

To proceed, please click the link below:
		
[Join the organization](${markdownUtils.escapeLinkUrl(view.url)})
`
			.trim(),
	};
}
