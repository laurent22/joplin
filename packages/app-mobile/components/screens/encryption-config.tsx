const React = require('react');
const { TextInput, TouchableOpacity, Linking, View, StyleSheet, Text, Button, ScrollView } = require('react-native');
const { connect } = require('react-redux');
const { ScreenHeader } = require('../screen-header.js');
const { BaseScreenComponent } = require('../base-screen.js');
const { themeStyle } = require('../global-style.js');
const DialogBox = require('react-native-dialogbox').default;
const { dialogs } = require('../../utils/dialogs.js');
import EncryptionService from '@joplin/lib/services/e2ee/EncryptionService';
import { _ } from '@joplin/lib/locale';
import time from '@joplin/lib/time';
import shared from '@joplin/lib/components/shared/encryption-config-shared';
import { MasterKeyEntity } from '@joplin/lib/services/e2ee/types';
import { State } from '@joplin/lib/reducer';
import { SyncInfo } from '@joplin/lib/services/synchronizer/syncInfoUtils';
import { getDefaultMasterKey, setupAndDisableEncryption, toggleAndSetupEncryption } from '@joplin/lib/services/e2ee/utils';

interface Props {}

class EncryptionConfigScreenComponent extends BaseScreenComponent<Props> {
	static navigationOptions(): any {
		return { header: null };
	}

	constructor(props: Props) {
		super(props);

		this.state = {
			passwordPromptShow: false,
			passwordPromptAnswer: '',
			passwordPromptConfirmAnswer: '',
		};

		shared.initialize(this, props);

		this.styles_ = {};
	}

	componentWillUnmount() {
		this.isMounted_ = false;
	}

	async refreshStats() {
		return shared.refreshStats(this);
	}

	componentDidMount() {
		this.isMounted_ = true;
		shared.componentDidMount(this);
	}

	componentDidUpdate(prevProps: Props) {
		shared.componentDidUpdate(this, prevProps);
	}

	async checkPasswords() {
		return shared.checkPasswords(this);
	}

