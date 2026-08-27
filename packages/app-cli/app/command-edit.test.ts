import * as fs from 'fs-extra';
import Note from '@joplin/lib/models/Note';
import Setting from '@joplin/lib/models/Setting';
import { setupDatabaseAndSynchronizer, switchClient } from '@joplin/lib/testing/test-utils';
import { setupCommandForTesting, setupApplication } from './utils/testUtils';
const Command = require('./command-edit');

describe('command-edit', () => {

	beforeEach(async () => {
		await setupDatabaseAndSynchronizer(1);
		await switchClient(1);
		await setupApplication();
	});

	it('should refuse to edit a locked note without writing a temp file', async () => {
		Setting.setValue('featureFlag.noteLock', true);
		const note = await Note.save({ title: 'hello', body: 'ciphertext', is_locked: 1, parent_id: '' });
		const tempDir = Setting.value('tempDir');
		await fs.ensureDir(tempDir);
		const filesBefore = await fs.readdir(tempDir);

		const command = setupCommandForTesting(Command);

		await expect(command.action({ note: note.id })).rejects.toThrow('locked note');
		expect(await fs.readdir(tempDir)).toEqual(filesBefore);
	});

});
