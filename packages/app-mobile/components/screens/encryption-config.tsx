const React = require('react');
const { TextInput, TouchableOpacity, Linking, View, StyleSheet, Text, Button, ScrollView } = require('react-native');
const { connect } = require('react-redux');
import ScreenHeader from '../ScreenHeader';
import { themeStyle } from '../global-style';
const DialogBox = require('react-native-dialogbox').default;
const { dialogs } = require('../../utils/dialogs.js');
import EncryptionService from '@joplin/lib/services/e2ee/EncryptionService';
import { _ } from '@joplin/lib/locale';
import time from '@joplin/lib/time';
import { decryptedStatText, enableEncryptionConfirmationMessages, onSavePasswordClick, useInputMasterPassword, useInputPasswords, usePasswordChecker, useStats } from '@joplin/lib/components/EncryptionConfigScreen/utils';
import { MasterKeyEntity } from '@joplin/lib/services/e2ee/types';
import { State } from '@joplin/lib/reducer';
import { SyncInfo } from '@joplin/lib/services/synchronizer/syncInfoUtils';
import { getDefaultMasterKey, setupAndDisableEncryption, toggleAndSetupEncryption } from '@joplin/lib/services/e2ee/utils';
import { useMemo, useRef, useState } from 'react';

interface Props {
	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	themeId: any;
	masterKeys: MasterKeyEntity[];
	passwords: Record<string, string>;
	notLoadedMasterKeys: string[];
	encryptionEnabled: boolean;
	shouldReencrypt: boolean;
	activeMasterKeyId: string;
	masterPassword: string;
}

