import * as React from 'react';
import ButtonBar from './ConfigScreen/ButtonBar';
import { _ } from '@joplin/lib/locale';

const { connect } = require('react-redux');
import { reg } from '@joplin/lib/registry';
import Setting from '@joplin/lib/models/Setting';
const bridge = require('@electron/remote').require('./bridge').default;
const { themeStyle } = require('@joplin/lib/theme');
const { OneDriveApiNodeUtils } = require('@joplin/lib/onedrive-api-node-utils.js');

interface Props {
	themeId: string;
}

class OneDriveLoginScreenComponent extends React.Component<any, any> {
	public constructor(props: Props) {
		super(props);

		this.state = {
			authLog: [],
		};
	}

	public async componentDidMount() {
		const log = (s: any) => {
			this.setState((state: any) => {
				const authLog = state.authLog.slice();
				authLog.push({ key: (Date.now() + Math.random()).toString(), text: s });
				return { authLog: authLog };
			});
		};

		const syncTargetId = Setting.value('sync.target');
		const syncTarget = reg.syncTarget(syncTargetId);
		const oneDriveApiUtils = new OneDriveApiNodeUtils(syncTarget.api());
		const auth = await oneDriveApiUtils.oauthDance({
			log: (s: any) => log(s),
		});

		Setting.setValue(`sync.${syncTargetId}.auth`, auth ? JSON.stringify(auth) : null);
		syncTarget.api().setAuth(auth);

		if (!auth) {
			log(_('Authentication was not completed (did not receive an authentication token).'));
		} else {
			void reg.scheduleSync(0);
		}
	}

	public startUrl() {
		return reg.syncTarget().api().authCodeUrl(this.redirectUrl());
	}

	public redirectUrl() {
		return reg.syncTarget().api().nativeClientRedirectUrl();
	}

	public render() {
		const theme = themeStyle(this.props.themeId);

		const logComps = [];
		for (const l of this.state.authLog) {
			if (l.text.indexOf('http:') === 0) {
				logComps.push(<a key={l.key} style={theme.urlStyle} href="#" onClick={() => { bridge().openExternal(l.text); }}>{l.text}</a>);
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

const mapStateToProps = (state: any) => {
	return {
		themeId: state.settings.theme,
	};
};

export default connect(mapStateToProps)(OneDriveLoginScreenComponent);

