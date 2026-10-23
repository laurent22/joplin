import Note from '@joplin/lib/models/Note';
import Setting from '@joplin/lib/models/Setting';
import { lockedNoteBodyPlaceholder } from '@joplin/lib/services/noteLock/NoteLockNote';
import { setupDatabaseAndSynchronizer, switchClient, noteLockCipherTextStandIn } from '@joplin/lib/testing/test-utils';
import { setupCommandForTesting, setupApplication } from './utils/testUtils';
import app from './app';
const Command = require('./command-cat');

describe('command-cat', () => {

	beforeEach(async () => {
		await setupDatabaseAndSynchronizer(1);
		await switchClient(1);
		await setupApplication();
	});

	it('should display a locked note with a placeholder body', async () => {
		Setting.setValue('featureFlag.noteLock', true);
		const note = await Note.save({ title: 'hello', body: noteLockCipherTextStandIn(), is_locked: 1, parent_id: '' });

		let output = '';
		const command = setupCommandForTesting(Command, (text: string) => { output += text; });
		jest.spyOn(app(), 'gui').mockReturnValue({ showConsole: () => {}, maximizeConsole: () => {} });

		await command.action({ note: note.id, options: {} });
		expect(output).toBe(`hello\n\n${lockedNoteBodyPlaceholder}`);
	});

});
