import { _ } from '@joplin/lib/locale';
import { CommandDeclaration, CommandRuntime } from '@joplin/lib/services/CommandService';
import { runtime as synchronizeRuntime } from '@joplin/lib/commands/synchronize';

export const declaration: CommandDeclaration = {
	name: 'synchronizeEditor',
	label: () => _('Synchronise'),
	iconName: 'ionicon sync',
};

// Reuse the sidebar-compatible sync command behavior, while disabling the
// editor toolbar action when a sync is already running.
export const runtime = (): CommandRuntime => ({
	...synchronizeRuntime(),
	enabledCondition: '!syncStarted',
});
