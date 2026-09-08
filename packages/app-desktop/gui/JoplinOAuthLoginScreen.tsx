import * as React from 'react';
import { useEffect, useMemo, useReducer, useState } from 'react';
import ButtonBar from './ConfigScreen/ButtonBar';
import { _ } from '@joplin/lib/locale';
import { clipboard } from 'electron';
import Button, { ButtonLevel } from './Button/Button';
import { uuidgen } from '@joplin/lib/uuid';
import { Dispatch } from 'redux';
import { reducer, defaultState, generateApplicationConfirmUrl, checkIfLoginWasSuccessful, saveApplicationAuthId, isJoplinOAuthSyncTarget, assertIsJoplinOAuthSyncTarget, Action, fetchLoginUrl, normalizeBaseUrl } from '@joplin/lib/services/joplinOAuthUtils';
import { AppState } from '../app.reducer';
import Logger from '@joplin/utils/Logger';
import { reg } from '@joplin/lib/registry';
import JoplinCloudSignUpCallToAction from './JoplinCloudSignUpCallToAction';
import bridge from '../services/bridge';

const logger = Logger.create('JoplinCloudLoginScreen');
import { connect } from 'react-redux';
import useAsyncEffect from '@joplin/lib/hooks/useAsyncEffect';
import SyncTargetRegistry from '@joplin/lib/SyncTargetRegistry';
import Setting from '@joplin/lib/models/Setting';

interface Props {
	dispatch: Dispatch;
	syncTargetId: number;
	serverApi: string;
}

const JoplinOAuthScreenComponent = (props: Props) => {
	const isJoplinCloud = props.syncTargetId === SyncTargetRegistry.nameToId('joplinCloud');
	const syncTargetLabel = SyncTargetRegistry.idToMetadata(props.syncTargetId).label;
	const joplinCloudApi = normalizeBaseUrl(props.serverApi);

	const applicationAuthId = useMemo(() => uuidgen(), []);
	const applicationAuthUrl = (applicationAuthId: string) => `${joplinCloudApi}/api/application_auth/${applicationAuthId}`;

	const [intervalIdentifier, setIntervalIdentifier] = useState(undefined);
	const [state, dispatch] = useReducer(reducer, defaultState(syncTargetLabel));
	const { url: confirmUrl } = useConfirmUrl(
		joplinCloudApi, applicationAuthId, dispatch,
	);

	const periodicallyCheckForCredentials = () => {
		if (intervalIdentifier) return;

		const interval = setInterval(async () => {
			try {
				assertIsJoplinOAuthSyncTarget(props.syncTargetId);

				const response = await checkIfLoginWasSuccessful(applicationAuthUrl(applicationAuthId), props.syncTargetId);
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

	const onButtonUsed = async () => {
		if (state.next === 'LINK_USED') {
			dispatch({ type: 'LINK_USED' });
		}

		assertIsJoplinOAuthSyncTarget(props.syncTargetId);
		await saveApplicationAuthId(applicationAuthId, props.syncTargetId);
		periodicallyCheckForCredentials();
	};

	const onAuthorizeClicked = async () => {
		const url = await generateApplicationConfirmUrl(confirmUrl);
		await onButtonUsed();
		void bridge().openExternal(url);
	};

	const onCopyToClipboardClicked = async () => {
		const url = await generateApplicationConfirmUrl(confirmUrl);
		await onButtonUsed();
		clipboard.writeText(url);
	};

	useEffect(() => {
		return () => {
			clearInterval(intervalIdentifier);
		};
	}, [intervalIdentifier]);

	if (!isJoplinOAuthSyncTarget(props.syncTargetId)) { // Should not happen
		return <div className='login-page'>
			<p className='text'>Error: Neither Joplin Server nor Joplin Cloud is set as the sync target</p>
			<ButtonBar onCancelClick={() => props.dispatch({ type: 'NAV_BACK' })} />
		</div>;
	};

	return (
		<div className="login-page">
			<div className="page-container">
				{state.active !== 'COMPLETED' ? (
					<>
						<p className="text">{_('To allow Joplin to synchronise with %s, please log in using this URL:', syncTargetLabel)}</p>
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
				<p className={state.className}>{state.message()}
					{state.active === 'ERROR' ? (
						<span className={state.className}>{state.errorMessage}</span>
					) : null}
				</p>
				{state.active === 'LINK_USED' ? <div className="loading-animation" /> : null}
				{state.active !== 'COMPLETED' && isJoplinCloud ? <JoplinCloudSignUpCallToAction source='desktop-login-screen' withLeadIn={true} /> : null}
			</div>
			<ButtonBar onCancelClick={() => props.dispatch({ type: 'NAV_BACK' })} />
		</div>
	);
};

const useConfirmUrl = (apiBaseUrl: string, applicationAuthId: string, dispatch: React.ActionDispatch<[action: Action]>) => {
	const [url, setUrl] = useState('');
	useAsyncEffect(async event => {
		try {
			const baseUrl = await fetchLoginUrl(
				Setting.value('sync.target'), apiBaseUrl,
			);
			if (event.cancelled) return;

			if (!baseUrl) throw new Error('Failed to determine login URL');
			setUrl(`${normalizeBaseUrl(baseUrl)}/applications/${applicationAuthId}/confirm`);
		} catch (error) {
			logger.warn('Failed to determine API base URL', error);
			dispatch({ type: 'ERROR', payload: String(error) });
		}
	}, [apiBaseUrl, applicationAuthId]);

	return { url };
};

const buildMapStateToProps = (syncTargetId: number) => (state: AppState) => {
	return {
		syncTargetId,
		serverApi: state.settings[`sync.${syncTargetId as 9|10}.path`],
	};
};

export const JoplinCloudLoginScreen = connect(buildMapStateToProps(10))(JoplinOAuthScreenComponent);
export const JoplinServerLoginScreen = connect(buildMapStateToProps(9))(JoplinOAuthScreenComponent);
