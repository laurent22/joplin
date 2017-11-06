const React = require('react');
const { connect } = require('react-redux');
const shared = require('lib/components/shared/side-menu-shared.js');
const { Synchronizer } = require('lib/synchronizer.js');
const { reg } = require('lib/registry.js');
const { bridge } = require('electron').remote.require('./bridge');

class OneDriveAuthScreenComponent extends React.Component {

	constructor() {
		super();
		this.webview_ = null;
		this.authCode_ = null;
	}

	back_click() {
		this.props.dispatch({
			type: 'NAV_BACK',
		});
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
		this.setState({
			webviewReady: true,
		});
		
		this.webview_.addEventListener('did-navigate', async (event) => {
			const url = event.url;

			if (this.authCode_) return;
			if (url.indexOf(this.redirectUrl() + '?code=') !== 0) return;

			let code = url.split('?code=');
			this.authCode_ = code[1];

			try {
				await reg.oneDriveApi().execTokenRequest(this.authCode_, this.redirectUrl(), true);
				this.props.dispatch({ type: 'NAV_BACK' });
				reg.scheduleSync(0);
			} catch (error) {
				bridge().showMessageBox({
					type: 'error',
					message: error.message,
				});
			}

			this.authCode_ = null;
		});
	}

	startUrl() {
		return reg.oneDriveApi().authCodeUrl(this.redirectUrl());
	}

	redirectUrl() {
		return reg.oneDriveApi().nativeClientRedirectUrl();
	}

	render() {
		const webviewStyle = {
			width: this.props.style.width,
			height: this.props.style.height,
			overflow: 'hidden',
		};

		return (
			<div>
				<a href="#" onClick={() => {this.back_click()}}>BACK</a>
				<a href="#" onClick={() => {this.refresh_click()}}>REFRESH</a>
				<webview src={this.startUrl()} style={webviewStyle} nodeintegration="1" ref={elem => this.webview_ = elem} />
			</div>
		);
	}

}

const mapStateToProps = (state) => {
	return {};
};

const OneDriveAuthScreen = connect(mapStateToProps)(OneDriveAuthScreenComponent);

module.exports = { OneDriveAuthScreen };