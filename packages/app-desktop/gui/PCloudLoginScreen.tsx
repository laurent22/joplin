import * as React from 'react';
import { Dispatch } from 'redux';
import ButtonBar from './ConfigScreen/ButtonBar';
import { _ } from '@joplin/lib/locale';
import bridge from '../services/bridge';

import { connect } from 'react-redux';
import { themeStyle } from '@joplin/lib/theme';
import Shared from '@joplin/lib/components/shared/pcloud-login-shared';

interface Props {
	themeId: number;
	style: { width: number; height: number };
	dispatch: Dispatch;
}

interface State {
	loginUrl: string;
	authCode: string;
	checkingAuthToken: boolean;
}

class PCloudLoginScreenComponent extends React.Component<Props, State> {

	private shared_: Shared<PCloudLoginScreenComponent>;

	public constructor(props: Props) {
		super(props);

		this.shared_ = new Shared(this, (msg: string) => bridge().showInfoMessageBox(msg), (msg: string) => bridge().showErrorMessageBox(msg));
	}

	public UNSAFE_componentWillMount() {
		void this.shared_.refreshUrl();
	}

	public render() {
		const style = this.props.style;
		const theme = themeStyle(this.props.themeId);

		const containerStyle = { ...theme.containerStyle, padding: theme.configScreenPadding,
			height: style.height - theme.margin * 2,
			flex: 1 };

		const inputStyle = { ...theme.inputStyle, width: 500 };

		const buttonStyle = { ...theme.buttonStyle, marginRight: 10 };

		return (
			<div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
				<div style={containerStyle}>
					<p style={theme.textStyle}>{_('To allow Joplin to synchronise with pCloud, please follow the steps below:')}</p>
					<p style={theme.textStyle}>{_('Step 1: Open this URL in your browser to authorise the application:')}</p>
					<a style={theme.textStyle} href="#" onClick={event => { event.preventDefault(); this.shared_.loginUrl_click(); }}>
						{this.state.loginUrl}
					</a>
					<p style={theme.textStyle}><label htmlFor="pcloud-auth-code-input">{_('Step 2: Enter the code provided by pCloud:')}</label></p>
					<p>
						<input id="pcloud-auth-code-input" type="text" value={this.state.authCode} onChange={this.shared_.authCodeInput_change} style={inputStyle} />
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

const mapStateToProps = (state: { settings: { theme: number } }) => {
	return {
		themeId: state.settings.theme,
	};
};

export default connect(mapStateToProps)(PCloudLoginScreenComponent);
