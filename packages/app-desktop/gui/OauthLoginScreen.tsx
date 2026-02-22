import * as React from 'react';
import { useEffect, useMemo, useReducer, useRef } from 'react';
import ButtonBar from './ConfigScreen/ButtonBar';
import { _ } from '@joplin/lib/locale';
import { clipboard } from 'electron';
import Button, { ButtonLevel } from './Button/Button';
import { uuidgen } from '@joplin/lib/uuid';
import { Dispatch } from 'redux';
import { reducer, defaultState, generateApplicationConfirmUrl } from '@joplin/lib/services/joplinCloudUtils';
import Logger from '@joplin/utils/Logger';
import { reg } from '@joplin/lib/registry';
import Setting from '@joplin/lib/models/Setting';
import eventManager, { EventName } from '@joplin/lib/eventManager';
import bridge from '../services/bridge';
import SyncTargetRegistry from '@joplin/lib/SyncTargetRegistry';

const logger = Logger.create('OauthLoginScreen');

export interface OauthLoginScreenProps {
	dispatch: Dispatch;
	apiUrl: string;
	websiteUrl: string;
	syncTargetId: number;
	syncTargetName: 'joplinCloud' | 'joplinServer';
	messageText: string;
	extraComponent?: React.ReactNode;
}

export const OauthLoginScreenComponent = (props: OauthLoginScreenProps) => {

	const confirmUrl = (applicationAuthId: string) => `${props.websiteUrl}/applications/${applicationAuthId}/confirm`;
	const applicationAuthUrl = (applicationAuthId: string) => `${props.apiUrl}/api/application_auth/${applicationAuthId}`;

	const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
	const [state, dispatch] = useReducer(reducer, defaultState);

	const applicationAuthId = useMemo(() => uuidgen(), []);

	const stopPolling = () => {
		if (!intervalRef.current) return;
		clearInterval(intervalRef.current);
		intervalRef.current = null;
	};

	const periodicallyCheckForCredentials = () => {
		if (intervalRef.current) return;

		let isWaitingResponse = false;
		const interval = setInterval(async () => {
			if (isWaitingResponse) return;
			isWaitingResponse = true;

			try {
				const apiKey = Setting.value(`sync.${props.syncTargetId}.apiKey`);
				const headers: Record<string, string> = {};
				if (apiKey) headers['X-JOPLIN-CUSTOM-API-KEY'] = apiKey;

				const response = await fetch(applicationAuthUrl(applicationAuthId), { headers });

				if (!response.ok) {
					logger.warn(`Auth URL fetch failed: ${response.status} ${response.statusText}`);
					return;
				}

				const jsonBody = await response.json();

				if (jsonBody.status === 'finished') {
					Setting.setValue(`sync.${props.syncTargetId}.username`, jsonBody.id);
					Setting.setValue(`sync.${props.syncTargetId}.password`, jsonBody.password);
					Setting.setValue('sync.target', SyncTargetRegistry.nameToId(props.syncTargetName));

					const fileApi = await reg.syncTarget().fileApi();
					await fileApi.driver().api().loadSession();
					eventManager.emit(EventName.SessionEstablished);

					dispatch({ type: 'COMPLETED' });
					stopPolling();
					void reg.scheduleSync(0);
				} else if (!response.ok) {
					logger.warn(`Polling received non-ok response: ${response.status} ${response.statusText}`);
				}
			} catch (error) {
				logger.error(error);
				const message = error instanceof Error ? error.message : String(error);
				dispatch({ type: 'ERROR', payload: message });
				stopPolling();
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
			stopPolling();
		};
	}, []);

	return (
		<div className='login-page'>
			<div className='page-container'>
				{state.active !== 'COMPLETED' ? (
					<>
						<p className='text'>{props.messageText}</p>
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
				{props.extraComponent}
			</div>
			<ButtonBar onCancelClick={() => props.dispatch({ type: 'NAV_BACK' })} />
		</div>
	);
};
