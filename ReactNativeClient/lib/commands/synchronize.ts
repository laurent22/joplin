import { utils, CommandRuntime, CommandDeclaration } from '../services/CommandService';
const { _ } = require('lib/locale');
const { reg } = require('lib/registry.js');

export const declaration:CommandDeclaration = {
	name: 'synchronize',
	label: () => _('Synchronize'),
	iconName: 'fa-sync-alt',
};

export const runtime = ():CommandRuntime => {
	return {
		execute: async ({ syncStarted }:any) => {
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
		isEnabled: (props:any) => {
			return !props.syncStarted;
		},
		mapStateToProps: (state:any):any => {
			return {
				syncStarted: state.syncStarted,
			};
		},
	};
};
