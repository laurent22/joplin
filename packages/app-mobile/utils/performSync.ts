import { Dispatch } from 'redux';
import Setting from '@joplin/lib/models/Setting';
import { reg } from '@joplin/lib/registry';

// Shared sync trigger logic used by both the side menu and the config screen.
// Replicates the behavior of the desktop `synchronize` command: if not
// authenticated it navigates to the sync target's auth route; otherwise it
// schedules a sync (or cancels one in progress).
const performSync = async (syncStarted: boolean, dispatch: Dispatch): Promise<string> => {
	const action = syncStarted ? 'cancel' : 'start';

	if (!Setting.value('sync.target')) {
		dispatch({ type: 'SIDE_MENU_CLOSE' });
		dispatch({ type: 'SYNC_WIZARD_VISIBLE_CHANGE', visible: true });
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
		void sync.cancel();
		return 'cancel';
	} else {
		void reg.scheduleSync(0);
		return 'sync';
	}
};

export default performSync;
