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

Your ${config().appName} account is over ${view.percentLimit}% full, and as a result it is no longer possible to upload new notes to it.

To free up space, you can delete notes or attachments to go below the limit.

To unlock more storage, you can upgrade to a plan with a higher storage limit: ${config().joplinAppBaseUrl}/plans

If you have a "Pro 100 GB" account and would like to request more space, please contact us by replying to this email.

You may access your account by following this URL:

${view.url}

`.trim(),
	};
}
