const React = require('react');
const { connect } = require('react-redux');
const Setting = require('lib/models/Setting');
const EncryptionService = require('lib/services/EncryptionService');
const { themeStyle } = require('../theme.js');
const { _ } = require('lib/locale.js');
const { time } = require('lib/time-utils.js');
const dialogs = require('./dialogs');
const shared = require('lib/components/shared/encryption-config-shared.js');
const { bridge } = require('electron').remote.require('./bridge');

class EncryptionConfigScreenComponent extends React.Component {
	constructor() {
		super();
		shared.constructor(this);
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

	renderMasterKey(mk) {
		const theme = themeStyle(this.props.theme);

		const passwordStyle = {
			color: theme.color,
			backgroundColor: theme.backgroundColor,
			border: '1px solid',
			borderColor: theme.dividerColor,
		};

		const onSaveClick = () => {
			return shared.onSavePasswordClick(this, mk);
		};

		const onPasswordChange = event => {
			return shared.onPasswordChange(this, mk, event.target.value);
		};

		const password = this.state.passwords[mk.id] ? this.state.passwords[mk.id] : '';
		const active = this.props.activeMasterKeyId === mk.id ? '✔' : '';
		const passwordOk = this.state.passwordChecks[mk.id] === true ? '✔' : '❌';

		return (
			<tr key={mk.id}>
				<td style={theme.textStyle}>{active}</td>
				<td style={theme.textStyle}>{mk.id}</td>
				<td style={theme.textStyle}>{mk.source_application}</td>
				<td style={theme.textStyle}>{time.formatMsToLocal(mk.created_time)}</td>
				<td style={theme.textStyle}>{time.formatMsToLocal(mk.updated_time)}</td>
				<td style={theme.textStyle}>
					<input type="password" style={passwordStyle} value={password} onChange={event => onPasswordChange(event)} />{' '}
					<button style={theme.buttonStyle} onClick={() => onSaveClick()}>
						{_('Save')}
					</button>
				</td>
				<td style={theme.textStyle}>{passwordOk}</td>
			</tr>
		);
	}

	render() {
		const theme = themeStyle(this.props.theme);
		const masterKeys = this.state.masterKeys;
		const containerPadding = 10;

		const containerStyle = Object.assign({}, theme.containerStyle, {
			padding: containerPadding,
			overflow: 'auto',
		});

		const mkComps = [];
		let nonExistingMasterKeyIds = this.props.notLoadedMasterKeys.slice();

		for (let i = 0; i < masterKeys.length; i++) {
			const mk = masterKeys[i];
			mkComps.push(this.renderMasterKey(mk));

			const idx = nonExistingMasterKeyIds.indexOf(mk.id);
			if (idx >= 0) nonExistingMasterKeyIds.splice(idx, 1);
		}

		const onToggleButtonClick = async () => {
			const isEnabled = Setting.value('encryption.enabled');

			let answer = null;
			if (isEnabled) {
				answer = await dialogs.confirm(_('Disabling encryption means *all* your notes and attachments are going to be re-synchronised and sent unencrypted to the sync target. Do you wish to continue?'));
			} else {
				answer = await dialogs.prompt(_('Enabling encryption means *all* your notes and attachments are going to be re-synchronised and sent encrypted to the sync target. Do not lose the password as, for security purposes, this will be the *only* way to decrypt the data! To enable encryption, please enter your password below.'), '', '', { type: 'password' });
			}

			if (!answer) return;

			try {
				if (isEnabled) {
					await EncryptionService.instance().disableEncryption();
				} else {
					await EncryptionService.instance().generateMasterKeyAndEnableEncryption(answer);
				}
			} catch (error) {
				await dialogs.alert(error.message);
			}
		};

		const decryptedItemsInfo = <p style={theme.textStyle}>{shared.decryptedStatText(this)}</p>;
		const toggleButton = (
			<button
				style={theme.buttonStyle}
				onClick={() => {
					onToggleButtonClick();
				}}
			>
				{this.props.encryptionEnabled ? _('Disable encryption') : _('Enable encryption')}
			</button>
		);

		let masterKeySection = null;

		if (mkComps.length) {
			masterKeySection = (
				<div>
					<h1 style={theme.h1Style}>{_('Master Keys')}</h1>
					<table>
						<tbody>
							<tr>
								<th style={theme.textStyle}>{_('Active')}</th>
								<th style={theme.textStyle}>{_('ID')}</th>
								<th style={theme.textStyle}>{_('Source')}</th>
								<th style={theme.textStyle}>{_('Created')}</th>
								<th style={theme.textStyle}>{_('Updated')}</th>
								<th style={theme.textStyle}>{_('Password')}</th>
								<th style={theme.textStyle}>{_('Password OK')}</th>
							</tr>
							{mkComps}
						</tbody>
					</table>
					<p style={theme.textStyle}>{_('Note: Only one master key is going to be used for encryption (the one marked as "active"). Any of the keys might be used for decryption, depending on how the notes or notebooks were originally encrypted.')}</p>
				</div>
			);
		}

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
						<div style={{ backgroundColor: theme.warningBackgroundColor, paddingLeft: 10, paddingRight: 10, paddingTop: 2, paddingBottom: 2 }}>
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
					{masterKeySection}
					{nonExistingMasterKeySection}
				</div>
			</div>
		);
	}
}

const mapStateToProps = state => {
	return {
		theme: state.settings.theme,
		masterKeys: state.masterKeys,
		passwords: state.settings['encryption.passwordCache'],
		encryptionEnabled: state.settings['encryption.enabled'],
		activeMasterKeyId: state.settings['encryption.activeMasterKeyId'],
		notLoadedMasterKeys: state.notLoadedMasterKeys,
	};
};

const EncryptionConfigScreen = connect(mapStateToProps)(EncryptionConfigScreenComponent);

module.exports = { EncryptionConfigScreen };