const EncryptionConfigScreen = (props: Props) => {
	const [passwordPromptShow, setPasswordPromptShow] = useState(false);
	const [passwordPromptAnswer, setPasswordPromptAnswer] = useState('');
	const [passwordPromptConfirmAnswer, setPasswordPromptConfirmAnswer] = useState('');
	const stats = useStats();
	const { passwordChecks, masterPasswordKeys } = usePasswordChecker(props.masterKeys, props.activeMasterKeyId, props.masterPassword, props.passwords);
	const { inputPasswords, onInputPasswordChange } = useInputPasswords(props.passwords);
	const { inputMasterPassword, onMasterPasswordSave, onMasterPasswordChange } = useInputMasterPassword(props.masterKeys, props.activeMasterKeyId);
	const dialogBoxRef = useRef(null);

	const mkComps = [];

	const nonExistingMasterKeyIds = props.notLoadedMasterKeys.slice();

	const theme = useMemo(() => {
		return themeStyle(props.themeId);
	}, [props.themeId]);

	const rootStyle = useMemo(() => {
		return {
			flex: 1,
			backgroundColor: theme.backgroundColor,
		};
	}, [theme]);

	const styles = useMemo(() => {
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

		return StyleSheet.create(styles);
	}, [theme]);

	const decryptedItemsInfo = props.encryptionEnabled ? <Text style={styles.normalText}>{decryptedStatText(stats)}</Text> : null;

	const renderMasterKey = (_num: number, mk: MasterKeyEntity) => {
		const theme = themeStyle(props.themeId);

		const password = inputPasswords[mk.id] ? inputPasswords[mk.id] : '';
		const passwordOk = passwordChecks[mk.id] === true ? '✔' : '❌';

		// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
		const inputStyle: any = { flex: 1, marginRight: 10, color: theme.color };
		inputStyle.borderBottomWidth = 1;
		inputStyle.borderBottomColor = theme.dividerColor;

		const renderPasswordInput = (masterKeyId: string) => {
			if (masterPasswordKeys[masterKeyId] || !passwordChecks['master']) {
				return (
					<Text style={{ ...styles.normalText, color: theme.colorFaded, fontStyle: 'italic' }}>({_('Master password')})</Text>
				);
			} else {
				return (
					<View style={{ flex: 1, flexDirection: 'row', alignItems: 'center' }}>
						<TextInput selectionColor={theme.textSelectionColor} keyboardAppearance={theme.keyboardAppearance} secureTextEntry={true} value={password} onChangeText={(text: string) => onInputPasswordChange(mk, text)} style={inputStyle}></TextInput>
						<Text style={{ fontSize: theme.fontSize, marginRight: 10, color: theme.color }}>{passwordOk}</Text>
						<Button title={_('Save')} onPress={() => onSavePasswordClick(mk, inputPasswords)}></Button>
					</View>
				);
			}
		};

		return (
			<View key={mk.id}>
				<Text style={styles.titleText}>{_('Master Key %s', mk.id.substr(0, 6))}</Text>
				<Text style={styles.normalText}>{_('Created: %s', time.formatMsToLocal(mk.created_time))}</Text>
				<View style={{ flexDirection: 'row', alignItems: 'center' }}>
					<Text style={{ flex: 0, fontSize: theme.fontSize, marginRight: 10, color: theme.color }}>{_('Password:')}</Text>
					{renderPasswordInput(mk.id)}
				</View>
			</View>
		);
	};

	const renderPasswordPrompt = () => {
		const theme = themeStyle(props.themeId);
		const masterKey = getDefaultMasterKey();
		const hasMasterPassword = !!props.masterPassword;

		const onEnableClick = async () => {
			try {
				const password = passwordPromptAnswer;
				if (!password) throw new Error(_('Password cannot be empty'));
				const password2 = passwordPromptConfirmAnswer;
				if (!password2) throw new Error(_('Confirm password cannot be empty'));
				if (password !== password2) throw new Error(_('Passwords do not match!'));
				await toggleAndSetupEncryption(EncryptionService.instance(), true, masterKey, password);
				// await generateMasterKeyAndEnableEncryption(EncryptionService.instance(), password);
				setPasswordPromptShow(false);
			} catch (error) {
				alert(error.message);
			}
		};

		const messages = enableEncryptionConfirmationMessages(masterKey, hasMasterPassword);

		const messageComps = messages.map((msg: string) => {
			return <Text key={msg} style={{ fontSize: theme.fontSize, color: theme.color, marginBottom: 10 }}>{msg}</Text>;
		});

		return (
			<View style={{ flex: 1, borderColor: theme.dividerColor, borderWidth: 1, padding: 10, marginTop: 10, marginBottom: 10 }}>
				<View>{messageComps}</View>
				<Text style={styles.normalText}>{_('Password:')}</Text>
				<TextInput
					selectionColor={theme.textSelectionColor}
					keyboardAppearance={theme.keyboardAppearance}
					style={styles.normalTextInput}
					secureTextEntry={true}
					value={passwordPromptAnswer}
					onChangeText={(text: string) => {
						setPasswordPromptAnswer(text);
					}}
				></TextInput>

				<Text style={styles.normalText}>{_('Confirm password:')}</Text>
				<TextInput
					selectionColor={theme.textSelectionColor}
					keyboardAppearance={theme.keyboardAppearance}
					style={styles.normalTextInput}
					secureTextEntry={true}
					value={passwordPromptConfirmAnswer}
					onChangeText={(text: string) => {
						setPasswordPromptConfirmAnswer(text);
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
								setPasswordPromptShow(false);
							}}
						></Button>
					</View>
				</View>
			</View>
		);
	};

	const renderMasterPassword = () => {
		if (!props.encryptionEnabled && !props.masterKeys.length) return null;

		// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
		const inputStyle: any = { flex: 1, marginRight: 10, color: theme.color };
		inputStyle.borderBottomWidth = 1;
		inputStyle.borderBottomColor = theme.dividerColor;

		if (passwordChecks['master']) {
			return (
				<View style={{ display: 'flex', flexDirection: 'row', alignItems: 'center' }}>
					<Text style={{ ...styles.normalText, flex: 0, marginRight: 5 }}>{_('Master password:')}</Text>
					<Text style={{ ...styles.normalText, fontWeight: 'bold' }}>{_('Loaded')}</Text>
				</View>
			);
		} else {
			return (
				<View style={{ display: 'flex', flexDirection: 'column', marginTop: 10 }}>
					<Text style={styles.normalText}>{'The master password is not set or is invalid. Please type it below:'}</Text>
					<View style={{ display: 'flex', flexDirection: 'row', marginTop: 10 }}>
						<TextInput selectionColor={theme.textSelectionColor} keyboardAppearance={theme.keyboardAppearance} secureTextEntry={true} value={inputMasterPassword} onChangeText={(text: string) => onMasterPasswordChange(text)} style={inputStyle}></TextInput>
						<Button onPress={onMasterPasswordSave} title={_('Save')} />
					</View>
				</View>
			);
		}
	};



	for (let i = 0; i < props.masterKeys.length; i++) {
		const mk = props.masterKeys[i];
		mkComps.push(renderMasterKey(i + 1, mk));

		const idx = nonExistingMasterKeyIds.indexOf(mk.id);
		if (idx >= 0) nonExistingMasterKeyIds.splice(idx, 1);
	}

	const onToggleButtonClick = async () => {
		if (props.encryptionEnabled) {
			const ok = await dialogs.confirmRef(dialogBoxRef.current, _('Disabling encryption means *all* your notes and attachments are going to be re-synchronised and sent unencrypted to the sync target. Do you wish to continue?'));
			if (!ok) return;

			try {
				await setupAndDisableEncryption(EncryptionService.instance());
			} catch (error) {
				alert(error.message);
			}
		} else {
			setPasswordPromptShow(true);
			setPasswordPromptAnswer('');
			setPasswordPromptConfirmAnswer('');
			return;
		}
	};

	let nonExistingMasterKeySection = null;

	if (nonExistingMasterKeyIds.length) {
		const rows = [];
		for (let i = 0; i < nonExistingMasterKeyIds.length; i++) {
			const id = nonExistingMasterKeyIds[i];
			rows.push(
				<Text style={styles.normalText} key={id}>
					{id}
				</Text>,
			);
		}

		nonExistingMasterKeySection = (
			<View>
				<Text style={styles.titleText}>{_('Missing Master Keys')}</Text>
				<Text style={styles.normalText}>{_('The master keys with these IDs are used to encrypt some of your items, however the application does not currently have access to them. It is likely they will eventually be downloaded via synchronisation.')}</Text>
				<View style={{ marginTop: 10 }}>{rows}</View>
			</View>
		);
	}

	const passwordPromptComp = passwordPromptShow ? renderPasswordPrompt() : null;
	const toggleButton = !passwordPromptShow ? (
		<View style={{ marginTop: 10 }}>
			<Button title={props.encryptionEnabled ? _('Disable encryption') : _('Enable encryption')} onPress={() => onToggleButtonClick()}></Button>
		</View>
	) : null;

	return (
		<View style={rootStyle}>
			<ScreenHeader title={_('Encryption Config')} />
			<ScrollView style={styles.container}>
				{
					<View style={{ backgroundColor: theme.warningBackgroundColor, paddingTop: 5, paddingBottom: 5, paddingLeft: 10, paddingRight: 10 }}>
						<Text>{_('For more information about End-To-End Encryption (E2EE) and advice on how to enable it please check the documentation:')}</Text>
						<TouchableOpacity
							onPress={() => {
								Linking.openURL('https://joplinapp.org/help/apps/sync/e2ee');
							}}
						>
							<Text>https://joplinapp.org/help/apps/sync/e2ee</Text>
						</TouchableOpacity>
					</View>
				}

				<Text style={styles.titleText}>{_('Status')}</Text>
				<Text style={styles.normalText}>{_('Encryption is: %s', props.encryptionEnabled ? _('Enabled') : _('Disabled'))}</Text>
				{decryptedItemsInfo}
				{renderMasterPassword()}
				{toggleButton}
				{passwordPromptComp}
				{mkComps}
				{nonExistingMasterKeySection}
				<View style={{ flex: 1, height: 20 }}></View>
			</ScrollView>
			<DialogBox ref={dialogBoxRef}/>
		</View>
	);
};

export default connect((state: State) => {
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
})(EncryptionConfigScreen);
