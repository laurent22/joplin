const React = require('react');

const { TextInput, TouchableOpacity, Linking, View, StyleSheet, Text, Button, ScrollView } = require('react-native');
const EncryptionService = require('lib/services/EncryptionService');
const { connect } = require('react-redux');
const { ScreenHeader } = require('lib/components/screen-header.js');
const { _ } = require('lib/locale.js');
const { BaseScreenComponent } = require('lib/components/base-screen.js');
const { themeStyle } = require('lib/components/global-style.js');
const { time } = require('lib/time-utils.js');
const shared = require('lib/components/shared/encryption-config-shared.js');
const { dialogs } = require('lib/dialogs.js');
const DialogBox = require('react-native-dialogbox').default;

class EncryptionConfigScreenComponent extends BaseScreenComponent {
	static navigationOptions() {
		return { header: null };
	}

	constructor() {
		super();

		this.state = {
			passwordPromptShow: false,
			passwordPromptAnswer: '',
			passwordPromptConfirmAnswer: '',
		};

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

	UNSAFE_componentWillMount() {
		this.initState(this.props);
	}

	UNSAFE_componentWillReceiveProps(nextProps) {
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
				marginTop: theme.marginTop,
				marginBottom: 5,
				color: theme.color,
			},
			normalText: {
				flex: 1,
				fontSize: theme.fontSize,
				color: theme.color,
			},
			normalTextInput: {
				margin: 10,
				color: theme.color,
				borderWidth: 1,
				borderColor: theme.dividerColor,
			},
			container: {
				flex: 1,
				padding: theme.margin,
			},
		};

