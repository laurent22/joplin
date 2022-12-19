import config from '../../config';
import { EmailSubjectBody } from '../../models/EmailModel';

export default (): EmailSubjectBody => {
	return {
		subject: `Somebody asked to change your email on ${config().appName}`,
		body: `

Somebody asked to change your email on ${config().appName}.

If it was not you, please contact support at ${config().supportEmail}.

`.trim(),
	};
};
