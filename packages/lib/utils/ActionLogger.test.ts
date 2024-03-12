import Logger, { LogLevel, TargetType } from '@joplin/utils/Logger';
import { setupDatabaseAndSynchronizer, switchClient } from '../testing/test-utils';
import Note from '../models/Note';
import ActionLogger from './ActionLogger';
import Setting from '../models/Setting';
import { pathExists, readFile, remove, writeFile } from 'fs-extra';

const getLogPath = () => `${Setting.value('profileDir')}/log.txt`;

const logContainsEntryWith = async (...terms: string[]) => {
	const lines = (await readFile(getLogPath(), 'utf8')).split('\n');
	for (const line of lines) {
		if (terms.every(t => line.includes(t))) {
			return true;
		}
	}

	return false;
};

describe('ActionLogger', () => {
	beforeEach(async () => {
		await setupDatabaseAndSynchronizer(1);
		await switchClient(1);

		const logPath = getLogPath();
		if (await pathExists(logPath)) {
			await remove(logPath);
		}
		await writeFile(logPath, '', 'utf8');

		const logger = new Logger();
		logger.addTarget(TargetType.File, { path: logPath });
		logger.setLevel(LogLevel.Info);

		Logger.initializeGlobalLogger(logger);
	});

	it('should log deletions', async () => {
		const note = await Note.save({ title: 'MyTestNote' });
		await Note.delete(note.id, { toTrash: false });
		await Logger.globalLogger.waitForFileWritesToComplete_();

		expect(
			await logContainsEntryWith('DeleteAction', note.id, note.title),
		).toBe(true);
	});

	it('should be possible to disable ActionLogger globally', async () => {
		const note1 = await Note.save({ title: 'testNote1' });
		const note2 = await Note.save({ title: 'testNote2' });

		ActionLogger.enabled = true;
		await Note.delete(note1.id, { toTrash: false });
		ActionLogger.enabled = false;
		await Note.delete(note2.id, { toTrash: false });
		ActionLogger.enabled = true;
		await Logger.globalLogger.waitForFileWritesToComplete_();

		expect(await logContainsEntryWith('DeleteAction', note1.id)).toBe(true);
		expect(await logContainsEntryWith('DeleteAction', note2.id)).toBe(false);
	});
});
