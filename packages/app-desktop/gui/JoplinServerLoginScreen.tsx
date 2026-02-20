import * as React from 'react';
import { useEffect, useMemo, useReducer, useRef } from 'react';
import ButtonBar from './ConfigScreen/ButtonBar';
import { _ } from '@joplin/lib/locale';
import { clipboard } from 'electron';
import Button, { ButtonLevel } from './Button/Button';
import { uuidgen } from '@joplin/lib/uuid';
import { Dispatch } from 'redux';
import { reducer, defaultState, generateApplicationConfirmUrl } from '@joplin/lib/services/joplinCloudUtils';
import { AppState } from '../app.reducer';
import Logger from '@joplin/utils/Logger';
import { reg } from '@joplin/lib/registry';
import Setting from '@joplin/lib/models/Setting';
import eventManager, { EventName } from '@joplin/lib/eventManager';
import bridge from '../services/bridge';

const logger = Logger.create('JoplinServerLoginScreen');
const { connect } = require('react-redux');

interface Props {
	dispatch: Dispatch;
	joplinServerApi: string;
}

const JoplinServerScreenComponent = (props: Props) => {

	const confirmUrl = (applicationAuthId: string) => `${props.joplinServerApi}/applications/${applicationAuthId}/confirm`;
	const applicationAuthUrl = (applicationAuthId: string) => `${props.joplinServerApi}/api/application_auth/${applicationAuthId}`;

	const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
	const [state, dispatch] = useReducer(reducer, defaultState);

	const applicationAuthId = useMemo(() => uuidgen(), []);

	const periodicallyCheckForCredentials = () => {
		if (intervalRef.current) return;

		let isWaitingResponse = false;
		const interval = setInterval(async () => {
			if (isWaitingResponse) return;
			isWaitingResponse = true;

			try {
				const apiKey = Setting.value('sync.9.apiKey');
				const headers: Record<string, string> = {};
				if (apiKey) headers['X-JOPLIN-CUSTOM-API-KEY'] = apiKey;

				const response = await fetch(applicationAuthUrl(applicationAuthId), { headers });
				const jsonBody = await response.json();

				if (response.ok && jsonBody.status === 'finished') {
					Setting.setValue('sync.9.username', jsonBody.id);
					Setting.setValue('sync.9.password', jsonBody.password);

					const fileApi = await reg.syncTarget().fileApi();
					await fileApi.driver().api().loadSession();
					eventManager.emit(EventName.SessionEstablished);

					dispatch({ type: 'COMPLETED' });
					if (intervalRef.current) {
						clearInterval(intervalRef.current);
						intervalRef.current = null;
					}
					void reg.scheduleSync(0);
				}
			} catch (error) {
				logger.error(error);
				dispatch({ type: 'ERROR', payload: error.message });
				if (intervalRef.current) {
					clearInterval(intervalRef.current);
					intervalRef.current = null;
				}
			} finally {
				isWaitingResponse = false;
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
			if (intervalRef.current) {
				clearInterval(intervalRef.current);
				intervalRef.current = null;
			}
		};
	}, []);

	return (
		<div className='login-page'>
			<div className='page-container'>
				{state.active !== 'COMPLETED' ? (
					<>
						<p className='text'>{_('To allow Joplin to synchronise with Joplin Server, please login using this URL:')}</p>
						<div className='buttons-container'>
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
				{state.active === 'LINK_USED' ? <div className='loading-animation' /> : null}
			</div>
			<ButtonBar onCancelClick={() => props.dispatch({ type: 'NAV_BACK' })} />
		</div>
	);
};

const mapStateToProps = (state: AppState) => {
	return {
		joplinServerApi: state.settings['sync.9.path'],
	};
};

export default connect(mapStateToProps)(JoplinServerScreenComponent);
