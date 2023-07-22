const { connect } = require('react-redux');
import { AppState } from '../app.reducer';
import { _ } from '@joplin/lib/locale';
import { clipboard } from 'electron';
import Button from './Button/Button';

type JoplinCloudConfigScreenProps = {
	inboxEmail: string;
};

const JoplinCloudConfigScreen = (props: JoplinCloudConfigScreenProps) => {
	const copyToClipboard = () => {
		clipboard.writeText(props.inboxEmail);
	};

	return (
		<div>
			<h2>{_('Email to note')}</h2>
			<p>{_('Any email sent to this address will be converted into a note and added to your collection. The note will be saved into the Inbox notebook')}</p>
			<p className='inbox-email-value'>{props.inboxEmail}</p>
			<Button onClick={copyToClipboard} title={_('Copy to clipboard')} />
		</div>
	);
};

const mapStateToProps = (state: AppState) => {
	return {
		inboxEmail: state.settings['emailToNote.inboxEmail'],
	};
};

export default connect(mapStateToProps)(JoplinCloudConfigScreen);