		this.styles_[themeId] = StyleSheet.create(styles);
		return this.styles_[themeId];
	}

	renderMasterKey(num, mk) {
		const theme = themeStyle(this.props.theme);

		const onSaveClick = () => {
			return shared.onSavePasswordClick(this, mk);
		};

		const onPasswordChange = text => {
			return shared.onPasswordChange(this, mk, text);
		};

		const password = this.state.passwords[mk.id] ? this.state.passwords[mk.id] : '';
		const passwordOk = this.state.passwordChecks[mk.id] === true ? '✔' : '❌';

		const inputStyle = { flex: 1, marginRight: 10, color: theme.color };
		inputStyle.borderBottomWidth = 1;
		inputStyle.borderBottomColor = theme.strongDividerColor;

		return (
			<View key={mk.id}>
				<Text style={this.styles().titleText}>{_('Master Key %s', mk.id.substr(0, 6))}</Text>
				<Text style={this.styles().normalText}>{_('Created: %s', time.formatMsToLocal(mk.created_time))}</Text>
				<View style={{ flexDirection: 'row', alignItems: 'center' }}>
					<Text style={{ flex: 0, fontSize: theme.fontSize, marginRight: 10, color: theme.color }}>{_('Password:')}</Text>
					<TextInput selectionColor={theme.textSelectionColor} secureTextEntry={true} value={password} onChangeText={text => onPasswordChange(text)} style={inputStyle}></TextInput>
					<Text style={{ fontSize: theme.fontSize, marginRight: 10, color: theme.color }}>{passwordOk}</Text>
					<Button title={_('Save')} onPress={() => onSaveClick()}></Button>
				</View>
			</View>
		);
	}

	passwordPromptComponent() {
		const theme = themeStyle(this.props.theme);

		const onEnableClick = async () => {
			try {
				const password = this.state.passwordPromptAnswer;
				if (!password) throw new Error(_('Password cannot be empty'));
				const password2 = this.state.passwordPromptConfirmAnswer;
				if (!password2) throw new Error(_('Confirm password cannot be empty'));
				if (password !== password2) throw new Error(_('Passwords do not match!'));
				await EncryptionService.instance().generateMasterKeyAndEnableEncryption(password);
				this.setState({ passwordPromptShow: false });
			} catch (error) {
				await dialogs.error(this, error.message);
			}
		};

		return (
			<View style={{ flex: 1, borderColor: theme.dividerColor, borderWidth: 1, padding: 10, marginTop: 10, marginBottom: 10 }}>
				<Text style={{ fontSize: theme.fontSize, color: theme.color, marginBottom: 10 }}>{_('Enabling encryption means *all* your notes and attachments are going to be re-synchronised and sent encrypted to the sync target. Do not lose the password as, for security purposes, this will be the *only* way to decrypt the data! To enable encryption, please enter your password below.')}</Text>
				<Text style={this.styles().normalText}>{_('Password:')}</Text>
				<TextInput
					selectionColor={theme.textSelectionColor}
					style={this.styles().normalTextInput}
					secureTextEntry={true}
					value={this.state.passwordPromptAnswer}
					onChangeText={text => {
						this.setState({ passwordPromptAnswer: text });
					}}
				></TextInput>

				<Text style={this.styles().normalText}>{_('Confirm password:')}</Text>
				<TextInput
					selectionColor={theme.textSelectionColor}
					style={this.styles().normalTextInput}
					secureTextEntry={true}
					value={this.state.passwordPromptConfirmAnswer}
					onChangeText={text => {
						this.setState({ passwordPromptConfirmAnswer: text });
					}}
				></TextInput>
				<View style={{ flexDirection: 'row' }}>
					<View style={{ flex: 1, marginRight: 10 }}>
						<Button
							title={_('Enable')}
							onPress={() => {
								onEnableClick();
							}}
						></Button>
					</View>
					<View style={{ flex: 1 }}>
						<Button
							title={_('Cancel')}
							onPress={() => {
								this.setState({ passwordPromptShow: false });
							}}
						></Button>
					</View>
				</View>
			</View>
		);
	}

	render() {
		const theme = themeStyle(this.props.theme);
		const masterKeys = this.state.masterKeys;
		const decryptedItemsInfo = this.props.encryptionEnabled ? <Text style={this.styles().normalText}>{shared.decryptedStatText(this)}</Text> : null;

		const mkComps = [];

		let nonExistingMasterKeyIds = this.props.notLoadedMasterKeys.slice();

		for (let i = 0; i < masterKeys.length; i++) {
			const mk = masterKeys[i];
			mkComps.push(this.renderMasterKey(i + 1, mk));

			const idx = nonExistingMasterKeyIds.indexOf(mk.id);
			if (idx >= 0) nonExistingMasterKeyIds.splice(idx, 1);
		}

		const onToggleButtonClick = async () => {
			if (this.props.encryptionEnabled) {
				const ok = await dialogs.confirm(this, _('Disabling encryption means *all* your notes and attachments are going to be re-synchronised and sent unencrypted to the sync target. Do you wish to continue?'));
				if (!ok) return;

				try {
					await EncryptionService.instance().disableEncryption();
				} catch (error) {
					await dialogs.error(this, error.message);
				}
			} else {
				this.setState({
					passwordPromptShow: true,
					passwordPromptAnswer: '',
					passwordPromptConfirmAnswer: '',
				});
				return;
			}
		};

		let nonExistingMasterKeySection = null;

		if (nonExistingMasterKeyIds.length) {
			const rows = [];
			for (let i = 0; i < nonExistingMasterKeyIds.length; i++) {
				const id = nonExistingMasterKeyIds[i];
				rows.push(
					<Text style={this.styles().normalText} key={id}>
						{id}
					</Text>
				);
			}

			nonExistingMasterKeySection = (
				<View>
					<Text style={this.styles().titleText}>{_('Missing Master Keys')}</Text>
					<Text style={this.styles().normalText}>{_('The master keys with these IDs are used to encrypt some of your items, however the application does not currently have access to them. It is likely they will eventually be downloaded via synchronisation.')}</Text>
					<View style={{ marginTop: 10 }}>{rows}</View>
				</View>
			);
		}

		const passwordPromptComp = this.state.passwordPromptShow ? this.passwordPromptComponent() : null;
		const toggleButton = !this.state.passwordPromptShow ? (
			<View style={{ marginTop: 10 }}>
				<Button title={this.props.encryptionEnabled ? _('Disable encryption') : _('Enable encryption')} onPress={() => onToggleButtonClick()}></Button>
			</View>
		) : null;

		return (
			<View style={this.rootStyle(this.props.theme).root}>
				<ScreenHeader title={_('Encryption Config')} />
				<ScrollView style={this.styles().container}>
					{
						<View style={{ backgroundColor: theme.warningBackgroundColor, paddingTop: 5, paddingBottom: 5, paddingLeft: 10, paddingRight: 10 }}>
							<Text>{_('For more information about End-To-End Encryption (E2EE) and advice on how to enable it please check the documentation:')}</Text>
							<TouchableOpacity
								onPress={() => {
									Linking.openURL('https://joplinapp.org/e2ee/');
								}}
							>
								<Text>https://joplinapp.org/e2ee/</Text>
							</TouchableOpacity>
						</View>
					}

					<Text style={this.styles().titleText}>{_('Status')}</Text>
					<Text style={this.styles().normalText}>{_('Encryption is: %s', this.props.encryptionEnabled ? _('Enabled') : _('Disabled'))}</Text>
					{decryptedItemsInfo}
					{toggleButton}
					{passwordPromptComp}
					{mkComps}
					{nonExistingMasterKeySection}
					<View style={{ flex: 1, height: 20 }}></View>
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

const EncryptionConfigScreen = connect(state => {
	return {
		theme: state.settings.theme,
		masterKeys: state.masterKeys,
		passwords: state.settings['encryption.passwordCache'],
		encryptionEnabled: state.settings['encryption.enabled'],
		activeMasterKeyId: state.settings['encryption.activeMasterKeyId'],
		notLoadedMasterKeys: state.notLoadedMasterKeys,
	};
})(EncryptionConfigScreenComponent);

module.exports = { EncryptionConfigScreen };
