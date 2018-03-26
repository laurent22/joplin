const React = require('react');
const { connect } = require('react-redux');
const { reg } = require('lib/registry.js');
const { bridge } = require('electron').remote.require('./bridge');
const { Header } = require('./Header.min.js');
const { themeStyle } = require('../theme.js');
const SyncTargetRegistry = require('lib/SyncTargetRegistry');
const { _ } = require('lib/locale.js');

class DropboxLoginScreenComponent extends React.Component {

	constructor() {
		super();

		this.dropboxApi_ = null;

		this.state = {
			loginUrl: '',
			authCode: '',
			checkingAuthToken: false,
		};

		this.loginUrl_click = () => {
			if (!this.state.loginUrl) return;
			bridge().openExternal(this.state.loginUrl)
		}

		this.authCodeInput_change = (event) => {
			this.setState({
				authCode: event.target.value
			});
		}

		this.submit_click = async () => {
			this.setState({ checkingAuthToken: true });

			const api = await this.dropboxApi();
			try {
				const response = await api.execAuthToken(this.state.authCode);
				Setting.setValue('sync.' + this.syncTargetId() + '.auth', JSON.stringify(response));
				api.setAuthToken(response.access_token);
				bridge().showInfoMessageBox(_('The application has been authorised!'));
				this.props.dispatch({ type: 'NAV_BACK' });
			} catch (error) {
				bridge().showErrorMessageBox(_('Could not authorise application:\n\n%s\n\nPlease try again.', error.message));
			} finally {
				this.setState({ checkingAuthToken: false });
			}
		}
	}

	componentWillMount() {
		this.refreshUrl();
	}

	syncTargetId() {
		return SyncTargetRegistry.nameToId('dropbox');
	}

	async dropboxApi() {
		if (this.dropboxApi_) return this.dropboxApi_;

		const syncTarget = reg.syncTarget(this.syncTargetId());
		this.dropboxApi_ = await syncTarget.api();
		return this.dropboxApi_;
	}

	async refreshUrl() {
		const api = await this.dropboxApi();

		this.setState({
			loginUrl: api.loginUrl(),
		});
	}

	render() {
		const style = this.props.style;
		const theme = themeStyle(this.props.theme);

		const headerStyle = {
			width: style.width,
		};

		const inputStyle = Object.assign({}, theme.inputStyle, { width: 500 });

		return (
			<div>
				<Header style={headerStyle} />
				<div style={{padding: theme.margin}}>
					<p style={theme.textStyle}>{_('To allow Joplin to synchronise with Dropbox, please follow the steps below:')}</p>
					<p style={theme.textStyle}>{_('Step 1: Open this URL in your browser to authorise the application:')}</p>
					<a style={theme.textStyle} href="#" onClick={this.loginUrl_click}>{this.state.loginUrl}</a>
					<p style={theme.textStyle}>{_('Step 2: Enter the code provided by Dropbox:')}</p>
					<p><input type="text" value={this.state.authCode} onChange={this.authCodeInput_change} style={inputStyle}/></p>
					<button disabled={this.state.checkingAuthToken} onClick={this.submit_click}>{_('Submit')}</button>
				</div>
			</div>
		);
	}

}

const mapStateToProps = (state) => {
	return {
		theme: state.settings.theme,
	};
};

const DropboxLoginScreen = connect(mapStateToProps)(DropboxLoginScreenComponent);

module.exports = { DropboxLoginScreen };