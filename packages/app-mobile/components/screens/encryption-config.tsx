import * as React from 'react';
import { TextInput, TouchableOpacity, Linking, View, StyleSheet, Text, Button, ScrollView, TextStyle, Platform } from 'react-native';
import { connect, useDispatch, useSelector } from 'react-redux';
import ScreenHeader from '../ScreenHeader';
import { themeStyle } from '../global-style';
import EncryptionService from '@joplin/lib/services/e2ee/EncryptionService';
import { _ } from '@joplin/lib/locale';
import time from '@joplin/lib/time';
import { decryptedStatText, enableEncryptionConfirmationMessages, onSavePasswordClick, useInputMasterPassword, useInputPasswords, usePasswordChecker, useStats } from '@joplin/lib/components/EncryptionConfigScreen/utils';
import { MasterKeyEntity } from '@joplin/lib/services/e2ee/types';
import { State } from '@joplin/lib/reducer';
import { localSyncInfoSelector, masterKeyEnabled } from '@joplin/lib/services/synchronizer/syncInfoUtils';
import { disableEncryptionConfirmationMessage, getDefaultMasterKey, MasterPasswordStatus, setupAndDisableEncryption, toggleAndSetupEncryption } from '@joplin/lib/services/e2ee/utils';
import { useMemo, useState } from 'react';
import { Divider, List } from 'react-native-paper';
import shim from '@joplin/lib/shim';
import usePpkValidityChecker from '@joplin/lib/components/shared/config/e2ee/usePpkValidityChecker';
import usePublicKeyFingerprint from '@joplin/lib/components/shared/config/e2ee/usePublicKeyFingerprint';
import { PublicPrivateKeyPair } from '@joplin/lib/services/e2ee/ppk/ppk';
import isJoplinServerVariant from '@joplin/lib/models/utils/isJoplinServerVariant';
import { AppState } from '../../utils/types';

interface Props {
	themeId: number;
	masterKeys: MasterKeyEntity[];
	ppk: PublicPrivateKeyPair;
	passwords: Record<string, string>;
	notLoadedMasterKeys: string[];
	encryptionEnabled: boolean;
	activeMasterKeyId: string;
	masterPassword: string;
}

