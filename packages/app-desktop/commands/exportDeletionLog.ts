
import { CommandRuntime, CommandDeclaration } from '@joplin/lib/services/CommandService';
import { _ } from '@joplin/lib/locale';
import shim from '@joplin/lib/shim';
import Setting from '@joplin/lib/models/Setting';
import bridge from '../services/bridge';
import { formatMsToLocal } from '@joplin/utils/time';

export const declaration: CommandDeclaration = {
	name: 'exportDeletionLog',
	label: () => _('Export deletion log'),
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
			const files = await shim.fsDriver().readDirStats(Setting.value('profileDir'));
			// Get all log.txt and log-{timestamp}.txt files but ignore deletion_log.txt
			const logFiles = files.filter(f => f.path.match(/^log(-\d+)?\.txt$/gi));

			const lastOneAndCurrent = logFiles.sort().slice(logFiles.length - 2);

			let allDeletionLines = '';
			for (const file of lastOneAndCurrent) {

				const deletionLines = await getDeletionLines(file.path);

				allDeletionLines += deletionLines;
			}

			const fileName = `deletion_log_${formatMsToLocal(Date.now(), 'YYYYMMDD')}.txt`;

			const deletionLogPath = `${Setting.value('profileDir')}/${fileName}`;

			await shim.fsDriver().writeFile(deletionLogPath, allDeletionLines, 'utf8');

			await bridge().openItem(deletionLogPath);
		},
	};
};
