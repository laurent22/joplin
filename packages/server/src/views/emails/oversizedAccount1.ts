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

Your ${config().appName} account is over ${view.percentLimit}% full.

Please consider deleting notes or attachments before it reaches its limit.

Once the account is full it will no longer be possible to upload new notes to it.

If you have Pro account and would like to request more space, please contact us by replying to this email.

You may access your account by following this URL:

${view.url}

`.trim(),
	};
}
