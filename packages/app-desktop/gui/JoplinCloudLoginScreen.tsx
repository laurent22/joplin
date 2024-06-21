import { Fragment, useEffect, useMemo, useReducer, useState } from 'react';
import ButtonBar from './ConfigScreen/ButtonBar';
import { _ } from '@joplin/lib/locale';
import { clipboard } from 'electron';
import Button, { ButtonLevel } from './Button/Button';
const bridge = require('@electron/remote').require('./bridge').default;
import { uuidgen } from '@joplin/lib/uuid';
import { Dispatch } from 'redux';
import { reducer, defaultState, generateApplicationConfirmUrl, checkIfLoginWasSuccessful } from '@joplin/lib/services/joplinCloudUtils';
import { AppState } from '../app.reducer';
import Logger from '@joplin/utils/Logger';
import { reg } from '@joplin/lib/registry';

const logger = Logger.create('JoplinCloudLoginScreen');
const { connect } = require('react-redux');

interface Props {
	dispatch: Dispatch;
	joplinCloudWebsite: string;
	joplinCloudApi: string;
}

const JoplinCloudScreenComponent = (props: Props) => {

	const confirmUrl = (applicationAuthId: string) => `${props.joplinCloudWebsite}/applications/${applicationAuthId}/confirm`;
	const applicationAuthUrl = (applicationAuthId: string) => `${props.joplinCloudApi}/api/application_auth/${applicationAuthId}`;

	const [intervalIdentifier, setIntervalIdentifier] = useState(undefined);
	const [state, dispatch] = useReducer(reducer, defaultState);

	const applicationAuthId = useMemo(() => uuidgen(), []);

	const periodicallyCheckForCredentials = () => {
		if (intervalIdentifier) return;

		const interval = setInterval(async () => {
			try {
				const response = await checkIfLoginWasSuccessful(applicationAuthUrl(applicationAuthId));
				if (response && response.success) {
					dispatch({ type: 'COMPLETED' });
					clearInterval(interval);
					void reg.scheduleSync(0);
				}
			} catch (error) {
				logger.error(error);
				dispatch({ type: 'ERROR', payload: error.message });
				clearInterval(interval);
			}
		}, 2 * 1000);

		setIntervalIdentifier(interval);
	};

	const onButtonUsed = () => {
		if (state.next === 'LINK_USED') {
			dispatch({ type: 'LINK_USED' });
		}
		periodicallyCheckForCredentials();
	};

	const onAuthorizeClicked = async () => {
		const url = await generateApplicationConfirmUrl(confirmUrl(applicationAuthId));
		bridge().openExternal(url);
		onButtonUsed();
	};

	const onCopyToClipboardClicked = async () => {
		const url = await generateApplicationConfirmUrl(confirmUrl(applicationAuthId));
		clipboard.writeText(url);
		onButtonUsed();
	};

	useEffect(() => {
		return () => {
			clearInterval(intervalIdentifier);
		};
	}, [intervalIdentifier]);

	return (
		<div className="login-page">
			<div className="page-container">
				{state.active !== 'COMPLETED' ? (
					<Fragment>
						<p className="text">{_('To allow Joplin to synchronise with Joplin Cloud, please login using this URL:')}</p>
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
					</Fragment>
				) : null}
				<p className={state.className}>{state.message()}
					{state.active === 'ERROR' ? (
						<span className={state.className}>{state.errorMessage}</span>
					) : null}
				</p>
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
