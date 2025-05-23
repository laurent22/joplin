import { _ } from '@joplin/lib/locale';
import * as React from 'react';
import bridge from '../services/bridge';

const JoplinCloudSignUpCallToAction = () => {

	const onJoplinCloudSignUpClick = async () => {
		await bridge().openExternal('https://joplinapp.org/plans/');
	};

	return <div className="joplin-cloud-sign-up">
		<a
			href="#"
			onClick={onJoplinCloudSignUpClick}
		>{_('Sign up to Joplin Cloud')}</a>
	</div>;

};

export default JoplinCloudSignUpCallToAction;
