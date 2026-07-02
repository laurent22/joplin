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

To free up space, you can delete notes or attachments before the limit is reached.

To unlock more storage, you can upgrade to a plan with a higher storage limit: ${config().joplinAppBaseUrl}/plans

Once the account is full, you will no longer be able to upload new notes to it.

You may access your account by following this URL:

${view.url}

`.trim(),
	};
}
