const React = require('react'); const Component = React.Component;
const { TextInput, TouchableOpacity, Linking, View, Switch, Slider, StyleSheet, Text, Button, ScrollView } = require('react-native');
const { connect } = require('react-redux');
const { ScreenHeader } = require('lib/components/screen-header.js');
const { _ } = require('lib/locale.js');
const { BaseScreenComponent } = require('lib/components/base-screen.js');
const { Dropdown } = require('lib/components/Dropdown.js');
const { themeStyle } = require('lib/components/global-style.js');
const { time } = require('lib/time-utils.js');
const Setting = require('lib/models/Setting.js');
const shared = require('lib/components/shared/encryption-config-shared.js');

class EncryptionConfigScreenComponent extends BaseScreenComponent {
	
	static navigationOptions(options) {
		return { header: null };
	}

	constructor() {
		super();

		shared.constructor(this);

		this.styles_ = {};
	}

	componentDidMount() {
		this.isMounted_ = true;
	}

	componentWillUnmount() {
		this.isMounted_ = false;
	}

	initState(props) {
		return shared.initState(this, props);
	}

	async refreshStats() {
		return shared.refreshStats(this);
	}

	componentWillMount() {
		this.initState(this.props);
	}

	componentWillReceiveProps(nextProps) {
		this.initState(nextProps);
	}

	async checkPasswords() {
		return shared.checkPasswords(this);
	}

	styles() {
		const themeId = this.props.theme;
		const theme = themeStyle(themeId);

		if (this.styles_[themeId]) return this.styles_[themeId];
		this.styles_ = {};

		let styles = {
			titleText: {
				flex: 1,
				fontWeight: 'bold',
				flexDirection: 'column',
				fontSize: theme.fontSize,
				paddingTop: 5,
				paddingBottom: 5,
			},
			normalText: {
				flex: 1,
				fontSize: theme.fontSize,
			},
			container: {
				flex: 1,
				padding: theme.margin,
			},
		}

		this.styles_[themeId] = StyleSheet.create(styles);
		return this.styles_[themeId];
	}

	renderMasterKey(num, mk) {
		const theme = themeStyle(this.props.theme);

		const onSaveClick = () => {
			return shared.onSavePasswordClick(this, mk);
		}

		const onPasswordChange = (text) => {
			return shared.onPasswordChange(this, mk, text);
		}

		const password = this.state.passwords[mk.id] ? this.state.passwords[mk.id] : '';
		const passwordOk = this.state.passwordChecks[mk.id] === true ? '✔' : '❌';
		const active = this.props.activeMasterKeyId === mk.id ? '✔' : '';

		return (
			<View key={mk.id}>
				<Text style={this.styles().titleText}>{_('Master Key %d', num)}</Text>
				<Text style={this.styles().normalText}>{_('Created: %s', time.formatMsToLocal(mk.created_time))}</Text>
				<View style={{flexDirection: 'row', alignItems: 'center'}}>
					<Text style={{flex:0, fontSize: theme.fontSize, marginRight: 10}}>{_('Password:')}</Text>
					<TextInput value={password} onChangeText={(text) => onPasswordChange(text)} style={{flex:1, marginRight: 10}}></TextInput>
					<Text style={{fontSize: theme.fontSize, marginRight: 10}}>{passwordOk}</Text>
					<Button title={_('Save')} onPress={() => onSaveClick()}></Button>
				</View>
			</View>
		);
	}

	render() {
		const masterKeys = this.state.masterKeys;
		const decryptedItemsInfo = this.props.encryptionEnabled ? <Text style={this.styles().normalText}>{shared.decryptedStatText(this)}</Text> : null;

		const mkComps = [];
		for (let i = 0; i < masterKeys.length; i++) {
			const mk = masterKeys[i];
			mkComps.push(this.renderMasterKey(i+1, mk));
		}

		return (
			<View style={this.rootStyle(this.props.theme).root}>
				<ScreenHeader title={_('Configuration')}/>
				<ScrollView style={this.styles().container}>
					<Text style={this.styles().titleText}>{_('Status')}</Text>
					<Text style={this.styles().normalText}>{_('Encryption is: %s', this.props.encryptionEnabled ? _('Enabled') : _('Disabled'))}</Text>
					{decryptedItemsInfo}
					{mkComps}
				</ScrollView>
			</View>
		);
	}

}

const EncryptionConfigScreen = connect(
	(state) => {
		return {
			theme: state.settings.theme,
			masterKeys: state.masterKeys,
			passwords: state.settings['encryption.passwordCache'],
			encryptionEnabled: state.settings['encryption.enabled'],
			activeMasterKeyId: state.settings['encryption.activeMasterKeyId'],
		};
	}
)(EncryptionConfigScreenComponent)

module.exports = { EncryptionConfigScreen };