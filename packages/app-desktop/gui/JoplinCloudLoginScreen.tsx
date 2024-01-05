import { useEffect, useReducer, useState } from 'react';
import ButtonBar from './ConfigScreen/ButtonBar';
import { _ } from '@joplin/lib/locale';
import { clipboard } from 'electron';
import Button, { ButtonLevel } from './Button/Button';
const bridge = require('@electron/remote').require('./bridge').default;
import { uuidgen } from '@joplin/lib/uuid';
import { Dispatch } from 'redux';
import { reducer, intitialValues, generateLoginWithUniqueLoginCode, checkIfLoginWasSuccessful } from '@joplin/lib/services/JoplinCloudLogin';
import Setting from '@joplin/lib/models/Setting';

const { connect } = require('react-redux');

const loginUrl = `${Setting.value('sync.10.website')}/login`;
const applicationsUrl = `${Setting.value('sync.10.path')}/api/applications`;

interface Props {
	dispatch: Dispatch;
}

const JoplinCloudScreenComponent = (props: Props) => {

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

	const onAuthoriseClicked = async () => {
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
						onClick={onAuthoriseClicked}
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

export default connect()(JoplinCloudScreenComponent);
