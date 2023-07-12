const { connect } = require('react-redux');
import { AppState } from '../app.reducer';
import { _ } from '@joplin/lib/locale';
import { clipboard } from 'electron';
import Setting from '@joplin/lib/models/Setting';
import { reg } from '@joplin/lib/registry';
import useAsyncEffect, { AsyncEffectEvent } from '@joplin/lib/hooks/useAsyncEffect';
import Button from './Button/Button';

type JoplinCloudConfigScreenProps = {
	inboxEmail: string;
	syncTarget: number;
	joplinCloud: {
		username: string;
		password: string;
		baseUrl: string;
		userContentPath: string;
	};
};

const JoplinCloudConfigScreen = (props: JoplinCloudConfigScreenProps) => {
	const copyToClipboard = () => {
		clipboard.writeText(props.inboxEmail);
	};

	useAsyncEffect(async (event: AsyncEffectEvent) => {
		if (props.inboxEmail !== '') Setting.setValue('emailToNote.inboxEmail', '');
		if (props.inboxEmail !== '') return;

		const syncTarget = reg.syncTarget();
		const fileApi = await syncTarget.fileApi();
		const api = fileApi.driver().api();

		const owner = await api.exec('GET', `api/users/${api.userId}`);

		if (event.cancelled) return;

		Setting.setValue('emailToNote.inboxEmail', owner.inbox_email);
	}, [props.inboxEmail, reg, Setting]);

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
		syncTarget: state.settings['sync.target'],
		joplinCloud: {
			username: state.settings['sync.10.username'],
			password: state.settings['sync.10.password'],
			baseUrl: state.settings['sync.10.path'],
			userContentPath: state.settings['sync.10.userContentPath'],
		},
	};
};

export default connect(mapStateToProps)(JoplinCloudConfigScreen);
