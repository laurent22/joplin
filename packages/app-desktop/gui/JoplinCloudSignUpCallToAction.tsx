import { _ } from '@joplin/lib/locale';
import * as React from 'react';
import bridge from '../services/bridge';
import Button, { ButtonLevel } from './Button/Button';

interface Props {
	source?: string;
	primary?: boolean;
	withLeadIn?: boolean;
}

const JoplinCloudSignUpCallToAction = (props: Props) => {

	const source = props.source ?? 'desktop-app';

	const onJoplinCloudSignUpClick = async () => {
		await bridge().openExternal(`https://joplinapp.org/plans/?source=${encodeURIComponent(source)}`);
	};

	if (props.primary) {
		return <div className="joplin-cloud-sign-up -primary">
			<Button
				level={ButtonLevel.Primary}
				title={_('Sign up to Joplin Cloud')}
				onClick={onJoplinCloudSignUpClick}
			/>
		</div>;
	}

	return <div className="joplin-cloud-sign-up">
		{props.withLeadIn ? `${_('Don\'t have an account yet?')} ` : null}
		<a
			href="#"
			onClick={onJoplinCloudSignUpClick}
		>{_('Sign up to Joplin Cloud')}</a>
	</div>;

};

export default JoplinCloudSignUpCallToAction;
