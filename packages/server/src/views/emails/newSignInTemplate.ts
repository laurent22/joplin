import config from '../../config';
import { EmailSubjectBody } from '../../models/EmailModel';

export interface NewSignInView {
	client: string;
	ip: string;
	signInTime: string;
	canEnableMfa: boolean;
}

export default (view: NewSignInView): EmailSubjectBody => {
	const actions = view.canEnableMfa ? 'change your password and enable multi-factor authentication' : 'change your password';

	return {
		subject: `[${config().appName}] New sign-in to your account`,
		body: `

Someone signed in to your ${config().appName} account.

- Signed in from: ${view.client}
- Time: ${view.signInTime}
- IP address: ${view.ip || 'Unknown'}

If this was you, no further action is needed.

If this wasn't you, someone might be using your account. Please ${actions}.

`.trim(),
	};
};