const EncryptionConfigScreen = (props: Props) => {
	const [passwordPromptShow, setPasswordPromptShow] = useState(false);
	const [passwordPromptAnswer, setPasswordPromptAnswer] = useState('');
	const [passwordPromptConfirmAnswer, setPasswordPromptConfirmAnswer] = useState('');
	const stats = useStats();
	const { passwordChecks, masterPasswordKeys, masterPasswordStatus } = usePasswordChecker(props.masterKeys, props.activeMasterKeyId, props.masterPassword, props.passwords);
	const { inputPasswords, onInputPasswordChange } = useInputPasswords(props.passwords);
	const { inputMasterPassword, onMasterPasswordSave, onMasterPasswordChange } = useInputMasterPassword(props.masterKeys, props.activeMasterKeyId);
	const [showDisabledKeys, setShowDisabledKeys] = useState(false);

	const mkComps = [];
	const disabledMkComps = [];

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
		return StyleSheet.create({
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
			disabledContainer: {
				paddingLeft: theme.margin,
				paddingRight: theme.margin,
			},
		});
	}, [theme]);

	const decryptedItemsInfo = props.encryptionEnabled ? <Text style={styles.normalText}>{decryptedStatText(stats)}</Text> : null;

	const renderMasterKey = (mk: MasterKeyEntity) => {
		const theme = themeStyle(props.themeId);

		const password = inputPasswords[mk.id] ? inputPasswords[mk.id] : '';
		const passwordOk = passwordChecks[mk.id] === true;
		const passwordOkIcon = passwordOk ? '✔' : '❌';

		const inputStyle: TextStyle = {
			flex: 1,
			marginRight: 10,
			color: theme.color,
			borderBottomWidth: 1,
			borderBottomColor: theme.dividerColor,
		};

		const renderPasswordInput = (masterKeyId: string) => {
			if (masterPasswordKeys[masterKeyId] || !passwordChecks['master']) {
				return (
					<Text style={{ ...styles.normalText, color: theme.colorFaded, fontStyle: 'italic' }}>({_('Master password')})</Text>
				);
			} else {
				return (
					<View style={{ flex: 1, flexDirection: 'row', alignItems: 'center' }}>
						<TextInput
							selectionColor={theme.textSelectionColor}
							keyboardAppearance={theme.keyboardAppearance}
							secureTextEntry={true}
							autoCapitalize='none'
							autoCorrect={false}
							textContentType='newPassword'
							importantForAutofill='yes'
							value={password}
							onChangeText={(text: string) => onInputPasswordChange(mk, text)}
							style={inputStyle}
						/>
						<Text
							style={{ fontSize: theme.fontSize, marginRight: 10, color: theme.color }}
							accessibilityRole='image'
							accessibilityLabel={passwordOk ? _('Valid') : _('Invalid password')}
						>{passwordOkIcon}</Text>
						<Button title={_('Save')} onPress={() => onSavePasswordClick(mk, inputPasswords)}></Button>
					</View>
				);
			}
		};

		return (
			<View key={mk.id}>
				<Text
					style={styles.titleText}
					accessibilityRole='header'
				>{_('Master Key %s', mk.id.substr(0, 6))}</Text>
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
				if (!props.masterKeys.length) {
					const password2 = passwordPromptConfirmAnswer;
					if (!password2) throw new Error(_('Confirm password cannot be empty'));
					if (password !== password2) throw new Error(_('Passwords do not match!'));
				} else if (!masterKey) {
					// If a different master password is entered in this scenario, it would be accepted, but would create a new key which won't be able to be decrypted
					throw new Error(_('Encryption was setup previously, but all keys have been disabled. To continue, please use the desktop app to enable a key.'));
				}
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

		const passwordLabelId = 'password-label';
		const confirmPasswordLabelId = 'confirm-password';
		return (
			<View style={{ flex: 1, flexBasis: 'auto', borderColor: theme.dividerColor, borderWidth: 1, padding: 10, marginTop: 10, marginBottom: 10 }}>
				<View>{messageComps}</View>
				<Text nativeID={passwordLabelId} style={styles.normalText}>{_('Password:')}</Text>
				<TextInput
					accessibilityLabelledBy={passwordLabelId}
					selectionColor={theme.textSelectionColor}
					keyboardAppearance={theme.keyboardAppearance}
					style={styles.normalTextInput}
					secureTextEntry={true}
					autoCapitalize='none'
					autoCorrect={false}
					textContentType='password'
					importantForAutofill='yes'
					value={passwordPromptAnswer}
					onChangeText={(text: string) => {
						setPasswordPromptAnswer(text);
					}}
				></TextInput>

				{!props.masterKeys.length && (
					<>
						<Text nativeID={confirmPasswordLabelId} style={styles.normalText}>{_('Confirm password:')}</Text>
						<TextInput
							accessibilityLabelledBy={confirmPasswordLabelId}
							selectionColor={theme.textSelectionColor}
							keyboardAppearance={theme.keyboardAppearance}
							style={styles.normalTextInput}
							secureTextEntry={true}
							autoCapitalize='none'
							autoCorrect={false}
							textContentType='newPassword'
							importantForAutofill='yes'
							value={passwordPromptConfirmAnswer}
							onChangeText={(text: string) => {
								setPasswordPromptConfirmAnswer(text);
							}}
						></TextInput>
					</>
				)}
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

		const inputStyle: TextStyle = {
			flex: 1,
			marginRight: 10,
			color: theme.color,
			borderBottomWidth: 1,
			borderBottomColor: theme.dividerColor,
		};

		if (passwordChecks['master']) {
			return (
				<View style={{ display: 'flex', flexDirection: 'row', alignItems: 'center' }}>
					<Text style={{ ...styles.normalText, flex: 0, marginRight: 5 }}>{_('Master password:')}</Text>
					<Text style={{ ...styles.normalText, fontWeight: 'bold' }}>{_('Loaded')}</Text>
				</View>
			);
		} else {
			const labelId = 'master-password-label';
			return (
				<View style={{ display: 'flex', flexDirection: 'column', marginTop: 10 }}>
					<Text
						style={styles.normalText}
						nativeID={labelId}
					>{'The master password is not set or is invalid. Please type it below:'}</Text>
					<View style={{ display: 'flex', flexDirection: 'row', marginTop: 10 }}>
						<TextInput
							accessibilityLabelledBy={labelId}
							selectionColor={theme.textSelectionColor}
							keyboardAppearance={theme.keyboardAppearance}
							secureTextEntry={true}
							autoCapitalize='none'
							autoCorrect={false}
							textContentType='password'
							importantForAutofill='yes'
							value={inputMasterPassword}
							onChangeText={(text: string) => onMasterPasswordChange(text)}
							style={inputStyle}
						/>
						<Button onPress={onMasterPasswordSave} title={_('Save')} />
					</View>
				</View>
			);
		}
	};

	const renderPpkSection = () => {
		if (!props.masterPassword) return null;

		return <PpkValidityChecker
			password={props.masterPassword}
			passwordStatus={masterPasswordStatus}
			headerStyle={styles.titleText}
			textStyle={styles.normalText}
			ppk={props.ppk}
		/>;
	};

	for (const enabledKey of props.masterKeys.filter(mk => masterKeyEnabled(mk))) {
		mkComps.push(renderMasterKey(enabledKey));

		const idx = nonExistingMasterKeyIds.indexOf(enabledKey.id);
		if (idx >= 0) nonExistingMasterKeyIds.splice(idx, 1);
	}

	for (const disabledKey of props.masterKeys.filter(mk => !masterKeyEnabled(mk))) {
		disabledMkComps.push(renderMasterKey(disabledKey));
	}

	const onToggleButtonClick = async () => {
		if (props.encryptionEnabled) {
			const ok = await shim.showConfirmationDialog(disableEncryptionConfirmationMessage());
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

	const disabledMasterKeyList = disabledMkComps.length ? <List.Accordion
		title={_('Disabled keys')}
		titleStyle={styles.titleText}
		expanded={showDisabledKeys}
		onPress={() => setShowDisabledKeys(st => !st)}
	>
		<View style={styles.disabledContainer}>
			{disabledMkComps}
		</View>
	</List.Accordion> : null;

	return (
		<View style={rootStyle}>
			<ScreenHeader title={_('Encryption Config')} />
			<ScrollView>
				<View style={styles.container}>
					<View style={{ backgroundColor: theme.warningBackgroundColor, paddingTop: 5, paddingBottom: 5, paddingLeft: 10, paddingRight: 10 }}>
						<Text>{_('For more information about End-To-End Encryption (E2EE) and advice on how to enable it please check the documentation:')}</Text>
						<TouchableOpacity
							onPress={() => {
								void Linking.openURL('https://joplinapp.org/help/apps/sync/e2ee');
							}}
							accessibilityRole='link'
						>
							<Text>https://joplinapp.org/help/apps/sync/e2ee</Text>
						</TouchableOpacity>
					</View>

					<Text
						style={styles.titleText}
						accessibilityRole='header'
					>{_('Status')}</Text>
					<Text style={styles.normalText}>{_('Encryption is: %s', props.encryptionEnabled ? _('Enabled') : _('Disabled'))}</Text>
					{decryptedItemsInfo}
					{renderMasterPassword()}
					{toggleButton}
					{passwordPromptComp}
					{renderPpkSection()}
					{mkComps}
					{nonExistingMasterKeySection}
				</View>
				<Divider />
				{disabledMasterKeyList}
			</ScrollView>
		</View>
	);
};

export default connect((state: State) => {
	const syncInfo = localSyncInfoSelector(state);

	return {
		themeId: state.settings.theme,
		masterKeys: syncInfo.masterKeys,
		passwords: state.settings['encryption.passwordCache'],
		encryptionEnabled: syncInfo.e2ee,
		activeMasterKeyId: syncInfo.activeMasterKeyId,
		notLoadedMasterKeys: state.notLoadedMasterKeys,
		ppk: syncInfo.ppk,
		masterPassword: state.settings['encryption.masterPassword'],
	};
})(EncryptionConfigScreen);

interface PpkValidityCheckerExtendedProps {
	password: string;
	passwordStatus: MasterPasswordStatus;
	ppk: PublicPrivateKeyPair|undefined;

	headerStyle: TextStyle;
	textStyle: TextStyle;
}

const PpkValidityChecker: React.FC<PpkValidityCheckerExtendedProps> = props => {
	const themeId = useSelector((state: AppState) => state.settings.theme);
	const styles = useMemo(() => {
		const theme = themeStyle(themeId);
		return StyleSheet.create({
			fingerprint: {
				fontFamily: Platform.select({ ios: 'ui-monospace', default: 'monospace' }),
			},
			container: {
				marginTop: theme.itemMarginTop,
				marginBottom: theme.itemMarginBottom,
				flexDirection: 'column',
			},
			buttonContainer: { flexDirection: 'row', gap: 4 },
			helpText: {
				marginBottom: theme.itemMarginBottom,
			},
		});
	}, [themeId]);

	const dispatch = useDispatch();
	const invalidRemotePpk = useSelector((state: AppState) => state.mustFixPpk);
	const { valid, message, onResetPpk, onShowInvalidPpkHelp, resetting } = usePpkValidityChecker({
		...props,
		dispatch,
		invalidPpk: invalidRemotePpk,
	});
	const fingerprint = usePublicKeyFingerprint(props.ppk);
	const supportsSharing = useSelector((state: AppState) => isJoplinServerVariant(state.settings['sync.target']));

	const messageComponent = message && (
		<View>
			<Text style={props.textStyle}>{message}</Text>
			<View style={styles.buttonContainer}>
				<Button onPress={onShowInvalidPpkHelp} title={_('Help')}/>
				<Button onPress={onResetPpk} title={_('Regenerate key pair')} disabled={resetting}/>
			</View>
		</View>
	);
	const publicKeyFingerprintComponent = valid && !!supportsSharing && !!fingerprint && (
		<View>
			<Text style={props.textStyle}>
				{_('Public key fingerprint:')}{' '}
				<Text style={styles.fingerprint} selectable>{fingerprint}</Text>
			</Text>
		</View>
	);

	return (messageComponent || publicKeyFingerprintComponent) ? <View style={styles.container}>
		<Text
			style={props.headerStyle}
			accessibilityRole='header'
		>{_('Public-private key pair')}</Text>
		<Text style={[styles.helpText, props.textStyle]}>
			{_('Public-private key pairs are used when sending and receiving share invitations.')}
		</Text>
		{messageComponent}
		{publicKeyFingerprintComponent}
	</View> : null;
};

