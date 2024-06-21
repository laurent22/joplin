const { connect } = require('react-redux');
import { AppState } from '../app.reducer';
import { _ } from '@joplin/lib/locale';
import { clipboard } from 'electron';
import Button from './Button/Button';
import { Fragment } from 'react';
import { accountTypeToString } from '@joplin/lib/utils/joplinCloud/types';
import bridge from '../services/bridge';

type JoplinCloudConfigScreenProps = {
	inboxEmail: string;
	joplinCloudAccountType: number;
	userEmail: string;
	joplinCloudWebsite: string;
};

const JoplinCloudConfigScreen = (props: JoplinCloudConfigScreenProps) => {
	const copyToClipboard = () => {
		clipboard.writeText(props.inboxEmail);
	};

	const isEmailToNoteAvailableInAccount = props.joplinCloudAccountType !== 1;

	const goToJoplinCloudProfile = async () => {
		await bridge().openExternal(`${props.joplinCloudWebsite}/users/me`);
	};

	return (
		<div>
			<div className="joplin-cloud-account-information">
				<h2>{_('Account information')}</h2>
				<table>
					<tbody>
						<tr>
							<td><strong>{_('Account type')}</strong></td>
							<td>{accountTypeToString(props.joplinCloudAccountType)}</td>
						</tr>
						<tr>
							<td><strong>{_('Email')}</strong></td>
							<td>{props.userEmail}</td>
						</tr>
					</tbody>
				</table>
				<Button onClick={goToJoplinCloudProfile} title={_('Go to Joplin Cloud profile')}/>
			</div>

			<h2>{_('Email to note')}</h2>
			<p>{_('Any email sent to this address will be converted into a note and added to your collection. The note will be saved into the Inbox notebook')}</p>
			{
				isEmailToNoteAvailableInAccount ? <Fragment>
					<p className='inbox-email-value'>{props.inboxEmail}</p>
					<Button onClick={copyToClipboard} title={_('Copy to clipboard')} />
				</Fragment>
					: <div className='alert-warn'>
						<p>{_('Your account doesn\'t have access to this feature')}</p>
					</div>
			}
		</div>
	);
};

const mapStateToProps = (state: AppState) => {
	return {
		inboxEmail: state.settings['sync.10.inboxEmail'],
		joplinCloudAccountType: state.settings['sync.10.accountType'],
		userEmail: state.settings['sync.10.userEmail'],
		joplinCloudWebsite: state.settings['sync.10.website'],
	};
};

export default connect(mapStateToProps)(JoplinCloudConfigScreen);
