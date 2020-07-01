const React = require('react');

const { View, Button, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView } = require('react-native');
const { connect } = require('react-redux');
const { ScreenHeader } = require('lib/components/screen-header.js');
const { _ } = require('lib/locale.js');
const { BaseScreenComponent } = require('lib/components/base-screen.js');
const DialogBox = require('react-native-dialogbox').default;
const { dialogs } = require('lib/dialogs.js');
const Shared = require('lib/components/shared/dropbox-login-shared');
const { themeStyle } = require('lib/components/global-style.js');

class DropboxLoginScreenComponent extends BaseScreenComponent {
	constructor() {
		super();

		this.styles_ = {};

		this.shared_ = new Shared(this, msg => dialogs.info(this, msg), msg => dialogs.error(this, msg));
	}

	UNSAFE_componentWillMount() {
		this.shared_.refreshUrl();
	}

	styles() {
		const themeId = this.props.theme;
		const theme = themeStyle(themeId);

		if (this.styles_[themeId]) return this.styles_[themeId];
		this.styles_ = {};

		const styles = {
			screen: {
				flex: 1,
				backgroundColor: theme.backgroundColor,
			},
			container: {
				padding: theme.margin,
				backgroundColor: theme.backgroundColor,
			},
			stepText: Object.assign({}, theme.normalText, { marginBottom: theme.margin }),
			urlText: Object.assign({}, theme.urlText, { marginBottom: theme.margin }),
		};

		this.styles_[themeId] = StyleSheet.create(styles);
		return this.styles_[themeId];
	}

	render() {
		const theme = themeStyle(this.props.theme);

		return (
			<View style={this.styles().screen}>
				<ScreenHeader title={_('Login with Dropbox')} />

				<ScrollView style={this.styles().container}>
					<Text style={this.styles().stepText}>{_('To allow Joplin to synchronise with Dropbox, please follow the steps below:')}</Text>
					<Text style={this.styles().stepText}>{_('Step 1: Open this URL in your browser to authorise the application:')}</Text>
					<View>
						<TouchableOpacity onPress={this.shared_.loginUrl_click}>
							<Text style={this.styles().urlText}>{this.state.loginUrl}</Text>
						</TouchableOpacity>
					</View>
					<Text style={this.styles().stepText}>{_('Step 2: Enter the code provided by Dropbox:')}</Text>
					<TextInput placeholder={_('Enter code here')} placeholderTextColor={theme.colorFaded} selectionColor={theme.textSelectionColor} keyboardAppearance={theme.keyboardAppearance} value={this.state.authCode} onChangeText={this.shared_.authCodeInput_change} style={theme.lineInput} />
					<View style={{ height: 10 }}></View>
					<Button disabled={this.state.checkingAuthToken} title={_('Submit')} onPress={this.shared_.submit_click}></Button>

					{/* Add this extra padding to make sure the view is scrollable when the keyboard is visible on small screens (iPhone SE) */}
					<View style={{ height: 200 }}></View>
				</ScrollView>

				<DialogBox
					ref={dialogbox => {
						this.dialogbox = dialogbox;
					}}
				/>
			</View>
		);
	}
}

const DropboxLoginScreen = connect(state => {
	return {
		theme: state.settings.theme,
	};
})(DropboxLoginScreenComponent);

module.exports = { DropboxLoginScreen };
