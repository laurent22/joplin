import { setupDatabaseAndSynchronizer, switchClient } from '@joplin/lib/testing/test-utils';
import { setupCommandForTesting, setupApplication } from './utils/testUtils';
import app from './app';
import Folder from '@joplin/lib/models/Folder';
import Note from '@joplin/lib/models/Note';
import shim from '@joplin/lib/shim';
import Setting from '@joplin/lib/models/Setting';
const Command = require('./command-e2ee');


describe('command-mkbook', () => {

	beforeEach(async () => {
		await setupDatabaseAndSynchronizer(1);
		await switchClient(1);
		await setupApplication();
	});


	it('should encrypt file', async () => {
		const command = setupCommandForTesting(Command);

		const folder = await Folder.save({ title: 'folder' });
		app().switchCurrentFolder(folder);
		const note = await Note.save({ title: 'note1', parent_id: folder.id });
		await shim.attachFileToNote(note, `${__dirname}/../tests/support/photo.jpg`);
		await command.action({ command: 'enable', options: { password: '1234' } });

		const resourceDir = Setting.value('profileDir');
		const dir = await shim.fsDriver().readDirStats(resourceDir, { recursive: true });
		expect(dir).toBe([]);
		await command.action({ command: 'decrypt-file', path: resourceDir, options: { password: '1234' } });

	});

});

