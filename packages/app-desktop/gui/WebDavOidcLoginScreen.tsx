import * as React from 'react';
import { useState, useEffect, useRef, useCallback } from 'react';
import { useDispatch } from 'react-redux';
import ButtonBar from './ConfigScreen/ButtonBar';
import { _ } from '@joplin/lib/locale';
import { reg } from '@joplin/lib/registry';
import Setting from '@joplin/lib/models/Setting';
import bridge from '../services/bridge';
import { OidcApiNodeUtils } from '@joplin/lib/oidc-api-node-utils';
import OidcApi from '@joplin/lib/OidcApi';

interface LogEntry {
	key: string;
	text: string;
}

const WebDavOidcLoginScreen: React.FC = () => {
	const [authLog, setAuthLog] = useState<LogEntry[]>([]);
	const oidcApiUtilsRef = useRef<OidcApiNodeUtils | null>(null);
	const dispatch = useDispatch();

	const log = useCallback((s: string) => {
		setAuthLog(prevLog => [
			...prevLog,
			{ key: `${Date.now()}-${Math.random()}`, text: s },
		]);
	}, []);

	useEffect(() => {
		const performAuth = async () => {
			const syncTargetId = Setting.value('sync.target');

			const oidcApi = new OidcApi({
				issuerUrl: Setting.value('sync.6.oidcIssuerUrl'),
				clientId: Setting.value('sync.6.oidcClientId'),
				clientSecret: Setting.value('sync.6.oidcClientSecret'),
				ignoreTlsErrors: Setting.value('net.ignoreTlsErrors'),
			});

			oidcApiUtilsRef.current = new OidcApiNodeUtils(oidcApi);

			try {
				const auth = await oidcApiUtilsRef.current.oauthDance({
					log: (s: string) => log(s),
				});

				Setting.setValue(`sync.${syncTargetId}.oidcAuth`, auth ? JSON.stringify(auth) : '');

				const syncTarget = reg.syncTarget(syncTargetId);
				if (syncTarget.api && syncTarget.api()) {
					syncTarget.api().setAuth(auth);
				}

				if (!auth) {
					log(_('Authentication was not completed (did not receive an authentication token).'));
				} else {
					log(_('Authentication successful! You can now close this screen.'));
					void reg.scheduleSync(0);
				}
			} catch (error) {
				log(_('Authentication failed: %s', (error as Error).message));
			}
		};

		void performAuth();

		return () => {
			if (oidcApiUtilsRef.current) {
				oidcApiUtilsRef.current.cancelOAuthDance();
			}
		};
	}, [log]);

	const handleCancelClick = useCallback(() => {
		dispatch({ type: 'NAV_BACK' });
	}, [dispatch]);

	const handleLinkClick = useCallback((url: string) => {
		void bridge().openExternal(url);
	}, []);

	const renderLogEntries = () => {
		return authLog.map(entry => {
			if (entry.text.indexOf('http:') === 0 || entry.text.indexOf('https://') === 0) {
				return (
					<a
						key={entry.key}
						className="loglink"
						href="#"
						onClick={() => handleLinkClick(entry.text)}
					>
						{entry.text}
					</a>
				);
			}
			return <p key={entry.key} className="logentry">{entry.text}</p>;
		});
	};

	return (
		<div className="webdav-oidc-login-screen">
			<div className="content">
				<h1 className="title">{_('WebDAV OIDC Authentication')}</h1>
				{renderLogEntries()}
			</div>
			<ButtonBar onCancelClick={handleCancelClick} />
		</div>
	);
};

export default WebDavOidcLoginScreen;
