const React = require('react');
const { connect } = require('react-redux');
const { reg } = require('lib/registry.js');
const { bridge } = require('electron').remote.require('./bridge');
const { Header } = require('./Header.min.js');
const { themeStyle } = require('../theme.js');
const { _ } = require('lib/locale.js');

class OneDriveLoginScreenComponent extends React.Component {

	constructor() {
		super();
		this.webview_ = null;
		this.authCode_ = null;
	}

	refresh_click() {
		if (!this.webview_) return;
		this.webview_.src = this.startUrl();
	}

	componentWillMount() {
		this.setState({
			webviewUrl: this.startUrl(),
			webviewReady: false,
		});
	}

	componentDidMount() {
		this.webview_.addEventListener('dom-ready', this.webview_domReady.bind(this));
	}

	componentWillUnmount() {
		this.webview_.addEventListener('dom-ready', this.webview_domReady.bind(this));
	}

	webview_domReady() {
		this.setState({ webviewReady: true });
		
		this.webview_.addEventListener('did-navigate', async (event) => {
			const url = event.url;

			if (this.authCode_) return;

			const urlParse = require('url').parse;
			const parsedUrl = urlParse(url.trim(), true);

			if (!('code' in parsedUrl.query)) return;

			this.authCode_ = parsedUrl.query.code;

			try {
				await reg.syncTarget().api().execTokenRequest(this.authCode_, this.redirectUrl(), true);
				this.props.dispatch({ type: 'NAV_BACK' });
				reg.scheduleSync(0);
			} catch (error) {
				bridge().showErrorMessageBox('Could not login to OneDrive. Please try again.\n\n' + error.message + "\n\n" + url.match(/.{1,64}/g).join('\n'));
			}

			this.authCode_ = null;
		});
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

		const headerStyle = {
			width: style.width,
		};

		const webviewStyle = {
			width: this.props.style.width,
			height: this.props.style.height - theme.headerHeight,
			overflow: 'hidden',
		};

		const headerButtons = [
			{
				title: _('Refresh'),
				onClick: () => this.refresh_click(),
				iconName: 'fa-refresh',
			},
		];

		return (
			<div>
				<Header style={headerStyle} buttons={headerButtons} />
				<webview src={this.startUrl()} style={webviewStyle} nodeintegration="1" ref={elem => this.webview_ = elem} />
			</div>
		);
	}

}

const mapStateToProps = (state) => {
	return {
		theme: state.settings.theme,
	};
};

const OneDriveLoginScreen = connect(mapStateToProps)(OneDriveLoginScreenComponent);

module.exports = { OneDriveLoginScreen };