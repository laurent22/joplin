import { _ } from '@joplin/lib/locale';
import * as React from 'react';
import bridge from '../services/bridge';

const JoplinCloudSignUpCallToAction = () => {

	const onJoplinCloudSingUpClick = async () => {
		await bridge().openExternal('https://joplinapp.org/plans/');
	};

	return <div className="joplin-cloud-sign-up">
		<p>{_('Don\'t have a Joplin Cloud account? ')}
			<a
				href="#"
				onClick={onJoplinCloudSingUpClick}
			>{_('Sign up here')}</a>
		</p>
	</div>;

};

export default JoplinCloudSignUpCallToAction;
