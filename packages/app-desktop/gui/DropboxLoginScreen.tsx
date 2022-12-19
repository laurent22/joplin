import * as React from 'react';
import ButtonBar from './ConfigScreen/ButtonBar';
import { _ } from '@joplin/lib/locale';

const { connect } = require('react-redux');
const bridge = require('@electron/remote').require('./bridge').default;
const { themeStyle } = require('@joplin/lib/theme');
const Shared = require('@joplin/lib/components/shared/dropbox-login-shared');

interface Props {
	themeId: string;
}

class DropboxLoginScreenComponent extends React.Component<any, any> {

	shared_: any;

	constructor(props: Props) {
		super(props);

		this.shared_ = new Shared(this, (msg: string) => bridge().showInfoMessageBox(msg), (msg: string) => bridge().showErrorMessageBox(msg));
	}

	UNSAFE_componentWillMount() {
		this.shared_.refreshUrl();
	}

	render() {
		const style = this.props.style;
		const theme = themeStyle(this.props.themeId);

		const containerStyle = Object.assign({}, theme.containerStyle, {
			padding: theme.configScreenPadding,
			height: style.height - theme.margin * 2,
			flex: 1,
		});

		const inputStyle = Object.assign({}, theme.inputStyle, { width: 500 });

		const buttonStyle = Object.assign({}, theme.buttonStyle, { marginRight: 10 });

		return (
			<div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
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
					<button disabled={this.state.checkingAuthToken} style={buttonStyle} onClick={this.shared_.submit_click}>
						{_('Submit')}
					</button>
				</div>
				<ButtonBar
					onCancelClick={() => this.props.dispatch({ type: 'NAV_BACK' })}
				/>
			</div>
		);
	}
}

const mapStateToProps = (state: any) => {
	return {
		themeId: state.settings.theme,
	};
};

export default connect(mapStateToProps)(DropboxLoginScreenComponent);
