import * as React from 'react';
import { themeStyle } from '@joplin/lib/theme';
import { _ } from '@joplin/lib/locale';
import ButtonBar from './ConfigScreen/ButtonBar';
import { connect } from 'react-redux';
import { AppState } from '../app.reducer';
import SsoScreenShared from '@joplin/lib/components/shared/SsoScreenShared';
import shim from '@joplin/lib/shim';
import { Dispatch } from 'redux';

type Props = {
	themeId: number;
	dispatch: Dispatch;
	shared: SsoScreenShared;
};

const SsoLoginScreen = (props: Props) => {
	const theme = themeStyle(props.themeId);

	const containerStyle = { ...theme.containerStyle, padding: theme.configScreenPadding, flex: 1 };

	const inputStyle = { ...theme.inputStyle, width: 100, marginLeft: '5px' };

	const buttonStyle = { ...theme.buttonStyle, marginRight: 10 };

	const listItemStyle = { marginBottom: theme.itemMarginBottom };

	const [code, setCode] = React.useState('');

	const back = () => props.dispatch({ type: 'NAV_BACK' });

	const submit = async () => {
		if (await props.shared.processLoginCode(code)) {
			await shim.showMessageBox(_('You are now logged into your account.'), {
				buttons: [_('OK')],
			});
			back();
		} else {
			await shim.showErrorDialog(_('Failed to connect to your account. Please try again.'));
		}
	};

	return (
		<div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
			<div style={containerStyle}>
				<p style={theme.textStyle}>{_('To allow Joplin to synchronise with your account, please follow these steps:')}</p>
				<ol>
					<li style={listItemStyle}>
						<button style={buttonStyle} onClick={props.shared.openLoginPage}>{_('Log in with your web browser')}</button>
					</li>
					<li style={listItemStyle}>
						<div>
							<label htmlFor='sso-code' style={theme.textStyle}>{_('Enter the code:')}</label>
							<input id='sso-code' type='text' style={inputStyle} value={code} onChange={e => setCode(e.target.value)} placeholder='###-###-###' />
						</div>
					</li>
					<li style={listItemStyle}>
						<button type='submit' onClick={submit} disabled={!props.shared.isLoginCodeValid(code)} style={buttonStyle}>{_('Continue')}</button>
					</li>
				</ol>
			</div>

			<ButtonBar onCancelClick={back} />
		</div>
	);
};

const mapStateToProps = (state: AppState) => ({
	themeId: state.settings.theme,
});

// Allows reuse of this screen for other code-based login flow
export default (shared: SsoScreenShared) => connect(mapStateToProps)((props: Props) => <SsoLoginScreen {...props} shared={shared}/>);
