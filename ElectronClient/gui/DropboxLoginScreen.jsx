const React = require('react');
const { connect } = require('react-redux');
const { bridge } = require('electron').remote.require('./bridge');
const { Header } = require('./Header/Header.min.js');
const { themeStyle } = require('lib/theme');
const { _ } = require('lib/locale.js');
const Shared = require('lib/components/shared/dropbox-login-shared');

class DropboxLoginScreenComponent extends React.Component {
	constructor() {
		super();

		this.shared_ = new Shared(this, msg => bridge().showInfoMessageBox(msg), msg => bridge().showErrorMessageBox(msg));
	}

	UNSAFE_componentWillMount() {
		this.shared_.refreshUrl();
	}

	render() {
		const style = this.props.style;
		const theme = themeStyle(this.props.theme);

		const headerStyle = Object.assign({}, theme.headerStyle, { width: style.width });
		const containerStyle = Object.assign({}, theme.containerStyle, {
			padding: theme.margin,
			height: style.height - theme.headerHeight - theme.margin * 2,
		});

		const inputStyle = Object.assign({}, theme.inputStyle, { width: 500 });

		return (
			<div>
				<Header style={headerStyle} />
				<div style={containerStyle}>
					<p style={theme.textStyle}>{_('To allow Joplin to synchronise with Dropbox, please follow the steps below:')}</p>
					<p style={theme.textStyle}>{_('Step 1: Open this URL in your browser to authorise the application:')}</p>
					<a style={theme.textStyle} href="#" onClick={this.shared_.loginUrl_click}>
						{this.state.loginUrl}
					</a>
					<p style={theme.textStyle}>{_('Step 2: Enter the code provided by Dropbox:')}</p>
					<p>
						<input type="text" value={this.state.authCode} onChange={this.shared_.authCodeInput_change} style={inputStyle} />
					</p>
					<button disabled={this.state.checkingAuthToken} onClick={this.shared_.submit_click}>
						{_('Submit')}
					</button>
				</div>
			</div>
		);
	}
}

const mapStateToProps = state => {
	return {
		theme: state.settings.theme,
	};
};

const DropboxLoginScreen = connect(mapStateToProps)(DropboxLoginScreenComponent);

module.exports = { DropboxLoginScreen };
