import Note from '@joplin/lib/models/Note';
import Setting from '@joplin/lib/models/Setting';
import { setupDatabaseAndSynchronizer, switchClient } from '@joplin/lib/testing/test-utils';
import { setupCommandForTesting, setupApplication } from './utils/testUtils';
const Command = require('./command-set');

describe('command-set', () => {

	beforeEach(async () => {
		await setupDatabaseAndSynchronizer(1);
		await switchClient(1);
		await setupApplication();
	});

	// This guard lives in BaseCommand.encryptionCheck, so it also covers attach, done, edit, ren and todo.
	it.each([
		{ label: 'refuse to change a locked note', flagEnabled: true, expectedError: 'Cannot change a locked note', expectedTitle: 'hello' },
		{ label: 'change a locked note when note lock is disabled', flagEnabled: false, expectedError: null, expectedTitle: 'renamed' },
	])('should $label', async ({ flagEnabled, expectedError, expectedTitle }) => {
		Setting.setValue('featureFlag.noteLock', flagEnabled);
		const note = await Note.save({ title: 'hello', body: 'ciphertext', is_locked: 1, parent_id: '' });

		const command = setupCommandForTesting(Command);
		let error: string|null = null;
		try {
			await command.action({ note: note.id, name: 'title', value: 'renamed' });
		} catch (e) {
			error = (e as Error).message;
		}

		expect(error).toBe(expectedError);
		expect((await Note.load(note.id)).title).toBe(expectedTitle);
	});

	it('should block changing the lock state of a plain note', async () => {
		Setting.setValue('featureFlag.noteLock', true);
		const note = await Note.save({ title: 'hello', body: 'plain', parent_id: '' });

		const command = setupCommandForTesting(Command);
		await expect(command.action({ note: note.id, name: 'is_locked', value: '1' })).rejects.toThrow('The note lock state cannot be changed from the command line');
		expect((await Note.load(note.id)).is_locked).toBe(0);
	});

});
