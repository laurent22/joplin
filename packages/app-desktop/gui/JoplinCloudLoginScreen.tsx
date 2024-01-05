import { useEffect, useReducer, useState } from 'react';
import ButtonBar from './ConfigScreen/ButtonBar';
import { _ } from '@joplin/lib/locale';
import { clipboard } from 'electron';
import Button, { ButtonLevel } from './Button/Button';
const bridge = require('@electron/remote').require('./bridge').default;
import { uuidgen } from '@joplin/lib/uuid';
import { Dispatch } from 'redux';
import { reducer, intitialValues, generateLoginWithUniqueLoginCode, checkIfLoginWasSuccessful } from '@joplin/lib/services/JoplinCloudLogin';
import { AppState } from '../app.reducer';

const { connect } = require('react-redux');

interface Props {
	dispatch: Dispatch;
	joplinCloudWebsite: string;
	joplinCloudApi: string;
}

const JoplinCloudScreenComponent = (props: Props) => {

	const loginUrl = `${props.joplinCloudWebsite}/login`;
	const applicationsUrl = `${props.joplinCloudApi}/api/applications`;

	const [uniqueLoginCode, setUniqueLoginCode] = useState(undefined);
	const [intervalIdentifier, setIntervalIdentifier] = useState(undefined);
	const [state, dispatch] = useReducer(reducer, intitialValues);

	const periodicallyCheckForCredentials = () => {
		if (intervalIdentifier) return;

		const interval = setInterval(async () => {
			const response = await checkIfLoginWasSuccessful(applicationsUrl, uniqueLoginCode);
			if (response && response.success) {
				dispatch('COMPLETED');
				clearInterval(interval);
			}
		}, 2 * 1000);

		setIntervalIdentifier(interval);
	};

	const onButtonUsed = () => {
		if (state.next === 'LINK_USED') {
			dispatch('LINK_USED');
		}
		periodicallyCheckForCredentials();
	};

	const onAuthorizeClicked = async () => {
		const url = await generateLoginWithUniqueLoginCode(loginUrl, uniqueLoginCode);
		bridge().openExternal(url);
		onButtonUsed();
	};

	const onCopyToClipboardClicked = async () => {
		const url = await generateLoginWithUniqueLoginCode(loginUrl, uniqueLoginCode);
		clipboard.writeText(url);
		onButtonUsed();
	};

	useEffect(() => {
		const ulc = uuidgen();
		setUniqueLoginCode(ulc);
	}, []);

	useEffect(() => {
		return () => {
			clearInterval(intervalIdentifier);
		};
	}, [intervalIdentifier]);

	return (
		<div className="login-page">
			<div className="page-container">
				<p className="text">{_('To allow Joplin to synchronise with Joplin Cloud, open this URL in your browser to authorise the application:')}</p>
				<div className="buttons-container">
					<Button
						onClick={onAuthorizeClicked}
						title={_('Authorise')}
						iconName='fa fa-external-link-alt'
						level={ButtonLevel.Primary}
					/>
					<Button
						onClick={onCopyToClipboardClicked}
						title={_('Copy link to website')}
						iconName='fa fa-clone'
						level={ButtonLevel.Secondary}
					/>

				</div>
				<p className={state.className}>{state.message}</p>
				{state.active === 'LINK_USED' ? <div id="loading-animation" /> : null}
			</div>
			<ButtonBar onCancelClick={() => props.dispatch({ type: 'NAV_BACK' })} />
		</div>
	);
};

const mapStateToProps = (state: AppState) => {
	return {
		joplinCloudWebsite: state.settings['sync.10.website'],
		joplinCloudApi: state.settings['sync.10.path'],
	};
};

export default connect(mapStateToProps)(JoplinCloudScreenComponent);
