import { CommandRuntime, CommandDeclaration } from '@joplin/lib/services/CommandService';
import Setting from '@joplin/lib/models/Setting';
import { _ } from '@joplin/lib/locale';
import { appLockHasPasswordHash } from '../services/appLock/AppLockService';

export const declaration: CommandDeclaration = {
	name: 'appLockLockNow',
	label: () => _('Lock now'),
	iconName: 'fa fa-lock',
};

export const runtime = (): CommandRuntime => {
	return {
		execute: async context => {
			if (!Setting.value('security.appLock.enabled') || !appLockHasPasswordHash()) return;
			context.dispatch({
				type: 'APP_LOCK_LOCK',
			});
		},
		enabledCondition: 'appLockEnabled && !appLocked',
	};
};
