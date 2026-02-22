import * as React from 'react';
import { Dispatch } from 'redux';
import { AppState } from '../app.reducer';
import JoplinCloudSignUpCallToAction from './JoplinCloudSignUpCallToAction';
import { OauthLoginScreenComponent } from './OauthLoginScreen';
import { _ } from '@joplin/lib/locale';
import SyncTargetRegistry from '@joplin/lib/SyncTargetRegistry';

const { connect } = require('react-redux');

interface Props {
	dispatch: Dispatch;
	joplinCloudWebsite: string;
	joplinCloudApi: string;
}

const JoplinCloudScreenConnected = (props: Props) => {
	return (
		<OauthLoginScreenComponent
			dispatch={props.dispatch}
			apiUrl={props.joplinCloudApi}
			websiteUrl={props.joplinCloudWebsite}
			syncTargetId={SyncTargetRegistry.nameToId('joplinCloud')}
			syncTargetName='joplinCloud'
			messageText={_('To allow Joplin to synchronise with Joplin Cloud, please login using this URL:')}
			extraComponent={<JoplinCloudSignUpCallToAction />}
		/>
	);
};

const mapStateToProps = (state: AppState) => {
	return {
		joplinCloudWebsite: state.settings['sync.10.website'],
		joplinCloudApi: state.settings['sync.10.path'],
	};
};

export default connect(mapStateToProps)(JoplinCloudScreenConnected);
