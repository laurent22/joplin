import { CommandRuntime, CommandDeclaration } from '@joplin/lib/services/CommandService';
import { _ } from '@joplin/lib/locale';
import isNoteLockEnabled from '@joplin/lib/services/noteLock/isNoteLockEnabled';
import NoteLockSession from '@joplin/lib/services/noteLock/NoteLockSession';

export const declaration: CommandDeclaration = {
	name: 'lockEncryptedNotes',
	label: () => _('Lock encrypted notes'),
};

export const runtime = (): CommandRuntime => {
	return {
		execute: async () => {
			if (!isNoteLockEnabled()) return;
			NoteLockSession.instance().lock();
		},
		enabledCondition: 'noteLockSessionUnlocked',
	};
};
