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

class EncryptionConfigScreenComponent extends React.Component {

	constructor() {
		super();
		this.state = {
			masterKeys: [],
			passwords: {},
			passwordChecks: {},
			stats: {
				encrypted: null,
				total: null,
			},
		};
		this.isMounted_ = false;
		this.refreshStatsIID_ = null;
	}

	componentDidMount() {
		this.isMounted_ = true;
	}

	componentWillUnmount() {
		this.isMounted_ = false;
	}

	initState(props) {
		this.setState({
			masterKeys: props.masterKeys,
			passwords: props.passwords ? props.passwords : {},
		}, () => {
			this.checkPasswords();
		});

		this.refreshStats();

		if (this.refreshStatsIID_) {
			clearInterval(this.refreshStatsIID_);
			this.refreshStatsIID_ = null;
		}

		this.refreshStatsIID_ = setInterval(() => {
			if (!this.isMounted_) {
				clearInterval(this.refreshStatsIID_);
				this.refreshStatsIID_ = null;
				return;
			}
			this.refreshStats();
		}, 3000);
	}

	componentWillMount() {
		this.initState(this.props);
	}

	componentWillReceiveProps(nextProps) {
		this.initState(nextProps);
	}

	async refreshStats() {
		const stats = await BaseItem.encryptedItemsStats();
		this.setState({ stats: stats });
	}

	async checkPasswords() {
		const passwordChecks = Object.assign({}, this.state.passwordChecks);
		for (let i = 0; i < this.state.masterKeys.length; i++) {
			const mk = this.state.masterKeys[i];
			const password = this.state.passwords[mk.id];
			const ok = password ? await EncryptionService.instance().checkMasterKeyPassword(mk, password) : false;
			passwordChecks[mk.id] = ok;
		}
		this.setState({ passwordChecks: passwordChecks });
	}

	renderMasterKey(mk) {
		const theme = themeStyle(this.props.theme);

		const onSaveClick = () => {
			const password = this.state.passwords[mk.id];
			if (!password) {
				Setting.deleteObjectKey('encryption.passwordCache', mk.id);
			} else {
				Setting.setObjectKey('encryption.passwordCache', mk.id, password);
			}

			this.checkPasswords();
		}

		const onPasswordChange = (event) => {
			const passwords = this.state.passwords;
			passwords[mk.id] = event.target.value;
			this.setState({ passwords: passwords });
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
				answer = await dialogs.confirm(_('Disabling encryption means <b>all</b> your notes and attachments are going to be re-synchronised and sent unencrypted to the sync target. Do you wish to continue?'));
			} else {
				answer = await dialogs.prompt(_('Enabling encryption means <b>all</b> your notes and attachments are going to be re-synchronised and sent encrypted to the sync target. Do not lose the password as, for security purposes, this will be the <b>only</b> way to decrypt the data! To enable encryption, please enter your password below.'), '', '', { type: 'password' });
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

		const stats = this.state.stats;
		const decryptedItemsInfo = this.props.encryptionEnabled ? <p style={theme.textStyle}>{_('Decrypted items: %s / %s', stats.encrypted !== null ? (stats.total - stats.encrypted) : '-', stats.total !== null ? stats.total : '-')}</p> : null;
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