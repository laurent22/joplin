import * as React from 'react';
import { useEffect, useMemo, useReducer } from 'react';
import ButtonBar from './ConfigScreen/ButtonBar';
import { _ } from '@joplin/lib/locale';
import { clipboard } from 'electron';
import Button, { ButtonLevel } from './Button/Button';
import { uuidgen } from '@joplin/lib/uuid';
import { Dispatch } from 'redux';
import { reducer, defaultState, generateApplicationConfirmUrl, checkIfLoginWasSuccessful } from '@joplin/lib/services/joplinCloudUtils';
import { AppState } from '../app.reducer';
import Logger from '@joplin/utils/Logger';
import { reg } from '@joplin/lib/registry';
import JoplinCloudSignUpCallToAction from './JoplinCloudSignUpCallToAction';
import bridge from '../services/bridge';

const logger = Logger.create('JoplinCloudLoginScreen');
const { connect } = require('react-redux');

interface Props {
	dispatch: Dispatch;
	syncTargetId: number;
	authWebsite: string;
	authApi: string;
	serviceName: string;
}

const JoplinCloudScreenComponent = (props: Props) => {

	const confirmUrl = (applicationAuthId: string) => `${props.authWebsite}/applications/${applicationAuthId}/confirm`;
	const applicationAuthUrl = (applicationAuthId: string) => `${props.authApi}/api/application_auth/${applicationAuthId}`;

	// Use useRef for intervalIdentifier to avoid stale closures in periodicallyCheckForCredentials,
	// implementing feedback from PR #14395
	const intervalRef = React.useRef<ReturnType<typeof setInterval> | null>(null);
	const [state, dispatch] = useReducer(reducer, defaultState);

	const applicationAuthId = useMemo(() => uuidgen(), []);

	const periodicallyCheckForCredentials = () => {
		if (intervalRef.current) return;

		const interval = setInterval(async () => {
			try {
				const response = await checkIfLoginWasSuccessful(applicationAuthUrl(applicationAuthId), props.syncTargetId);
				if (response && response.success) {
					dispatch({ type: 'COMPLETED' });
					if (intervalRef.current) clearInterval(intervalRef.current);
					intervalRef.current = null;
					void reg.scheduleSync(0);
				}
			} catch (error) {
				logger.error(error);
				dispatch({ type: 'ERROR', payload: error.message });
				if (intervalRef.current) clearInterval(intervalRef.current);
				intervalRef.current = null;
			}
		}, 2 * 1000);

		intervalRef.current = interval;
	};

	const onButtonUsed = () => {
		if (state.next === 'LINK_USED') {
			dispatch({ type: 'LINK_USED' });
		}
		periodicallyCheckForCredentials();
	};

	const onAuthorizeClicked = async () => {
		const url = await generateApplicationConfirmUrl(confirmUrl(applicationAuthId));
		void bridge().openExternal(url);
		onButtonUsed();
	};

	const onCopyToClipboardClicked = async () => {
		const url = await generateApplicationConfirmUrl(confirmUrl(applicationAuthId));
		clipboard.writeText(url);
		onButtonUsed();
	};

	useEffect(() => {
		return () => {
			if (intervalRef.current) clearInterval(intervalRef.current);
		};
	}, []);

	return (
		<div className="login-page">
			<div className="page-container">
				{state.active !== 'COMPLETED' ? (
					<>
						<p className="text">{_('To allow Joplin to synchronise with %s, please login using this URL:', props.serviceName)}</p>
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
					</>
				) : null}
				<p className={state.className}>
					{state.message().replace('Joplin Cloud', props.serviceName)}
					{state.active === 'ERROR' ? (
						<span className={state.className}>{state.errorMessage}</span>
					) : null}
				</p>
				{state.active === 'LINK_USED' ? <div className="loading-animation" /> : null}
				{props.syncTargetId === 10 ? <JoplinCloudSignUpCallToAction /> : null}
			</div>
			<ButtonBar onCancelClick={() => props.dispatch({ type: 'NAV_BACK' })} />
		</div>
	);
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mapStateToProps = (state: AppState, ownProps: any) => {
	const syncTargetId = ownProps.syncTargetId || 10;
	// When using sync.9, path is the website URL, whereas sync.10 splits path and website.
	const websiteKey = syncTargetId === 10 ? 'sync.10.website' : `sync.${syncTargetId}.path`;
	const apiKey = `sync.${syncTargetId}.path`;
	const serviceName = syncTargetId === 10 ? 'Joplin Cloud' : 'Joplin Server';

	return {
		syncTargetId,
		serviceName,
		authWebsite: state.settings[websiteKey],
		authApi: state.settings[apiKey],
	};
};

export default connect(mapStateToProps)(JoplinCloudScreenComponent);
