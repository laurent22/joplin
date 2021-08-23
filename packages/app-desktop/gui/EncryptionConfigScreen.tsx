const React = require('react');
const { connect } = require('react-redux');
import Setting from '@joplin/lib/models/Setting';
import EncryptionService from '@joplin/lib/services/e2ee/EncryptionService';
import { themeStyle } from '@joplin/lib/theme';
import { _ } from '@joplin/lib/locale';
import time from '@joplin/lib/time';
import { State } from '@joplin/lib/reducer';
import shim from '@joplin/lib/shim';
import dialogs from './dialogs';
import bridge from '../services/bridge';
import shared from '@joplin/lib/components/shared/encryption-config-shared';
import { MasterKeyEntity } from '@joplin/lib/services/e2ee/types';
import { getEncryptionEnabled, masterKeyEnabled, SyncInfo } from '@joplin/lib/services/synchronizer/syncInfoUtils';
import { toggleAndSetupEncryption } from '@joplin/lib/services/e2ee/utils';
import MasterKey from '@joplin/lib/models/MasterKey';

interface Props {}

class EncryptionConfigScreenComponent extends React.Component<Props> {
	constructor(props: Props) {
		super(props);

		shared.initialize(this, props);
	}

	componentWillUnmount() {
		this.isMounted_ = false;
		shared.componentWillUnmount();
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

	private renderMasterKey(mk: MasterKeyEntity, isDefault: boolean) {
		const theme = themeStyle(this.props.themeId);

		const passwordStyle = {
			color: theme.color,
			backgroundColor: theme.backgroundColor,
			border: '1px solid',
			borderColor: theme.dividerColor,
		};

		const onSaveClick = () => {
			return shared.onSavePasswordClick(this, mk);
		};

		const onPasswordChange = (event: any) => {
			return shared.onPasswordChange(this, mk, event.target.value);
		};

		const onToggleEnabledClick = () => {
			return shared.onToggleEnabledClick(this, mk);
		};

		const password = this.state.passwords[mk.id] ? this.state.passwords[mk.id] : '';
		const isActive = this.props.activeMasterKeyId === mk.id;
		const activeIcon = isActive ? '✔' : '';
		const passwordOk = this.state.passwordChecks[mk.id] === true ? '✔' : '❌';

		return (
			<tr key={mk.id}>
				<td style={theme.textStyle}>{activeIcon}</td>
				<td style={theme.textStyle}>{mk.id}<br/>{_('Source: ')}{mk.source_application}</td>
				<td style={theme.textStyle}>{_('Created: ')}{time.formatMsToLocal(mk.created_time)}<br/>{_('Updated: ')}{time.formatMsToLocal(mk.updated_time)}</td>
				<td style={theme.textStyle}>
					<input type="password" style={passwordStyle} value={password} onChange={event => onPasswordChange(event)} />{' '}
					<button style={theme.buttonStyle} onClick={() => onSaveClick()}>
						{_('Save')}
					</button>
				</td>
				<td style={theme.textStyle}>{passwordOk}</td>
				<td style={theme.textStyle}>
					<button disabled={isActive || isDefault} style={theme.buttonStyle} onClick={() => onToggleEnabledClick()}>{masterKeyEnabled(mk) ? _('Disable') : _('Enable')}</button>
				</td>
			</tr>
		);
	}

	renderNeedUpgradeSection() {
		if (!shim.isElectron()) return null;

		const needUpgradeMasterKeys = EncryptionService.instance().masterKeysThatNeedUpgrading(this.props.masterKeys);
		if (!needUpgradeMasterKeys.length) return null;

		const theme = themeStyle(this.props.themeId);

		const rows = [];
		const comp = this;

		for (const mk of needUpgradeMasterKeys) {
			rows.push(
				<tr key={mk.id}>
					<td style={theme.textStyle}>{mk.id}</td>
					<td><button onClick={() => shared.upgradeMasterKey(comp, mk)} style={theme.buttonStyle}>Upgrade</button></td>
				</tr>
			);
		}

		return (
			<div>
				<h1 style={theme.h1Style}>{_('Master keys that need upgrading')}</h1>
				<p style={theme.textStyle}>{_('The following master keys use an out-dated encryption algorithm and it is recommended to upgrade them. The upgraded master key will still be able to decrypt and encrypt your data as usual.')}</p>
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
	}

	renderReencryptData() {
		if (!shim.isElectron()) return null;
		if (!this.props.shouldReencrypt) return null;

		const theme = themeStyle(this.props.themeId);
		const buttonLabel = _('Re-encrypt data');

		const intro = this.props.shouldReencrypt ? _('The default encryption method has been changed to a more secure one and it is recommended that you apply it to your data.') : _('You may use the tool below to re-encrypt your data, for example if you know that some of your notes are encrypted with an obsolete encryption method.');

		let t = `${intro}\n\n${_('In order to do so, your entire data set will have to be encrypted and synchronised, so it is best to run it overnight.\n\nTo start, please follow these instructions:\n\n1. Synchronise all your devices.\n2. Click "%s".\n3. Let it run to completion. While it runs, avoid changing any note on your other devices, to avoid conflicts.\n4. Once sync is done on this device, sync all your other devices and let it run to completion.\n\nImportant: you only need to run this ONCE on one device.', buttonLabel)}`;

		t = t.replace(/\n\n/g, '</p><p>');
		t = t.replace(/\n/g, '<br>');
		t = `<p>${t}</p>`;

		return (
			<div>
				<h1 style={theme.h1Style}>{_('Re-encryption')}</h1>
				<p style={theme.textStyle} dangerouslySetInnerHTML={{ __html: t }}></p>
				<span style={{ marginRight: 10 }}>
					<button onClick={() => shared.reencryptData()} style={theme.buttonStyle}>{buttonLabel}</button>
				</span>

				{ !this.props.shouldReencrypt ? null : <button onClick={() => shared.dontReencryptData()} style={theme.buttonStyle}>{_('Ignore')}</button> }
			</div>
		);
	}

	private renderMasterKeySection(masterKeys: MasterKeyEntity[], isEnabledMasterKeys: boolean) {
		const theme = themeStyle(this.props.themeId);
		const mkComps = [];
		const showTable = isEnabledMasterKeys || this.state.showDisabledMasterKeys;
		const latestMasterKey = MasterKey.latest();

		for (let i = 0; i < masterKeys.length; i++) {
			const mk = masterKeys[i];
			mkComps.push(this.renderMasterKey(mk, isEnabledMasterKeys && latestMasterKey && mk.id === latestMasterKey.id));
		}

		const headerComp = isEnabledMasterKeys ? <h1 style={theme.h1Style}>{_('Master Keys')}</h1> : <a onClick={() => shared.toggleShowDisabledMasterKeys(this) } style={{ ...theme.urlStyle, display: 'inline-block', marginBottom: 10 }} href="#">{showTable ? _('Hide disabled master keys') : _('Show disabled master keys')}</a>;
		const infoComp = isEnabledMasterKeys ? <p style={theme.textStyle}>{_('Note: Only one master key is going to be used for encryption (the one marked as "active"). Any of the keys might be used for decryption, depending on how the notes or notebooks were originally encrypted.')}</p> : null;
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
				<div>
					{headerComp}
					{tableComp}
					{infoComp}
				</div>
			);
		}

		return null;
	}

