import config from '../../config';
import { EmailSubjectBody } from '../../models/EmailModel';

interface TemplateView {
	url: string;
}

export default function(view: TemplateView): EmailSubjectBody {
	return {
		subject: `Reset your ${config().appName} password`,
		body: `

Somebody asked to reset your password on ${config().appName}.

If it was not you, you can safely ignore this email.

Click the following link to choose a new password:

${view.url}

`.trim(),
	};
}
