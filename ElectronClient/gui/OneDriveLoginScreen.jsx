const React = require('react');
const { connect } = require('react-redux');
const { reg } = require('lib/registry.js');
const Setting = require('lib/models/Setting');
const { bridge } = require('electron').remote.require('./bridge');
const { Header } = require('./Header.min.js');
const { themeStyle } = require('../theme.js');
const { _ } = require('lib/locale.js');
const { OneDriveApiNodeUtils } = require('lib/onedrive-api-node-utils.js');

class OneDriveLoginScreenComponent extends React.Component {
	constructor() {
		super();

		this.state = {
			authLog: [],
		};
	}

	async componentDidMount() {
		const log = (s) => {
			this.setState(state => {
				const authLog = state.authLog.slice();
				authLog.push({ key: (Date.now() + Math.random()).toString(), text: s });
				return { authLog: authLog };
			});
		};

		const syncTargetId = Setting.value('sync.target');
		const syncTarget = reg.syncTarget(syncTargetId);
		const oneDriveApiUtils = new OneDriveApiNodeUtils(syncTarget.api());
		const auth = await oneDriveApiUtils.oauthDance({
			log: (s) => log(s),
		});

		Setting.setValue(`sync.${syncTargetId}.auth`, auth ? JSON.stringify(auth) : null);
		syncTarget.api().setAuth(auth);

		if (!auth) {
			log(_('Authentication was not completed (did not receive an authentication token).'));
		} else {
			reg.scheduleSync(0);
		}
	}

	startUrl() {
		return reg.syncTarget().api().authCodeUrl(this.redirectUrl());
	}

	redirectUrl() {
		return reg.syncTarget().api().nativeClientRedirectUrl();
	}

	render() {
		const style = this.props.style;
		const theme = themeStyle(this.props.theme);
		const headerStyle = Object.assign({}, theme.headerStyle, { width: style.width });

		const logComps = [];
		for (const l of this.state.authLog) {
			if (l.text.indexOf('http:') === 0) {
				logComps.push(<a key={l.key} style={theme.urlStyle} href="#" onClick={() => { bridge().openExternal(l.text); }}>{l.text}</a>);
			} else {
				logComps.push(<p key={l.key} style={theme.textStyle}>{l.text}</p>);
			}
		}

		return (
			<div>
				<Header style={headerStyle}/>
				<div style={{ padding: 10 }}>
					{logComps}
				</div>
			</div>
		);
	}
}

const mapStateToProps = state => {
	return {
		theme: state.settings.theme,
	};
};

const OneDriveLoginScreen = connect(mapStateToProps)(OneDriveLoginScreenComponent);

module.exports = { OneDriveLoginScreen };
