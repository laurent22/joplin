import config from '../../config';
import { EmailSubjectBody } from '../../models/EmailModel';

interface TemplateView {
	percentLimit: number;
	url: string;
}

export default function(view: TemplateView): EmailSubjectBody {
	return {
		subject: `Your ${config().appName} account is over ${view.percentLimit}% full`,
		body: `

Your ${config().appName} account is over ${view.percentLimit}% full, and as a result it is not longer possible to upload new notes to it.

Please consider deleting notes or attachments so as to go below the limit.

If you have Pro account and would like to request more space, please contact us by replying to this email.

You may access your account by following this URL:

${view.url}

`.trim(),
	};
}