	styles() {
		const themeId = this.props.themeId;
		const theme = themeStyle(themeId);

		if (this.styles_[themeId]) return this.styles_[themeId];
		this.styles_ = {};

		const styles = {
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

	renderMasterKey(_num: number, mk: MasterKeyEntity) {
		const theme = themeStyle(this.props.themeId);

		const onSaveClick = () => {
			return shared.onSavePasswordClick(this, mk);
		};

		const onPasswordChange = (text: string) => {
			return shared.onPasswordChange(this, mk, text);
		};

		const password = this.state.passwords[mk.id] ? this.state.passwords[mk.id] : '';
		const passwordOk = this.state.passwordChecks[mk.id] === true ? '✔' : '❌';

		const inputStyle: any = { flex: 1, marginRight: 10, color: theme.color };
		inputStyle.borderBottomWidth = 1;
		inputStyle.borderBottomColor = theme.dividerColor;

		const renderPasswordInput = (masterKeyId: string) => {
			if (this.state.masterPasswordKeys[masterKeyId] || !this.state.passwordChecks['master']) {
				return (
					<Text style={{ ...this.styles().normalText, color: theme.colorFaded, fontStyle: 'italic' }}>({_('Master password')})</Text>
				);
			} else {
				return (
					<View style={{ flex: 1, flexDirection: 'row', alignItems: 'center' }}>
						<TextInput selectionColor={theme.textSelectionColor} keyboardAppearance={theme.keyboardAppearance} secureTextEntry={true} value={password} onChangeText={(text: string) => onPasswordChange(text)} style={inputStyle}></TextInput>
						<Text style={{ fontSize: theme.fontSize, marginRight: 10, color: theme.color }}>{passwordOk}</Text>
						<Button title={_('Save')} onPress={() => onSaveClick()}></Button>
					</View>
				);
			}
		};

		return (
			<View key={mk.id}>
				<Text style={this.styles().titleText}>{_('Master Key %s', mk.id.substr(0, 6))}</Text>
				<Text style={this.styles().normalText}>{_('Created: %s', time.formatMsToLocal(mk.created_time))}</Text>
				<View style={{ flexDirection: 'row', alignItems: 'center' }}>
					<Text style={{ flex: 0, fontSize: theme.fontSize, marginRight: 10, color: theme.color }}>{_('Password:')}</Text>
					{renderPasswordInput(mk.id)}
				</View>
			</View>
		);
	}

	passwordPromptComponent() {
		const theme = themeStyle(this.props.themeId);
		const masterKey = getDefaultMasterKey();

		const onEnableClick = async () => {
			try {
				const password = this.state.passwordPromptAnswer;
				if (!password) throw new Error(_('Password cannot be empty'));
				const password2 = this.state.passwordPromptConfirmAnswer;
				if (!password2) throw new Error(_('Confirm password cannot be empty'));
				if (password !== password2) throw new Error(_('Passwords do not match!'));
				await toggleAndSetupEncryption(EncryptionService.instance(), true, masterKey, password);
				// await generateMasterKeyAndEnableEncryption(EncryptionService.instance(), password);
				this.setState({ passwordPromptShow: false });
			} catch (error) {
				await dialogs.error(this, error.message);
			}
		};

		const messages = shared.enableEncryptionConfirmationMessages(masterKey);

		const messageComps = messages.map(msg => {
			return <Text key={msg} style={{ fontSize: theme.fontSize, color: theme.color, marginBottom: 10 }}>{msg}</Text>;
		});

		return (
			<View style={{ flex: 1, borderColor: theme.dividerColor, borderWidth: 1, padding: 10, marginTop: 10, marginBottom: 10 }}>
				<View>{messageComps}</View>
				<Text style={this.styles().normalText}>{_('Password:')}</Text>
				<TextInput
					selectionColor={theme.textSelectionColor}
					keyboardAppearance={theme.keyboardAppearance}
					style={this.styles().normalTextInput}
					secureTextEntry={true}
					value={this.state.passwordPromptAnswer}
					onChangeText={(text: string) => {
						this.setState({ passwordPromptAnswer: text });
					}}
				></TextInput>

				<Text style={this.styles().normalText}>{_('Confirm password:')}</Text>
				<TextInput
					selectionColor={theme.textSelectionColor}
					keyboardAppearance={theme.keyboardAppearance}
					style={this.styles().normalTextInput}
					secureTextEntry={true}
					value={this.state.passwordPromptConfirmAnswer}
					onChangeText={(text: string) => {
						this.setState({ passwordPromptConfirmAnswer: text });
					}}
				></TextInput>
				<View style={{ flexDirection: 'row' }}>
					<View style={{ flex: 1, marginRight: 10 }}>
						<Button
							title={_('Enable')}
							onPress={() => {
								void onEnableClick();
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

	private renderMasterPassword() {
		if (!this.props.encryptionEnabled && !this.props.masterKeys.length) return null;

		const theme = themeStyle(this.props.themeId);

		const onMasterPasswordSave = async () => {
			shared.onMasterPasswordSave(this);

			if (!(await shared.masterPasswordIsValid(this, this.state.masterPasswordInput))) {
				alert('Password is invalid. Please try again.');
			}
		};

		const inputStyle: any = { flex: 1, marginRight: 10, color: theme.color };
		inputStyle.borderBottomWidth = 1;
		inputStyle.borderBottomColor = theme.dividerColor;

		if (this.state.passwordChecks['master']) {
			return (
				<View style={{ display: 'flex', flexDirection: 'row', alignItems: 'center' }}>
					<Text style={{ ...this.styles().normalText, flex: 0, marginRight: 5 }}>{_('Master password:')}</Text>
					<Text style={{ ...this.styles().normalText, fontWeight: 'bold' }}>{_('Loaded')}</Text>
				</View>
			);
		} else {
			return (
				<View style={{ display: 'flex', flexDirection: 'column', marginTop: 10 }}>
					<Text style={this.styles().normalText}>{'The master password is not set or is invalid. Please type it below:'}</Text>
					<View style={{ display: 'flex', flexDirection: 'row', marginTop: 10 }}>
						<TextInput selectionColor={theme.textSelectionColor} keyboardAppearance={theme.keyboardAppearance} secureTextEntry={true} value={this.state.masterPasswordInput} onChangeText={(text: string) => shared.onMasterPasswordChange(this, text)} style={inputStyle}></TextInput>
						<Button onPress={onMasterPasswordSave} title={_('Save')} />
					</View>
				</View>
			);
		}
	}

	render() {
		const theme = themeStyle(this.props.themeId);
		const masterKeys = this.props.masterKeys;
		const decryptedItemsInfo = this.props.encryptionEnabled ? <Text style={this.styles().normalText}>{shared.decryptedStatText(this)}</Text> : null;

		const mkComps = [];

		const nonExistingMasterKeyIds = this.props.notLoadedMasterKeys.slice();

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
					await setupAndDisableEncryption(EncryptionService.instance());
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
			<View style={this.rootStyle(this.props.themeId).root}>
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
					{this.renderMasterPassword()}
					{toggleButton}
					{passwordPromptComp}
					{mkComps}
					{nonExistingMasterKeySection}
					<View style={{ flex: 1, height: 20 }}></View>
				</ScrollView>
				<DialogBox
					ref={(dialogbox: any) => {
						this.dialogbox = dialogbox;
					}}
				/>
			</View>
		);
	}
}

const EncryptionConfigScreen = connect((state: State) => {
	const syncInfo = new SyncInfo(state.settings['syncInfoCache']);

	return {
		themeId: state.settings.theme,
		masterKeys: syncInfo.masterKeys,
		passwords: state.settings['encryption.passwordCache'],
		encryptionEnabled: syncInfo.e2ee,
		activeMasterKeyId: syncInfo.activeMasterKeyId,
		notLoadedMasterKeys: state.notLoadedMasterKeys,
		masterPassword: state.settings['encryption.masterPassword'],
	};
})(EncryptionConfigScreenComponent);

export default EncryptionConfigScreen;
