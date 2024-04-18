const React = require('react');
import EncryptionService from '@joplin/lib/services/e2ee/EncryptionService';
import { themeStyle } from '@joplin/lib/theme';
import { _ } from '@joplin/lib/locale';
import time from '@joplin/lib/time';
import shim from '@joplin/lib/shim';
import dialogs from '../dialogs';
import { decryptedStatText, determineKeyPassword, dontReencryptData, enableEncryptionConfirmationMessages, onSavePasswordClick, onToggleEnabledClick, reencryptData, upgradeMasterKey, useInputPasswords, useNeedMasterPassword, usePasswordChecker, useStats, useToggleShowDisabledMasterKeys } from '@joplin/lib/components/EncryptionConfigScreen/utils';
import { MasterKeyEntity } from '@joplin/lib/services/e2ee/types';
import { getEncryptionEnabled, masterKeyEnabled, SyncInfo } from '@joplin/lib/services/synchronizer/syncInfoUtils';
import { getDefaultMasterKey, getMasterPasswordStatusMessage, masterPasswordIsValid, toggleAndSetupEncryption } from '@joplin/lib/services/e2ee/utils';
import Button, { ButtonLevel } from '../Button/Button';
import { useCallback, useMemo, useState } from 'react';
import { connect } from 'react-redux';
import { AppState } from '../../app.reducer';
import Setting from '@joplin/lib/models/Setting';
import CommandService from '@joplin/lib/services/CommandService';
import { PublicPrivateKeyPair } from '@joplin/lib/services/e2ee/ppk';
import ToggleAdvancedSettingsButton from '../ConfigScreen/controls/ToggleAdvancedSettingsButton';
import MacOSMissingPasswordHelpLink from '../ConfigScreen/controls/MissingPasswordHelpLink';

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
	ppk: PublicPrivateKeyPair;
}

