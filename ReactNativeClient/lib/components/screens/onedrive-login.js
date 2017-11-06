const React = require('react'); const Component = React.Component;
const { View } = require('react-native');
const { WebView, Button, Text } = require('react-native');
const { connect } = require('react-redux');
const { Log } = require('lib/log.js');
const { Setting } = require('lib/models/setting.js');
const { ScreenHeader } = require('lib/components/screen-header.js');
const { reg } = require('lib/registry.js');
const { _ } = require('lib/locale.js');
const { BaseScreenComponent } = require('lib/components/base-screen.js');

class OneDriveLoginScreenComponent extends BaseScreenComponent {
	
	static navigationOptions(options) {
		return { header: null };
	}

	constructor() {
		super();
		this.state = { webviewUrl: '' };
		this.authCode_ = null;
	}

	componentWillMount() {
		this.setState({
			webviewUrl: this.startUrl(),
		});
	}

	startUrl() {
		return reg.oneDriveApi().authCodeUrl(this.redirectUrl());
	}

	redirectUrl() {
		return reg.oneDriveApi().nativeClientRedirectUrl();
	}

	async webview_load(noIdeaWhatThisIs) {
		// This is deprecated according to the doc but since the non-deprecated property (source)
		// doesn't exist, use this for now. The whole component is completely undocumented
		// at the moment so it's likely to change.
		const url = noIdeaWhatThisIs.url;

		if (!this.authCode_ && url.indexOf(this.redirectUrl() + '?code=') === 0) {
			Log.info('URL: ' + url);

			let code = url.split('?code=');
			this.authCode_ = code[1];

			try {
				await reg.oneDriveApi().execTokenRequest(this.authCode_, this.redirectUrl(), true);
				this.props.dispatch({ type: 'NAV_BACK' });
				reg.scheduleSync(0);
			} catch (error) {
				alert(error.message);
			}

			this.authCode_ = null;
		}
	}

	async webview_error(error) {
		Log.error(error);
	}

	retryButton_click() {
		// It seems the only way it would reload the page is by loading an unrelated
		// URL, waiting a bit, and then loading the actual URL. There's probably
		// a better way to do this.

		this.setState({
			webviewUrl: 'https://microsoft.com',
		});
		this.forceUpdate();

		setTimeout(() => {
			this.setState({
				webviewUrl: this.startUrl(),
			});
			this.forceUpdate();
		}, 1000);
	}

	render() {
		const source = {
			uri: this.state.webviewUrl,
		}

		return (
			<View style={this.styles().screen}>
				<ScreenHeader title={_('Login with OneDrive')}/>
				<WebView
					source={source}
					onNavigationStateChange={(o) => { this.webview_load(o); }}
					onError={(error) => { this.webview_error(error); }}
				/>
				<Button title={_("Refresh")} onPress={() => { this.retryButton_click(); }}></Button>
			</View>
		);
	}

}

const OneDriveLoginScreen = connect(
	(state) => {
		return {};
	}
)(OneDriveLoginScreenComponent)

module.exports = { OneDriveLoginScreen };