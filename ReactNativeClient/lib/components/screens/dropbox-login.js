const React = require('react'); const Component = React.Component;
const { View, Button, Text, TextInput, TouchableOpacity } = require('react-native');
const { connect } = require('react-redux');
const { ScreenHeader } = require('lib/components/screen-header.js');
const { _ } = require('lib/locale.js');
const { BaseScreenComponent } = require('lib/components/base-screen.js');
const DialogBox = require('react-native-dialogbox').default;
const { dialogs } = require('lib/dialogs.js');
const Shared = require('lib/components/shared/dropbox-login-shared');

class DropboxLoginScreenComponent extends BaseScreenComponent {

	constructor() {
		super();

		this.shared_ = new Shared(
			this,
			(msg) => dialogs.info(this, msg),
			(msg) => dialogs.error(this, msg)
		);
	}

	componentWillMount() {
		this.shared_.refreshUrl();
	}

	render() {
		return (
			<View style={this.styles().screen}>
				<ScreenHeader title={_('Login with Dropbox')}/>
				
				<Text>{_('To allow Joplin to synchronise with Dropbox, please follow the steps below:')}</Text>
				<Text>{_('Step 1: Open this URL in your browser to authorise the application:')}</Text>
				<View>
					<TouchableOpacity onPress={this.shared_.loginUrl_click}>
						<Text>{this.state.loginUrl}</Text>
					</TouchableOpacity>
				</View>
				<Text>{_('Step 2: Enter the code provided by Dropbox:')}</Text>
				<TextInput value={this.state.authCode} onChangeText={this.shared_.authCodeInput_change}/>

				<Button disabled={this.state.checkingAuthToken} title={_("Submit")} onPress={this.shared_.submit_click}></Button>

				<DialogBox ref={dialogbox => { this.dialogbox = dialogbox }}/>
			</View>
		);
	}

}

const DropboxLoginScreen = connect(
	(state) => {
		return {};
	}
)(DropboxLoginScreenComponent)

module.exports = { DropboxLoginScreen };