const EncryptionConfigScreen = (props: Props) => {
	const { inputPasswords, onInputPasswordChange } = useInputPasswords(props.passwords);

	const theme = useMemo(() => {
		return themeStyle(props.themeId);
	}, [props.themeId]);

	const stats = useStats();
	const { passwordChecks, masterPasswordKeys, masterPasswordStatus } = usePasswordChecker(props.masterKeys, props.activeMasterKeyId, props.masterPassword, props.passwords);
	const { showDisabledMasterKeys, toggleShowDisabledMasterKeys } = useToggleShowDisabledMasterKeys();
	const needMasterPassword = useNeedMasterPassword(passwordChecks, props.masterKeys);

	const onUpgradeMasterKey = useCallback(async (mk: MasterKeyEntity) => {
		const password = determineKeyPassword(mk.id, masterPasswordKeys, props.masterPassword, props.passwords);
		const result = await upgradeMasterKey(mk, password);
		alert(result);
	}, [props.passwords, masterPasswordKeys, props.masterPassword]);

	const renderNeedUpgradeSection = () => {
		if (!shim.isElectron()) return null;

		const needUpgradeMasterKeys = EncryptionService.instance().masterKeysThatNeedUpgrading(props.masterKeys);
		if (!needUpgradeMasterKeys.length) return null;

		const theme = themeStyle(props.themeId);

		const rows = [];

		for (const mk of needUpgradeMasterKeys) {
			rows.push(
				<tr key={mk.id}>
					<td style={theme.textStyle}>{mk.id}</td>
					<td><button onClick={() => onUpgradeMasterKey(mk)} style={theme.buttonStyle}>Upgrade</button></td>
				</tr>,
			);
		}

		return (
			<div>
				<h2>{_('Keys that need upgrading')}</h2>
				<p>{_('The following keys use an out-dated encryption algorithm and it is recommended to upgrade them. The upgraded key will still be able to decrypt and encrypt your data as usual.')}</p>
				<table>
					<tbody>
						<tr>
							<th style={theme.textStyle}>{_('ID')}</th>
							<th style={theme.textStyle}>{_('Upgrade')}</th>
						</tr>
						{rows}
					</tbody>
				</table>
			</div>
		);
	};

	const renderMasterKey = (mk: MasterKeyEntity) => {
		const theme = themeStyle(props.themeId);

		const passwordStyle = {
			color: theme.color,
			backgroundColor: theme.backgroundColor,
			border: '1px solid',
			borderColor: theme.dividerColor,
		};

		const missingPasswordCellStyle = {
			...theme.textStyle,
			border: '3px solid',
			borderColor: theme.colorError,
		};

		const password = inputPasswords[mk.id] ? inputPasswords[mk.id] : '';
		const isActive = props.activeMasterKeyId === mk.id;
		const activeIcon = isActive ? '✔' : '';
		const passwordOk = passwordChecks[mk.id] === true ? '✔' : '❌';

		const renderPasswordInput = (masterKeyId: string) => {
			if (masterPasswordKeys[masterKeyId] || !passwordChecks['master']) {
				return (
					<td style={{ ...theme.textStyle, color: theme.colorFaded, fontStyle: 'italic' }}>
						({_('Master password')})
					</td>
				);
			} else {
				return (
					<td style={missingPasswordCellStyle}>
						<input
							type="password"
							placeholder={_('Enter password')}
							style={passwordStyle}
							value={password}
							onChange={event => onInputPasswordChange(mk, event.target.value)}
						/>
						{' '}
						<button style={theme.buttonStyle} onClick={() => onSavePasswordClick(mk, { ...props.passwords, ...inputPasswords })}>
							{_('Save')}
						</button>
					</td>
				);
			}
		};

		return (
			<tr key={mk.id}>
				<td style={theme.textStyle}>{activeIcon}</td>
				<td style={theme.textStyle}>{mk.id}<br/>{_('Source: ')}{mk.source_application}</td>
				<td style={theme.textStyle}>{_('Created: ')}{time.formatMsToLocal(mk.created_time)}<br/>{_('Updated: ')}{time.formatMsToLocal(mk.updated_time)}</td>
				{renderPasswordInput(mk.id)}
				<td style={theme.textStyle}>{passwordOk}</td>
				<td style={theme.textStyle}>
					<button style={theme.buttonStyle} onClick={() => onToggleEnabledClick(mk)}>{masterKeyEnabled(mk) ? _('Disable') : _('Enable')}</button>
				</td>
			</tr>
		);
	};

	const renderMasterKeySection = (masterKeys: MasterKeyEntity[], isEnabledMasterKeys: boolean) => {
		const theme = themeStyle(props.themeId);
		const mkComps = [];
		const showTable = isEnabledMasterKeys || showDisabledMasterKeys;

		for (let i = 0; i < masterKeys.length; i++) {
			const mk = masterKeys[i];
			mkComps.push(renderMasterKey(mk));
		}

		const headerComp = isEnabledMasterKeys ? <h2>{_('Encryption keys')}</h2> : <a onClick={() => toggleShowDisabledMasterKeys() } style={{ ...theme.urlStyle, display: 'inline-block', marginBottom: 10 }} href="#">{showTable ? _('Hide disabled keys') : _('Show disabled keys')}</a>;
		// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
		const infoComp: any = null; // isEnabledMasterKeys ? <p>{'Note: Only one key is going to be used for encryption (the one marked as "active"). Any of the keys might be used for decryption, depending on how the notes or notebooks were originally encrypted.'}</p> : null;
		const tableComp = !showTable ? null : (
			<table>
				<tbody>
					<tr>
						<th style={theme.textStyle}>{_('Active')}</th>
						<th style={theme.textStyle}>{_('ID')}</th>
						<th style={theme.textStyle}>{_('Date')}</th>
						<th style={theme.textStyle}>{_('Password')}</th>
						<th style={theme.textStyle}>{_('Valid')}</th>
						<th style={theme.textStyle}>{_('Actions')}</th>
					</tr>
					{mkComps}
				</tbody>
			</table>
		);

		if (mkComps.length) {
			return (
				<div className="section">
					{headerComp}
					{tableComp}
					{infoComp}
				</div>
			);
		}

		return null;
	};

	const onToggleButtonClick = useCallback(async () => {
		const isEnabled = getEncryptionEnabled();
		const newEnabled = !isEnabled;
		const masterKey = getDefaultMasterKey();
		const hasMasterPassword = !!props.masterPassword;
		let newPassword = '';

		if (isEnabled) {
			const answer = await dialogs.confirm(_('Disabling encryption means *all* your notes and attachments are going to be re-synchronised and sent unencrypted to the sync target. Do you wish to continue?'));
			if (!answer) return;
		} else {
			const msg = enableEncryptionConfirmationMessages(masterKey, hasMasterPassword);
			newPassword = await dialogs.prompt(msg.join('\n\n'), '', '', { type: 'password' });
		}

		if (hasMasterPassword && newEnabled) {
			if (!(await masterPasswordIsValid(newPassword))) {
				alert('Invalid password. Please try again. If you have forgotten your password you will need to reset it.');
				return;
			}
		}

		try {
			await toggleAndSetupEncryption(EncryptionService.instance(), newEnabled, masterKey, newPassword);
		} catch (error) {
			await dialogs.alert(error.message);
		}
	}, [props.masterPassword]);

	const renderEncryptionSection = () => {
		const decryptedItemsInfo = <p>{decryptedStatText(stats)}</p>;
		const toggleButton = (
			<Button
				onClick={onToggleButtonClick}
				title={props.encryptionEnabled ? _('Disable encryption') : _('Enable encryption')}
				level={ButtonLevel.Secondary}
			/>
		);
		const needUpgradeSection = renderNeedUpgradeSection();

		return (
			<div className="section">
				<div className="encryption-section">
					<h2 className="-no-top-margin">{_('End-to-end encryption')}</h2>
					<p>
						{_('Encryption:')} <strong>{props.encryptionEnabled ? _('Enabled') : _('Disabled')}</strong>
					</p>
					<p>
						{_('Public-private key pair:')} <strong>{props.ppk ? _('Generated') : _('Not generated')}</strong>
					</p>
					{decryptedItemsInfo}
					{toggleButton}
					{needUpgradeSection}
				</div>
			</div>
		);
	};

	const renderMasterPasswordSection = () => {
		const onManageMasterPassword = async () => {
			void CommandService.instance().execute('openMasterPasswordDialog');
		};

		const buttonTitle = CommandService.instance().label('openMasterPasswordDialog');

		const needPasswordMessage = !needMasterPassword ? null : (
			<p className="needpassword">
				{_('Your password is needed to decrypt some of your data.')}
				<br/>
				{_('Please click on "%s" to proceed, or set the passwords in the "%s" list below.', buttonTitle, _('Encryption keys'))}
				<br/>
				<MacOSMissingPasswordHelpLink
					theme={theme}
					text={_('%s: Missing password.', _('Help'))}
				/>
			</p>
		);

		return (
			<div className="section">
				<div className="manage-password-section">
					<h2>{_('Master password')}</h2>
					<p className="status"><span>{_('Master password:')}</span>&nbsp;<span className="bold">{getMasterPasswordStatusMessage(masterPasswordStatus)}</span></p>
					{needPasswordMessage}
					<Button className="managebutton" level={needMasterPassword ? ButtonLevel.Primary : ButtonLevel.Secondary} onClick={onManageMasterPassword} title={buttonTitle} />
				</div>
			</div>
		);
	};

	const onClearMasterPassword = useCallback(() => {
		Setting.setValue('encryption.masterPassword', '');
	}, []);

	const renderDebugSection = () => {
		if (Setting.value('env') !== 'dev') return null;

		return (
			<div style={{ paddingBottom: '20px' }}>
				<Button level={ButtonLevel.Secondary} onClick={onClearMasterPassword} title="Clear master password" />
			</div>
		);
	};

	const renderNonExistingMasterKeysSection = () => {
		let nonExistingMasterKeySection = null;

		const nonExistingMasterKeyIds = props.notLoadedMasterKeys.slice();

		for (let i = 0; i < props.masterKeys.length; i++) {
			const mk = props.masterKeys[i];
			const idx = nonExistingMasterKeyIds.indexOf(mk.id);
			if (idx >= 0) nonExistingMasterKeyIds.splice(idx, 1);
		}

		if (nonExistingMasterKeyIds.length) {
			const rows = [];
			for (let i = 0; i < nonExistingMasterKeyIds.length; i++) {
				const id = nonExistingMasterKeyIds[i];
				rows.push(
					<tr key={id}>
						<td style={theme.textStyle}>{id}</td>
					</tr>,
				);
			}

			nonExistingMasterKeySection = (
				<div className="section">
					<h2>{_('Missing keys')}</h2>
					<p>{_('The keys with these IDs are used to encrypt some of your items, however the application does not currently have access to them. It is likely they will eventually be downloaded via synchronisation.')}</p>
					<table>
						<tbody>
							<tr>
								<th style={theme.textStyle}>{_('ID')}</th>
							</tr>
							{rows}
						</tbody>
					</table>
				</div>
			);
		}

		return nonExistingMasterKeySection;
	};

	const renderReencryptData = () => {
		if (!shim.isElectron()) return null;
		if (!props.encryptionEnabled) return null;

		const theme = themeStyle(props.themeId);
		const buttonLabel = _('Re-encrypt data');

		const intro = props.shouldReencrypt ? _('The default encryption method has been changed to a more secure one and it is recommended that you apply it to your data.') : _('You may use the tool below to re-encrypt your data, for example if you know that some of your notes are encrypted with an obsolete encryption method.');

		let t = `${intro}\n\n${_('In order to do so, your entire data set will have to be encrypted and synchronised, so it is best to run it overnight.\n\nTo start, please follow these instructions:\n\n1. Synchronise all your devices.\n2. Click "%s".\n3. Let it run to completion. While it runs, avoid changing any note on your other devices, to avoid conflicts.\n4. Once sync is done on this device, sync all your other devices and let it run to completion.\n\nImportant: you only need to run this ONCE on one device.', buttonLabel)}`;

		t = t.replace(/\n\n/g, '</p><p>');
		t = t.replace(/\n/g, '<br>');
		t = `<p>${t}</p>`;

		return (
			<div>
				<h2>{_('Re-encryption')}</h2>
				<p style={theme.textStyle} dangerouslySetInnerHTML={{ __html: t }}></p>
				<span style={{ marginRight: 10 }}>
					<button onClick={() => void reencryptData()} style={theme.buttonStyle}>{buttonLabel}</button>
				</span>

				{ !props.shouldReencrypt ? null : <button onClick={() => dontReencryptData()} style={theme.buttonStyle}>{_('Ignore')}</button> }
			</div>
		);
	};

	// If the user should re-encrypt, ensure that the section is visible initially.
	const [showAdvanced, setShowAdvanced] = useState<boolean>(props.shouldReencrypt);
	const toggleAdvanced = useCallback(() => {
		setShowAdvanced(!showAdvanced);
	}, [showAdvanced]);

	const renderAdvancedSection = () => {
		const reEncryptSection = renderReencryptData();

		if (!reEncryptSection) return null;


		return (
			<div>
				<ToggleAdvancedSettingsButton
					onClick={toggleAdvanced}
					advancedSettingsVisible={showAdvanced}/>
				{ showAdvanced ? reEncryptSection : null }
			</div>
		);
	};

	return (
		<div className="config-screen-content">
			{renderDebugSection()}
			{renderEncryptionSection()}
			{renderMasterPasswordSection()}
			{renderMasterKeySection(props.masterKeys.filter(mk => masterKeyEnabled(mk)), true)}
			{renderMasterKeySection(props.masterKeys.filter(mk => !masterKeyEnabled(mk)), false)}
			{renderNonExistingMasterKeysSection()}
			{renderAdvancedSection()}
		</div>
	);
};

const mapStateToProps = (state: AppState) => {
	const syncInfo = new SyncInfo(state.settings['syncInfoCache']);

	return {
		themeId: state.settings.theme,
		masterKeys: syncInfo.masterKeys,
		passwords: state.settings['encryption.passwordCache'],
		encryptionEnabled: syncInfo.e2ee,
		activeMasterKeyId: syncInfo.activeMasterKeyId,
		shouldReencrypt: state.settings['encryption.shouldReencrypt'] >= Setting.SHOULD_REENCRYPT_YES,
		notLoadedMasterKeys: state.notLoadedMasterKeys,
		masterPassword: state.settings['encryption.masterPassword'],
		ppk: syncInfo.ppk,
	};
};

export default connect(mapStateToProps)(EncryptionConfigScreen);
