import { _ } from '@joplin/lib/locale';
import * as React from 'react';
import bridge from '../services/bridge';

const JoplinCloudSignUpCallToAction = () => {

	const onJoplinCloudSignUpClick = async () => {
		await bridge().openExternal('https://joplinapp.org/plans/');
	};

	return <div className="joplin-cloud-sign-up">
		<p>{_('Don\'t have a Joplin Cloud account? ')}
			<a
				href="#"
				onClick={onJoplinCloudSignUpClick}
			>{_('Sign-up here')}</a>
		</p>
	</div>;

};

export default JoplinCloudSignUpCallToAction;
