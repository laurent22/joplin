import * as React from 'react';
import { _ } from '@joplin/lib/locale';
import ButtonBar from '../ConfigScreen/ButtonBar';
import { connect } from 'react-redux';
import { AppState } from '../../app.reducer';
import SsoScreenShared from '@joplin/lib/components/shared/SsoScreenShared';
import shim from '@joplin/lib/shim';
import { Dispatch } from 'redux';
import Button from '../Button/Button';

type Props = {
	themeId: number;
	dispatch: Dispatch;
	shared: SsoScreenShared;
};

const SsoLoginScreen = (props: Props) => {
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
		<div className='sso-login-screen'>
			<div className='container'>
				<p>{_('To allow Joplin to synchronise with your account, please follow these steps:')}</p>
				<ol>
					<li>
						<Button onClick={props.shared.openLoginPage} title={_('Log in with your web browser')}/>
					</li>
					<li>
						<div>
							<label htmlFor='sso-code'>{_('Enter the code:')}</label>
							<input id='sso-code' type='text' value={code} onChange={e => setCode(e.target.value)} placeholder='###-###-###' />
						</div>
					</li>
					<li>
						<Button type='submit' onClick={submit} disabled={!props.shared.isLoginCodeValid(code)} title={_('Continue')}/>
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
