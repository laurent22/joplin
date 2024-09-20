
import { CommandRuntime, CommandDeclaration } from '@joplin/lib/services/CommandService';
import { _ } from '@joplin/lib/locale';
import Logger from '@joplin/utils/Logger';
import { TargetType } from '@joplin/utils/Logger';
import shim from '@joplin/lib/shim';
import Setting from '@joplin/lib/models/Setting';
import bridge from '../services/bridge';
import { Stat } from '@joplin/lib/fs-driver-base';

export const declaration: CommandDeclaration = {
	name: 'exportDeletionLog',
	label: () => _('Export deletion log'),
};

// Return log files orderer from oldest to newest, with log.txt being the last one
const logsOrderedByTimestamp = (logFiles: Stat[]) => {
	return logFiles.sort((a, b) => {
		const aTimestamp = a.path.match(/\d+/);
		const bTimestamp = b.path.match(/\d+/);

		if (!aTimestamp) return 1;
		if (!bTimestamp) return -1;

		return parseInt(aTimestamp[0], 10) - parseInt(bTimestamp[0], 10);
	});
};

const getDeletionLines = async (filePath: string) => {
	const logFile: string = await shim.fsDriver().readFile(`${Setting.value('profileDir')}/${filePath}`);

	const deletionLines = logFile
		.split('\n')
		.filter(line => line.includes('DeleteAction'));

	if (!deletionLines.length) return '';

	return `${deletionLines.join('\n')}\n`;
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

			const files = await shim.fsDriver().readDirStats(Setting.value('profileDir'));
			// Get all log.txt and log-{timestamp}.txt files but ignore deletion_log.txt
			const logFiles = files.filter(f => f.path.match(/^log(-\d+)?\.txt$/gi));

			const orderedLogs = logsOrderedByTimestamp(logFiles);

			let allDeletionLines = '';
			for (const file of orderedLogs) {

				const deletionLines = await getDeletionLines(file.path);

				allDeletionLines += deletionLines;
			}

			const deletionLogPath = `${Setting.value('profileDir')}/deletion_log.txt`;

			await shim.fsDriver().writeFile(deletionLogPath, allDeletionLines, 'utf8');

			await bridge().openItem(deletionLogPath);
		},
	};
};
