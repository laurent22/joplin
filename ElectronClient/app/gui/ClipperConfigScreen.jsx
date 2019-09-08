const React = require('react');
const { connect } = require('react-redux');
const { bridge } = require('electron').remote.require('./bridge');
const { Header } = require('./Header.min.js');
const { themeStyle } = require('../theme.js');
const { _ } = require('lib/locale.js');
const ClipperServer = require('lib/ClipperServer');
const Setting = require('lib/models/Setting');
const { clipboard } = require('electron');

class ClipperConfigScreenComponent extends React.Component {
	constructor() {
		super();

		this.copyToken_click = this.copyToken_click.bind(this);
	}

	disableClipperServer_click() {
		Setting.setValue('clipperServer.autoStart', false);
		ClipperServer.instance().stop();
	}

	enableClipperServer_click() {
		Setting.setValue('clipperServer.autoStart', true);
		ClipperServer.instance().start();
	}

	chromeButton_click() {
		bridge().openExternal('https://chrome.google.com/webstore/detail/joplin-web-clipper/alofnhikmmkdbbbgpnglcpdollgjjfek');
	}

	firefoxButton_click() {
		bridge().openExternal('https://addons.mozilla.org/en-US/firefox/addon/joplin-web-clipper/');
	}

	copyToken_click() {
		clipboard.writeText(this.props.apiToken);

		alert(_('Token has been copied to the clipboard!'));
	}

	render() {
		const style = this.props.style;
		const theme = themeStyle(this.props.theme);

		const headerStyle = Object.assign({}, theme.headerStyle, { width: style.width });

		const containerStyle = Object.assign({}, theme.containerStyle, {
			overflowY: 'scroll',
			height: style.height,
		});

		const buttonStyle = Object.assign({}, theme.buttonStyle, { marginRight: 10 });

		const stepBoxStyle = {
			border: '1px solid #ccc',
			padding: 15,
			paddingTop: 0,
			marginBottom: 15,
			backgroundColor: theme.backgroundColor,
		};

		let webClipperStatusComps = [];

		if (this.props.clipperServerAutoStart) {
			webClipperStatusComps.push(
				<p key="text_1" style={theme.textStyle}>
					<b>{_('The web clipper service is enabled and set to auto-start.')}</b>
				</p>
			);
			if (this.props.clipperServer.startState === 'started') {
				webClipperStatusComps.push(
					<p key="text_2" style={theme.textStyle}>
						{_('Status: Started on port %d', this.props.clipperServer.port)}
					</p>
				);
			} else {
				webClipperStatusComps.push(
					<p key="text_3" style={theme.textStyle}>
						{_('Status: %s', this.props.clipperServer.startState)}
					</p>
				);
			}
			webClipperStatusComps.push(
				<button key="disable_button" onClick={this.disableClipperServer_click}>
					{_('Disable Web Clipper Service')}
				</button>
			);
		} else {
			webClipperStatusComps.push(
				<p key="text_4" style={theme.textStyle}>
					{_('The web clipper service is not enabled.')}
				</p>
			);
			webClipperStatusComps.push(
				<button key="enable_button" style={buttonStyle} onClick={this.enableClipperServer_click}>
					{_('Enable Web Clipper Service')}
				</button>
			);
		}

		const apiTokenStyle = Object.assign({}, theme.textStyle, {
			color: theme.colorFaded,
			wordBreak: 'break-all',
			paddingTop: 10,
			paddingBottom: 10,
		});

		return (
			<div>
				<Header style={headerStyle} />
				<div style={containerStyle}>
					<div style={{ padding: theme.margin }}>
						<p style={theme.textStyle}>{_('Joplin Web Clipper allows saving web pages and screenshots from your browser to Joplin.')}</p>
						<p style={theme.textStyle}>{_('In order to use the web clipper, you need to do the following:')}</p>

						<div style={stepBoxStyle}>
							<p style={theme.h1Style}>{_('Step 1: Enable the clipper service')}</p>
							<p style={theme.textStyle}>{_('This service allows the browser extension to communicate with Joplin. When enabling it your firewall may ask you to give permission to Joplin to listen to a particular port.')}</p>
							<div>{webClipperStatusComps}</div>
						</div>

						<div style={stepBoxStyle}>
							<p style={theme.h1Style}>{_('Step 2: Install the extension')}</p>
							<p style={theme.textStyle}>{_('Download and install the relevant extension for your browser:')}</p>
							<div>
								<p>
									<a href="#" onClick={this.chromeButton_click}>
										<img src="data:image/png;base64,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" />
									</a>
								</p>
								<p>
									<a href="#" onClick={this.firefoxButton_click}>
										<img src="data:image/jpeg;base64,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" />
									</a>
								</p>
							</div>
						</div>

						<div style={stepBoxStyle}>
							<p style={theme.h1Style}>{_('Advanced options')}</p>
							<p style={theme.textStyle}>{_('Authorisation token:')}</p>
							<p style={apiTokenStyle}>
								{this.props.apiToken}{' '}
								<a style={theme.urlStyle} href="#" onClick={this.copyToken_click}>
									{_('Copy token')}
								</a>
							</p>
							<p style={theme.textStyle}>{_('This authorisation token is only needed to allow third-party applications to access Joplin.')}</p>
						</div>
					</div>
				</div>
			</div>
		);
	}
}

const mapStateToProps = state => {
	return {
		theme: state.settings.theme,
		clipperServer: state.clipperServer,
		clipperServerAutoStart: state.settings['clipperServer.autoStart'],
		apiToken: state.settings['api.token'],
	};
};

const ClipperConfigScreen = connect(mapStateToProps)(ClipperConfigScreenComponent);

module.exports = { ClipperConfigScreen };
