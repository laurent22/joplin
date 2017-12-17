const React = require('react');
const { connect } = require('react-redux');
const MasterKeys = require('lib/models/MasterKey');
const EncryptionService = require('lib/services/EncryptionService');
const { Header } = require('./Header.min.js');
const { themeStyle } = require('../theme.js');
const { _ } = require('lib/locale.js');
const { time } = require('lib/time-utils.js');

class MasterKeysScreenComponent extends React.Component {

	constructor() {
		super();
		this.state = {
			masterKeys: [],
			passwords: {},
			passwordChecks: {},
		};
	}

	componentWillMount() {
		this.setState({
			masterKeys: this.props.masterKeys,
			passwords: this.props.passwords ? this.props.passwords : {},
		}, () => {
			this.checkPasswords();
		});
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
		const onSaveClick = () => {
			const password = this.state.passwords[mk.id];
			if (!password) {
				Setting.deleteObjectKey('encryption.passwordCache', mk.id);
			} else {
				Setting.setObjectKey('encryption.passwordCache', mk.id, password);
			}
			// const cache = Setting.value('encryption.passwordCache');
			// if (!cache) cache = {};
			// if (!password) {
			// 	delete cache[mk.id];
			// } else {
			// 	cache[mk.id] = password;
			// }
			// Setting.setValue('encryption.passwordCache', cache);

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
				<td>{active}</td>
				<td>{mk.id}</td>
				<td>{mk.source_application}</td>
				<td>{time.formatMsToLocal(mk.created_time)}</td>
				<td>{time.formatMsToLocal(mk.updated_time)}</td>
				<td><input type="password" value={password} onChange={(event) => onPasswordChange(event)}/> <button onClick={() => onSaveClick()}>{_('Save')}</button></td>
				<td>{passwordOk}</td>
			</tr>
		);
	}

	render() {
		const style = this.props.style;
		const theme = themeStyle(this.props.theme);
		const masterKeys = this.state.masterKeys;

		const headerStyle = {
			width: style.width,
		};

		const mkComps = [];

		for (let i = 0; i < masterKeys.length; i++) {
			const mk = masterKeys[i];
			mkComps.push(this.renderMasterKey(mk));
		}

		return (
			<div>
				<Header style={headerStyle} />
				<table>
					<tbody>
						<tr>
							<th>{_('Active')}</th>
							<th>{_('ID')}</th>
							<th>{_('Source')}</th>
							<th>{_('Created')}</th>
							<th>{_('Updated')}</th>
							<th>{_('Password')}</th>
							<th>{_('Password OK')}</th>
						</tr>
						{mkComps}
					</tbody>
				</table>
				{_('Note: Only one master key is going to be used for encryption (the one marked as "active"). Any of the keys might be used for decryption, depending on how the notes or notebooks were originally encrypted.')}
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

const MasterKeysScreen = connect(mapStateToProps)(MasterKeysScreenComponent);

module.exports = { MasterKeysScreen };