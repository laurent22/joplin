const React = require('react');

const { View } = require('react-native');
const { Button } = require('react-native');
const { WebView } = require('react-native-webview');
const { connect } = require('react-redux');
const { ScreenHeader } = require('lib/components/screen-header.js');
const { reg } = require('lib/registry.js');
const { _ } = require('lib/locale.js');
const { BaseScreenComponent } = require('lib/components/base-screen.js');
const parseUri = require('lib/parseUri');

class OneDriveLoginScreenComponent extends BaseScreenComponent {
	static navigationOptions() {
		return { header: null };
	}

	constructor() {
		super();
		this.state = { webviewUrl: '' };
		this.authCode_ = null;
	}

	UNSAFE_componentWillMount() {
		this.setState({
			webviewUrl: this.startUrl(),
		});
	}

	startUrl() {
		return reg
			.syncTarget()
			.api()
			.authCodeUrl(this.redirectUrl());
	}

	redirectUrl() {
		return reg
			.syncTarget()
			.api()
			.nativeClientRedirectUrl();
	}

	async webview_load(noIdeaWhatThisIs) {
		// This is deprecated according to the doc but since the non-deprecated property (source)
		// doesn't exist, use this for now. The whole component is completely undocumented
		// at the moment so it's likely to change.
		const url = noIdeaWhatThisIs.url;
		const parsedUrl = parseUri(url);

		if (!this.authCode_ && parsedUrl && parsedUrl.queryKey && parsedUrl.queryKey.code) {
			this.authCode_ = parsedUrl.queryKey.code;

			try {
				await reg
					.syncTarget()
					.api()
					.execTokenRequest(this.authCode_, this.redirectUrl(), true);
				this.props.dispatch({ type: 'NAV_BACK' });
				reg.scheduleSync(0);
			} catch (error) {
				alert(`Could not login to OneDrive. Please try again\n\n${error.message}\n\n${url}`);
			}

			this.authCode_ = null;
		}
	}

	async webview_error() {
		alert('Could not load page. Please check your connection and try again.');
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
		};

		return (
			<View style={this.styles().screen}>
				<ScreenHeader title={_('Login with OneDrive')} />
				<WebView
					source={source}
					onNavigationStateChange={o => {
						this.webview_load(o);
					}}
					onError={() => {
						this.webview_error();
					}}
				/>
				<Button
					title={_('Refresh')}
					onPress={() => {
						this.retryButton_click();
					}}
				></Button>
			</View>
		);
	}
}

const OneDriveLoginScreen = connect(() => {
	return {};
})(OneDriveLoginScreenComponent);

module.exports = { OneDriveLoginScreen };
