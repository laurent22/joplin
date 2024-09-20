
import { CommandRuntime, CommandDeclaration } from '@joplin/lib/services/CommandService';
import { _ } from '@joplin/lib/locale';
import Logger from '@joplin/utils/Logger';
import { TargetType } from '@joplin/utils/Logger';
import shim from '@joplin/lib/shim';
import Setting from '@joplin/lib/models/Setting';
import bridge from '../services/bridge';

export const declaration: CommandDeclaration = {
	name: 'exportDeletionLogs',
	label: () => _('Export deletion log'),
};

export const runtime = (): CommandRuntime => {
	return {
		execute: async () => {
			if (!Logger.globalLogger) {
				throw new Error('Could not find global logger');
			}

			const fileTarget = Logger.globalLogger.targets().find(t => t.type === TargetType.File);

			if (!fileTarget || !fileTarget.path) {
				throw new Error('Log file target not found');
			}

			const logFile: string = await shim.fsDriver().readFile(fileTarget.path);

			const deletionLog = logFile
				.split('\n')
				.filter(line => line.includes('DeleteAction'))
				.join('\n');

			const deletionLogPath = `${Setting.value('profileDir')}/deletion_log.txt`;

			await shim.fsDriver().writeFile(deletionLogPath, deletionLog, 'utf8');

			await bridge().openItem(deletionLogPath);
		},
	};
};
