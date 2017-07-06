import React, { Component } from 'react';
import { View } from 'react-native';
import { WebView, Button } from 'react-native';
import { connect } from 'react-redux'
import { Log } from 'lib/log.js'
import { Setting } from 'lib/models/setting.js'
import { ScreenHeader } from 'lib/components/screen-header.js';
import { reg } from 'lib/registry.js';
import { _ } from 'lib/locale.js';

class OneDriveLoginScreenComponent extends React.Component {
	
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
			webviewUrl: reg.oneDriveApi().authCodeUrl(this.redirectUrl()),
		});
	}

	redirectUrl() {
		return 'https://login.microsoftonline.com/common/oauth2/nativeclient';
	}

	async webview_load(noIdeaWhatThisIs) {
		// This is deprecated according to the doc but since the non-deprecated property (source)
		// doesn't exist, use this for now. The whole component is completely undocumented
		// at the moment so it's likely to change.
		const url = noIdeaWhatThisIs.url;

		if (!this.authCode_ && url.indexOf(this.redirectUrl() + '?code=') === 0) {
			console.info('URL: ' + url);

			let code = url.split('?code=');
			this.authCode_ = code[1];

			await reg.oneDriveApi().execTokenRequest(this.authCode_, this.redirectUrl(), true);

			this.authCode_ = null;
		}
	}

	render() {
		const source = {
			uri: this.state.webviewUrl,
		}

		return (
			<View style={{flex: 1}}>
				<ScreenHeader navState={this.props.navigation.state} />
				<WebView
					source={source}
					style={{marginTop: 20}}
					onNavigationStateChange={(o) => { this.webview_load(o); }}
				/>
			</View>
		);
	}

}

const OneDriveLoginScreen = connect(
	(state) => {
		return {};
	}
)(OneDriveLoginScreenComponent)

export { OneDriveLoginScreen };