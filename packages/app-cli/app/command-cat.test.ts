import Note from '@joplin/lib/models/Note';
import Setting from '@joplin/lib/models/Setting';
import { setupDatabaseAndSynchronizer, switchClient } from '@joplin/lib/testing/test-utils';
import { setupCommandForTesting, setupApplication } from './utils/testUtils';
const Command = require('./command-cat');

describe('command-cat', () => {

	beforeEach(async () => {
		await setupDatabaseAndSynchronizer(1);
		await switchClient(1);
		await setupApplication();
	});

	it('should refuse to display a locked note', async () => {
		Setting.setValue('featureFlag.noteLock', true);
		const note = await Note.save({ title: 'hello', body: 'JLD01ciphertext', is_locked: 1, parent_id: '' });

		let output = '';
		const command = setupCommandForTesting(Command, (text: string) => { output += text; });

		await expect(command.action({ note: note.id, options: {} })).rejects.toThrow('locked note');
		expect(output).toBe('');
	});

});
