import * as React from 'react';
import ButtonBar from './ConfigScreen/ButtonBar';
import { _ } from '@joplin/lib/locale';

const { connect } = require('react-redux');
import { reg } from '@joplin/lib/registry';
import Setting from '@joplin/lib/models/Setting';
import bridge from '../services/bridge';
const { themeStyle } = require('@joplin/lib/theme');
const OidcApi = require('@joplin/lib/OidcApi').default;
const OidcApiNodeUtils = require('@joplin/lib/oidc-api-node-utils').default;

interface Props {
	themeId: number;
}

interface OidcApiUtils {
	cancelOAuthDance(): void;
	oauthDance(targetConsole?: { log: (message: string)=> void }): Promise<unknown>;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
class WebDavOidcLoginScreenComponent extends React.Component<any, any> {
	private oidcApiUtils_: OidcApiUtils = null;

	public constructor(props: Props) {
		super(props);

		this.state = {
			authLog: [],
		};
	}

	public async componentDidMount() {
		await this.startLogin_();
	}

	public componentWillUnmount() {
		if (this.oidcApiUtils_) this.oidcApiUtils_.cancelOAuthDance();
	}

	private log_(message: string) {
		this.setState((state: { authLog: { key: string; text: string }[] }) => {
			const authLog = state.authLog.slice();
			authLog.push({ key: (Date.now() + Math.random()).toString(), text: message });
			return { authLog };
		});
	}

	private async startLogin_() {
		const syncTargetId = Setting.value('sync.target');
		if (![5, 6].includes(syncTargetId)) {
			this.log_(_('OpenID Connect login is not available for this synchronisation target.'));
			return;
		}

		const api = new OidcApi({
			issuer: Setting.value(`sync.${syncTargetId}.oidcIssuer`),
			clientId: Setting.value(`sync.${syncTargetId}.oidcClientId`),
			clientSecret: Setting.value(`sync.${syncTargetId}.oidcClientSecret`),
			scope: Setting.value(`sync.${syncTargetId}.oidcScope`),
		});

		this.oidcApiUtils_ = new OidcApiNodeUtils(api);

		try {
			const auth = await this.oidcApiUtils_.oauthDance({
				log: (message: string) => this.log_(message),
			});

			Setting.setValue(`sync.${syncTargetId}.auth`, auth ? JSON.stringify(auth) : null);

			if (!auth) {
				this.log_(_('Authentication was not completed (did not receive an authentication token).'));
				return;
			}

			await bridge().showInfoMessageBox(_('You are now logged into your account.'));
			void reg.scheduleSync(0);
			this.props.dispatch({ type: 'NAV_BACK' });
		} catch (error) {
			this.log_(error.message);
		}
	}

	public render() {
		const theme = themeStyle(this.props.themeId);

		const logComps = [];
		for (const l of this.state.authLog) {
			if (l.text.indexOf('http:') === 0) {
				logComps.push(<a key={l.key} style={theme.urlStyle} href="#" onClick={() => { void bridge().openExternal(l.text); }}>{l.text}</a>);
			} else {
				logComps.push(<p key={l.key} style={theme.textStyle}>{l.text}</p>);
			}
		}

		return (
			<div style={{ display: 'flex', flexDirection: 'column', height: '100%', backgroundColor: theme.backgroundColor }}>
				<div style={{ padding: theme.configScreenPadding, flex: 1, color: theme.color }}>
					{logComps}
				</div>
				<ButtonBar
					onCancelClick={() => this.props.dispatch({ type: 'NAV_BACK' })}
				/>
			</div>
		);
	}
}

const mapStateToProps = (state: { settings: { theme: number } }) => {
	return {
		themeId: state.settings.theme,
	};
};

export default connect(mapStateToProps)(WebDavOidcLoginScreenComponent);
