import * as React from 'react';
import { Dispatch } from 'redux';
import { AppState } from '../app.reducer';
import { OauthLoginScreenComponent } from './OauthLoginScreen';
import { _ } from '@joplin/lib/locale';

const { connect } = require('react-redux');

interface Props {
	dispatch: Dispatch;
	joplinServerApi: string;
}

const JoplinServerScreenConnected = (props: Props) => {
	return (
		<OauthLoginScreenComponent
			dispatch={props.dispatch}
			apiUrl={props.joplinServerApi}
			websiteUrl={props.joplinServerApi}
			syncTargetId={9}
			syncTargetName='joplinServer'
			messageText={_('To allow Joplin to synchronise with Joplin Server, please login using this URL:')}
		/>
	);
};

const mapStateToProps = (state: AppState) => {
	return {
		joplinServerApi: state.settings['sync.9.path'],
	};
};

export default connect(mapStateToProps)(JoplinServerScreenConnected);