	render() {
		const theme = themeStyle(this.props.themeId);
		const masterKeys: MasterKeyEntity[] = this.props.masterKeys;

		const containerStyle = Object.assign({}, theme.containerStyle, {
			padding: theme.configScreenPadding,
			overflow: 'auto',
			backgroundColor: theme.backgroundColor3,
		});

		const nonExistingMasterKeyIds = this.props.notLoadedMasterKeys.slice();

		for (let i = 0; i < masterKeys.length; i++) {
			const mk = masterKeys[i];
			const idx = nonExistingMasterKeyIds.indexOf(mk.id);
			if (idx >= 0) nonExistingMasterKeyIds.splice(idx, 1);
		}

		const onToggleButtonClick = async () => {
			const isEnabled = getEncryptionEnabled();
			const masterKey = MasterKey.latest();

			let answer = null;
			if (isEnabled) {
				answer = await dialogs.confirm(_('Disabling encryption means *all* your notes and attachments are going to be re-synchronised and sent unencrypted to the sync target. Do you wish to continue?'));
			} else {
				const msg = shared.enableEncryptionConfirmationMessages(masterKey);
				answer = await dialogs.prompt(msg.join('\n\n'), '', '', { type: 'password' });
			}

			if (!answer) return;

			try {
				await toggleAndSetupEncryption(EncryptionService.instance(), !isEnabled, masterKey, answer);
			} catch (error) {
				await dialogs.alert(error.message);
			}
		};

		const decryptedItemsInfo = <p style={theme.textStyle}>{shared.decryptedStatText(this)}</p>;
		const toggleButton = (
			<button
				style={theme.buttonStyle}
				onClick={() => {
					void onToggleButtonClick();
				}}
			>
				{this.props.encryptionEnabled ? _('Disable encryption') : _('Enable encryption')}
			</button>
		);

		const needUpgradeSection = this.renderNeedUpgradeSection();
		const reencryptDataSection = this.renderReencryptData();

		const enabledMasterKeySection = this.renderMasterKeySection(masterKeys.filter(mk => masterKeyEnabled(mk)), true);
		const disabledMasterKeySection = this.renderMasterKeySection(masterKeys.filter(mk => !masterKeyEnabled(mk)), false);

		let nonExistingMasterKeySection = null;

		if (nonExistingMasterKeyIds.length) {
			const rows = [];
			for (let i = 0; i < nonExistingMasterKeyIds.length; i++) {
				const id = nonExistingMasterKeyIds[i];
				rows.push(
					<tr key={id}>
						<td style={theme.textStyle}>{id}</td>
					</tr>
				);
			}

			nonExistingMasterKeySection = (
				<div>
					<h1 style={theme.h1Style}>{_('Missing Master Keys')}</h1>
					<p style={theme.textStyle}>{_('The master keys with these IDs are used to encrypt some of your items, however the application does not currently have access to them. It is likely they will eventually be downloaded via synchronisation.')}</p>
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

		return (
			<div>
				<div style={containerStyle}>
					{
						<div className="alert alert-warning" style={{ backgroundColor: theme.warningBackgroundColor, paddingLeft: 10, paddingRight: 10, paddingTop: 2, paddingBottom: 2 }}>
							<p style={theme.textStyle}>
								<span>{_('For more information about End-To-End Encryption (E2EE) and advice on how to enable it please check the documentation:')}</span>{' '}
								<a
									onClick={() => {
										bridge().openExternal('https://joplinapp.org/e2ee/');
									}}
									href="#"
									style={theme.urlStyle}
								>
									https://joplinapp.org/e2ee/
								</a>
							</p>
						</div>
					}
					<h1 style={theme.h1Style}>{_('Status')}</h1>
					<p style={theme.textStyle}>
						{_('Encryption is:')} <strong>{this.props.encryptionEnabled ? _('Enabled') : _('Disabled')}</strong>
					</p>
					{decryptedItemsInfo}
					{toggleButton}
					{needUpgradeSection}
					{this.props.shouldReencrypt ? reencryptDataSection : null}
					{enabledMasterKeySection}
					{disabledMasterKeySection}
					{nonExistingMasterKeySection}
					{!this.props.shouldReencrypt ? reencryptDataSection : null}
				</div>
			</div>
		);
	}
}

const mapStateToProps = (state: State) => {
	const syncInfo = new SyncInfo(state.settings['syncInfoCache']);

	return {
		themeId: state.settings.theme,
		masterKeys: syncInfo.masterKeys,
		passwords: state.settings['encryption.passwordCache'],
		encryptionEnabled: syncInfo.e2ee,
		activeMasterKeyId: syncInfo.activeMasterKeyId,
		shouldReencrypt: state.settings['encryption.shouldReencrypt'] >= Setting.SHOULD_REENCRYPT_YES,
		notLoadedMasterKeys: state.notLoadedMasterKeys,
	};
};

const EncryptionConfigScreen = connect(mapStateToProps)(EncryptionConfigScreenComponent);

export default EncryptionConfigScreen;
