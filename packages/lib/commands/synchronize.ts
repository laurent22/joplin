import { utils, CommandRuntime, CommandDeclaration, CommandContext } from '../services/CommandService';
import { _ } from '../locale';
import { reg } from '../registry';
import Setting from '../models/Setting';

export const declaration: CommandDeclaration = {
	name: 'synchronize',
	label: () => _('Synchronise'),
	iconName: 'fa-sync-alt',
};

// Note that this command actually acts as a toggle - it starts or cancels
// synchronisation depending on the "syncStarted" parameter
export const runtime = (): CommandRuntime => {
	return {
		execute: async (context: CommandContext, syncStarted: boolean = null) => {
			syncStarted = syncStarted === null ? context.state.syncStarted : syncStarted;

			const action = syncStarted ? 'cancel' : 'start';

			if (!Setting.value('sync.target')) {
				context.dispatch({
					type: 'DIALOG_OPEN',
					name: 'syncWizard',
				});
				return 'init';
			}

			if (!(await reg.syncTarget().isAuthenticated())) {
				if (reg.syncTarget().authRouteName()) {
					utils.store.dispatch({
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
				utils.store.dispatch({
					type: 'SYNC_REPORT_UPDATE',
					report: { errors: [error] },
				});
				return 'error';
			}

			if (action === 'cancel') {
				sync.cancel();
				return 'cancel';
			} else {
				void reg.scheduleSync(0);
				return 'sync';
			}
		},
	};
};
