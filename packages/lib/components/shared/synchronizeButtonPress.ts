import { AnyAction } from 'redux';
import Setting from '../../models/Setting';
const { reg } = require('../../registry');

type OnDispatchCallback = (event: AnyAction)=> void;
type ActionDescription = 'cancel' | 'init' | 'sync' | 'auth' | 'error';

export const synchronizeButtonPress = async (
	syncStarted: boolean,
	dispatch: OnDispatchCallback
): Promise<ActionDescription> => {
	const action = syncStarted ? 'cancel' : 'start';

	if (!Setting.value('sync.target')) {
		dispatch({
			type: 'SIDE_MENU_CLOSE',
		});

		dispatch({
			type: 'NAV_GO',
			routeName: 'Config',
			sectionName: 'sync',
		});

		return 'init';
	}

	if (!(await reg.syncTarget().isAuthenticated())) {
		if (reg.syncTarget().authRouteName()) {
			dispatch({
				type: 'NAV_GO',
				routeName: reg.syncTarget().authRouteName(),
			});
			return 'auth';
		}

		reg.logger().error('Not authenticated with sync target - please check your credentials.');
		return 'error';
	}

	let sync = null;
	try {
		sync = await reg.syncTarget().synchronizer();
	} catch (error) {
		reg.logger().error('Could not initialise synchroniser: ');
		reg.logger().error(error);
		error.message = `Could not initialise synchroniser: ${error.message}`;
		dispatch({
			type: 'SYNC_REPORT_UPDATE',
			report: { errors: [error] },
		});
		return 'error';
	}

	if (action === 'cancel') {
		sync.cancel();
		return 'cancel';
	} else {
		reg.scheduleSync(0);
		return 'sync';
	}
};

export default synchronizeButtonPress;
