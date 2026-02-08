import * as React from 'react';
import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { View, Button } from 'react-native';
import { WebView, WebViewNavigation } from 'react-native-webview';
import { useDispatch, useSelector } from 'react-redux';
import { ScreenHeader } from '../ScreenHeader';
import { reg } from '@joplin/lib/registry';
import { _ } from '@joplin/lib/locale';
import { themeStyle } from '../global-style';
import shim from '@joplin/lib/shim';
import Setting from '@joplin/lib/models/Setting';
import OidcApi from '@joplin/lib/OidcApi';
const parseUri = require('@joplin/lib/parseUri');

const WebDavOidcLoginScreen: React.FC = () => {
	const dispatch = useDispatch();
	const themeId = useSelector((state: { settings: { theme: number } }) => state.settings.theme);

	const [webviewUrl, setWebviewUrl] = useState('');
	const [oidcApi, setOidcApi] = useState<OidcApi | null>(null);
	const [redirectUri, setRedirectUri] = useState('');
	const [oauthState, setOauthState] = useState('');

	const authCodeRef = useRef<string | null>(null);

	const styles = useMemo(() => {
		const theme = themeStyle(themeId);
		return {
			screen: {
				flex: 1,
				backgroundColor: theme.backgroundColor,
			},
		};
	}, [themeId]);

	useEffect(() => {
		const initOidc = async () => {
			const api = new OidcApi({
				issuerUrl: Setting.value('sync.6.oidcIssuerUrl'),
				clientId: Setting.value('sync.6.oidcClientId'),
				clientSecret: Setting.value('sync.6.oidcClientSecret'),
				ignoreTlsErrors: Setting.value('net.ignoreTlsErrors'),
			});

			// Use a custom redirect URI that the WebView can intercept
			// This is a common pattern for mobile OAuth - using a non-http URI
			const redirect = 'joplin://oidc-callback';
			const state = Math.random().toString(36).substring(7);

			const authCodeUrl = await api.authCodeUrl(redirect, state);

			setOidcApi(api);
			setRedirectUri(redirect);
			setOauthState(state);
			setWebviewUrl(authCodeUrl);
		};

		void initOidc();
	}, []);

	const handleWebviewLoad = useCallback(async (event: WebViewNavigation) => {
		const url = event.url;

		// Check if this is our callback URL
		if (url.startsWith('joplin://oidc-callback')) {
			const parsedUrl = parseUri(url);
			const query = parsedUrl.queryKey;

			if (query.error) {
				const errorDesc = query.error_description || query.error;
				alert(`${_('Authentication failed')}: ${errorDesc}`);
				dispatch({ type: 'NAV_BACK' });
				return;
			}

			if (!authCodeRef.current && query.code) {
				// Verify state to prevent CSRF
				if (query.state !== oauthState) {
					alert(_('Authentication failed: Invalid state parameter'));
					dispatch({ type: 'NAV_BACK' });
					return;
				}

				authCodeRef.current = query.code;

				try {
					await oidcApi.execTokenRequest(authCodeRef.current, redirectUri);
					const auth = oidcApi.auth();

					const syncTargetId = Setting.value('sync.target');
					Setting.setValue(`sync.${syncTargetId}.oidcAuth`, auth ? JSON.stringify(auth) : '');

					// Update the sync target's API with the new auth
					const syncTarget = reg.syncTarget(syncTargetId);
					if (syncTarget.api && syncTarget.api()) {
						syncTarget.api().setAuth(auth);
					}

					dispatch({ type: 'NAV_BACK' });
					void reg.scheduleSync(0);
				} catch (error) {
					alert(`${_('Could not authenticate with OIDC provider. Please try again')}\n\n${(error as Error).message}`);
				}

				authCodeRef.current = null;
			}
		}
	}, [dispatch, oidcApi, oauthState, redirectUri]);

	const handleWebviewError = useCallback(() => {
		alert(_('Could not load page. Please check your connection and try again.'));
	}, []);

	const handleRetryPress = useCallback(() => {
		// Reload the page by setting a temporary URL then back to the auth URL
		const authUrl = webviewUrl;

		setWebviewUrl('about:blank');

		shim.setTimeout(() => {
			setWebviewUrl(authUrl);
		}, 500);
	}, [webviewUrl]);

	const handleShouldStartLoadWithRequest = useCallback((request: { url: string }) => {
		// Intercept the callback URL
		if (request.url.startsWith('joplin://oidc-callback')) {
			void handleWebviewLoad({ url: request.url } as WebViewNavigation);
			return false;
		}
		return true;
	}, [handleWebviewLoad]);

	const source = useMemo(() => ({ uri: webviewUrl }), [webviewUrl]);

	return (
		<View style={styles.screen}>
			<ScreenHeader title={_('WebDAV OIDC Login')} />
			<WebView
				source={source}
				onNavigationStateChange={(event: WebViewNavigation) => {
					void handleWebviewLoad(event);
				}}
				onError={handleWebviewError}
				// Allow the custom joplin:// scheme to be intercepted
				originWhitelist={['*']}
				onShouldStartLoadWithRequest={handleShouldStartLoadWithRequest}
			/>
			<Button
				title={_('Refresh')}
				onPress={handleRetryPress}
			/>
		</View>
	);
};

export default WebDavOidcLoginScreen;
