import { utils, CommandRuntime, CommandDeclaration, CommandContext } from '../services/CommandService';
import { _ } from '../locale';
const { reg } = require('../registry.js');

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

			if (!(await reg.syncTarget().isAuthenticated())) {
				if (reg.syncTarget().authRouteName()) {
					utils.store.dispatch({
						type: 'NAV_GO',
						routeName: reg.syncTarget().authRouteName(),
					});
					return 'auth';
				}

				reg.logger().info('Not authentified with sync target - please check your credential.');
				return 'error';
			}

			let sync = null;
			try {
				sync = await reg.syncTarget().synchronizer();
			} catch (error) {
				reg.logger().info('Could not acquire synchroniser:');
				reg.logger().info(error);
				return 'error';
			}

			if (action == 'cancel') {
				sync.cancel();
				return 'cancel';
			} else {
				reg.scheduleSync(0);
				return 'sync';
			}
		},
	};
};
