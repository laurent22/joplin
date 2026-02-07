import * as React from 'react';
import ButtonBar from './ConfigScreen/ButtonBar';
import { _ } from '@joplin/lib/locale';

const { connect } = require('react-redux');
import { reg } from '@joplin/lib/registry';
import Setting from '@joplin/lib/models/Setting';
import bridge from '../services/bridge';
const { themeStyle } = require('@joplin/lib/theme');
import { OidcApiNodeUtils } from '@joplin/lib/oidc-api-node-utils';
import OidcApi from '@joplin/lib/OidcApi';

interface Props {
	themeId: string;
	// eslint-disable-next-line @typescript-eslint/ban-types -- Old code before rule was applied
	dispatch: Function;
}

interface State {
	authLog: { key: string; text: string }[];
}

class WebDavOidcLoginScreenComponent extends React.Component<Props, State> {
	private oidcApiUtils_: OidcApiNodeUtils | null = null;

	public constructor(props: Props) {
		super(props);

		this.state = {
			authLog: [],
		};
	}

	public async componentDidMount() {
		const log = (s: string) => {
			this.setState((state: State) => {
				const authLog = state.authLog.slice();
				authLog.push({ key: (Date.now() + Math.random()).toString(), text: s });
				return { authLog: authLog };
			});
		};

		const syncTargetId = Setting.value('sync.target');

		// Create OIDC API with settings
		const oidcApi = new OidcApi({
			issuerUrl: Setting.value('sync.6.oidcIssuerUrl'),
			clientId: Setting.value('sync.6.oidcClientId'),
			clientSecret: Setting.value('sync.6.oidcClientSecret'),
			ignoreTlsErrors: Setting.value('net.ignoreTlsErrors'),
		});

		this.oidcApiUtils_ = new OidcApiNodeUtils(oidcApi);

		try {
			const auth = await this.oidcApiUtils_.oauthDance({
				log: (s: string) => log(s),
			});

			Setting.setValue(`sync.${syncTargetId}.oidcAuth`, auth ? JSON.stringify(auth) : '');

			// Update the sync target's API
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
	}

	public componentWillUnmount() {
		if (this.oidcApiUtils_) {
			this.oidcApiUtils_.cancelOAuthDance();
		}
	}

	public render() {
		const theme = themeStyle(this.props.themeId);

		const logComps = [];
		for (const l of this.state.authLog) {
			if (l.text.indexOf('http:') === 0 || l.text.indexOf('http://') === 0) {
				logComps.push(
					<a
						key={l.key}
						style={theme.urlStyle}
						href="#"
						onClick={() => { void bridge().openExternal(l.text); }}
					>
						{l.text}
					</a>,
				);
			} else {
				logComps.push(<p key={l.key} style={theme.textStyle}>{l.text}</p>);
			}
		}

		return (
			<div style={{ display: 'flex', flexDirection: 'column', height: '100%', backgroundColor: theme.backgroundColor }}>
				<div style={{ padding: theme.configScreenPadding, flex: 1, color: theme.color }}>
					<h1 style={{ ...theme.h1Style, marginBottom: '1em' }}>{_('WebDAV OIDC Authentication')}</h1>
					{logComps}
				</div>
				<ButtonBar
					onCancelClick={() => this.props.dispatch({ type: 'NAV_BACK' })}
				/>
			</div>
		);
	}
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
const mapStateToProps = (state: any) => {
	return {
		themeId: state.settings.theme,
	};
};

export default connect(mapStateToProps)(WebDavOidcLoginScreenComponent);
