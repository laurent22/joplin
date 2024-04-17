const { connect } = require('react-redux');
import { AppState } from '../app.reducer';
import { _ } from '@joplin/lib/locale';
import { clipboard } from 'electron';
import Button from './Button/Button';
import { Fragment } from 'react';

type JoplinCloudConfigScreenProps = {
	inboxEmail: string;
	joplinCloudAccountType: number;
};

const JoplinCloudConfigScreen = (props: JoplinCloudConfigScreenProps) => {
	const copyToClipboard = () => {
		clipboard.writeText(props.inboxEmail);
	};

	const isEmailToNoteAvailableInAccount = props.joplinCloudAccountType !== 1;

	return (
		<div>
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
	};
};

export default connect(mapStateToProps)(JoplinCloudConfigScreen);
