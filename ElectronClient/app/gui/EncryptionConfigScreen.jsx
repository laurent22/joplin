const React = require('react');
const { connect } = require('react-redux');
const Setting = require('lib/models/Setting');
const BaseItem = require('lib/models/BaseItem');
const EncryptionService = require('lib/services/EncryptionService');
const { Header } = require('./Header.min.js');
const { themeStyle } = require('../theme.js');
const { _ } = require('lib/locale.js');
const { time } = require('lib/time-utils.js');
const dialogs = require('./dialogs');
const shared = require('lib/components/shared/encryption-config-shared.js');

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

	componentWillMount() {
		this.initState(this.props);
	}

	componentWillReceiveProps(nextProps) {
		this.initState(nextProps);
	}

	async checkPasswords() {
		return shared.checkPasswords(this);
	}

	renderMasterKey(mk) {
		const theme = themeStyle(this.props.theme);

		const onSaveClick = () => {
			return shared.onSavePasswordClick(this, mk);
		}

		const onPasswordChange = (event) => {
			return shared.onPasswordChange(this, mk, event.target.value);
		}

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
				<td style={theme.textStyle}><input type="password" value={password} onChange={(event) => onPasswordChange(event)}/> <button onClick={() => onSaveClick()}>{_('Save')}</button></td>
				<td style={theme.textStyle}>{passwordOk}</td>
			</tr>
		);
	}

	render() {
		const style = this.props.style;
		const theme = themeStyle(this.props.theme);
		const masterKeys = this.state.masterKeys;
		const containerPadding = 10;

		const headerStyle = {
			width: style.width,
		};

		const containerStyle = {
			padding: containerPadding,
			overflow: 'auto',
			height: style.height - theme.headerHeight - containerPadding * 2,
		};

		const mkComps = [];

		for (let i = 0; i < masterKeys.length; i++) {
			const mk = masterKeys[i];
			mkComps.push(this.renderMasterKey(mk));
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
		}

		const decryptedItemsInfo = this.props.encryptionEnabled ? <p style={theme.textStyle}>{shared.decryptedStatText(this)}</p> : null;
		const toggleButton = <button onClick={() => { onToggleButtonClick() }}>{this.props.encryptionEnabled ? _('Disable encryption') : _('Enable encryption')}</button>

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

		return (
			<div>
				<Header style={headerStyle} />
				<div style={containerStyle}>
					<h1 style={theme.h1Style}>{_('Status')}</h1>
					<p style={theme.textStyle}>{_('Encryption is:')} <strong>{this.props.encryptionEnabled ? _('Enabled') : _('Disabled')}</strong></p>
					{decryptedItemsInfo}
					{toggleButton}
					{masterKeySection}
				</div>
			</div>
		);
	}

}

const mapStateToProps = (state) => {
	return {
		theme: state.settings.theme,
		masterKeys: state.masterKeys,
		passwords: state.settings['encryption.passwordCache'],
		encryptionEnabled: state.settings['encryption.enabled'],
		activeMasterKeyId: state.settings['encryption.activeMasterKeyId'],
	};
};

const EncryptionConfigScreen = connect(mapStateToProps)(EncryptionConfigScreenComponent);

module.exports = { EncryptionConfigScreen };