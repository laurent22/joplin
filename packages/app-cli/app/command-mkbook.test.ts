import { setupDatabaseAndSynchronizer, switchClient } from '@joplin/lib/testing/test-utils';
import { setupCommandForTesting, setupApplication } from './utils/testUtils';
const Command = require('./command-mkbook');


describe('command-mkbook', function() {

	beforeEach(async () => {
		await setupDatabaseAndSynchronizer(1);
		await switchClient(1);
		await setupApplication();
	});


	it('should create a subfolder in first folder', async () => {
		const command = setupCommandForTesting(Command);
		await expect(command.action({ 'new-notebook': 'folder1' })).resolves.not.toThrowError();
		await expect(command.action({ 'new-notebook': 'folder1.1', options: { s: true, sub: true } })).resolves.not.toThrowError();
	});

	it('should create a subfolder in the second destination folder', async () => {
		const command = setupCommandForTesting(Command);
		await expect(command.action({ 'new-notebook': 'folder2' })).resolves.not.toThrowError();
		await expect(command.action({ 'new-notebook': 'folder2.1', 'notebook': 'folder2' })).resolves.not.toThrowError();
	});

	it('should not be possible to create subfolder in ambiguous destination folder', async () => {
		const command = setupCommandForTesting(Command);
		await expect(command.action({ 'new-notebook': 'folder3' })).resolves.not.toThrowError();
		await expect(command.action({ 'new-notebook': 'folder3' })).resolves.not.toThrowError();	// ambiguous folder
		await expect(command.action({ 'new-notebook': 'folder3.1', 'notebook': 'folder3' })).rejects.toThrowError();
	});
});

